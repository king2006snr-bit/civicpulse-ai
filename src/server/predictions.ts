import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import {
  getDb,
  getAllComplaints,
  getAllInfrastructure,
  getInfrastructureById,
  type DbComplaint,
  type DbInfrastructure,
} from "./db";
import { mlPredict, mlHealth, MlUnavailableError, type MlPrediction } from "./ml-client";
import { broadcastRealtimeEvent } from "./sse";

// ---------------------------------------------------------------------------------------------
// Feature engineering: shared complaints + infrastructure tables -> model input vector.
// Feature names are exactly those the model was trained on (ml/risk_common.py).
// ---------------------------------------------------------------------------------------------

export interface FeatureVector {
  complaint_count: number | null;
  complaints_last_7_days: number | null;
  complaints_last_30_days: number | null;
  complaint_severity_1_to_5: number | null;
  infrastructure_age_years: number | null;
  infrastructure_condition: string | null;
  previous_incidents: number | null;
  maintenance_delay_days: number | null;
  unresolved_complaints: number | null;
}

const DAY_MS = 86_400_000;
const SEVERITY_SCALE: Record<string, number> = { low: 1, medium: 3, high: 4, critical: 5 };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** Which infrastructure types a complaint category can plausibly refer to. */
function compatibleTypes(category: string): string[] | null {
  const c = (category || "").toLowerCase();
  if (c.includes("road") || c.includes("pothole")) return ["road", "flyover", "bridge"];
  if (c.includes("water")) return ["water line", "water pipeline"];
  if (c.includes("drain")) return ["drainage"];
  if (c.includes("light")) return ["streetlight"];
  if (c.includes("structur") || c.includes("bridge")) return ["bridge", "flyover", "road"];
  return null;
}

/**
 * Decide which infrastructure asset a complaint belongs to. A valid asset_id always wins.
 * Otherwise (citizen portal sends coordinates only) fall back to the nearest asset: the nearest
 * type-compatible asset within 1.5 km, else the nearest asset of any type within 0.5 km.
 */
export function resolveAssetId(
  c: Pick<DbComplaint, "asset_id" | "latitude" | "longitude" | "category">,
  infra: DbInfrastructure[] = getAllInfrastructure(),
): string | null {
  if (c.asset_id && infra.some((i) => i.id === c.asset_id)) return c.asset_id;
  if (typeof c.latitude !== "number" || typeof c.longitude !== "number") return null;
  const types = compatibleTypes(c.category);
  const ranked = infra
    .map((i) => ({ i, d: haversineKm(c.latitude, c.longitude, i.latitude, i.longitude) }))
    .sort((x, y) => x.d - y.d);
  const compatible = ranked.find((r) => r.d <= 1.5 && (!types || types.includes(r.i.type.toLowerCase())));
  if (compatible) return compatible.i.id;
  const any = ranked[0];
  return any && any.d <= 0.5 ? any.i.id : null;
}

function normalizeCondition(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (["good", "excellent", "new"].includes(s)) return "Good";
  if (["fair", "moderate", "average"].includes(s)) return "Fair";
  if (["poor", "bad", "critical", "failed"].includes(s)) return "Poor";
  return null;
}

function daysSince(dateStr: string | undefined | null, now: number): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / DAY_MS)) : null;
}

export function buildFeatures(
  asset: DbInfrastructure,
  linked: DbComplaint[],
  now = Date.now(),
): FeatureVector {
  const open = linked.filter((c) => c.status !== "Resolved");
  const resolved = linked.length - open.length;
  const age = (c: DbComplaint) => now - Date.parse(c.created_at);
  const within = (days: number) => linked.filter((c) => age(c) <= days * DAY_MS).length;

  // infrastructure.complaints is the app's running counter of open complaints on the asset
  // (+1 on create, -1 on resolve). It also holds history that has no row in `complaints`, so the
  // open count is the larger of the counter and the rows actually linked here.
  const unresolved = Math.max(asset.complaints ?? 0, open.length);

  const sevPool = (open.length ? open : linked).flatMap((c) => SEVERITY_SCALE[c.severity] ?? []);
  const severity = sevPool.length ? sevPool.reduce((a, b) => a + b, 0) / sevPool.length : null;

  return {
    complaint_count: unresolved + resolved,
    complaints_last_7_days: within(7),
    complaints_last_30_days: within(30),
    complaint_severity_1_to_5: severity,
    infrastructure_age_years: Number.isFinite(asset.age) ? asset.age : null,
    infrastructure_condition: normalizeCondition(asset.condition),
    previous_incidents: Number.isFinite(asset.past_failures) ? asset.past_failures : null,
    // Proxy: days since the asset was last inspected (no explicit maintenance-delay field exists).
    maintenance_delay_days: daysSince(asset.last_inspection, now),
    unresolved_complaints: unresolved,
  };
}

/** complaint -> asset id for every complaint in the shared DB (legacy dangling ids are re-resolved). */
function complaintsByAsset(infra: DbInfrastructure[]): Map<string, DbComplaint[]> {
  const map = new Map<string, DbComplaint[]>();
  for (const c of getAllComplaints()) {
    const id = resolveAssetId(c, infra);
    if (!id) continue;
    (map.get(id) ?? map.set(id, []).get(id)!).push(c);
  }
  return map;
}

// Accepted override keys for what-if requests on POST /api/predictions/predict.
const OVERRIDE_ALIASES: Record<keyof FeatureVector, string[]> = {
  complaint_count: ["complaint_count"],
  complaints_last_7_days: ["complaints_last_7_days"],
  complaints_last_30_days: ["complaints_last_30_days"],
  complaint_severity_1_to_5: ["complaint_severity_1_to_5", "complaint_severity", "severity"],
  infrastructure_age_years: ["infrastructure_age_years", "age"],
  infrastructure_condition: ["infrastructure_condition", "condition"],
  previous_incidents: ["previous_incidents", "past_failures"],
  maintenance_delay_days: ["maintenance_delay_days"],
  unresolved_complaints: ["unresolved_complaints"],
};

function applyOverrides(base: FeatureVector, ...sources: (Record<string, unknown> | undefined)[]) {
  const out: FeatureVector = { ...base };
  let changed = false;
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    for (const [feat, keys] of Object.entries(OVERRIDE_ALIASES) as [keyof FeatureVector, string[]][]) {
      const key = keys.find((k) => src[k] !== undefined && src[k] !== null && src[k] !== "");
      if (!key) continue;
      let v: unknown = src[key];
      if (feat === "complaint_severity_1_to_5" && typeof v === "string" && v in SEVERITY_SCALE) v = SEVERITY_SCALE[v];
      (out as unknown as Record<string, unknown>)[feat] = feat === "infrastructure_condition" ? normalizeCondition(v) : Number(v);
      changed = true;
    }
    if (typeof src.last_inspection === "string") {
      out.maintenance_delay_days = daysSince(src.last_inspection, Date.now());
      changed = true;
    }
  }
  return { features: out, changed };
}

// ---------------------------------------------------------------------------------------------
// Storage (same SQLite database as complaints / infrastructure)
// ---------------------------------------------------------------------------------------------

export interface PredictionRecord {
  infrastructure_id: string;
  infrastructure_name: string;
  infrastructure_type: string;
  location: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: MlPrediction["risk_level"];
  factors: string[];
  factor_details: MlPrediction["factor_details"];
  imputed_features: string[];
  features: FeatureVector;
  model_version: string;
  prediction_timestamp: string;
}

let tableReady = false;
function ensureTable() {
  if (tableReady) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS risk_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      infrastructure_id TEXT NOT NULL,
      risk_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      factors TEXT NOT NULL,
      factor_details TEXT NOT NULL,
      imputed_features TEXT NOT NULL,
      features TEXT NOT NULL,
      model_version TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_risk_predictions_asset ON risk_predictions (infrastructure_id, id DESC);
  `);
  tableReady = true;
}

interface Row {
  infrastructure_id: string;
  risk_score: number;
  risk_level: MlPrediction["risk_level"];
  factors: string;
  factor_details: string;
  imputed_features: string;
  features: string;
  model_version: string;
  created_at: string;
}

function toRecord(asset: DbInfrastructure, r: Row): PredictionRecord {
  return {
    infrastructure_id: asset.id,
    infrastructure_name: asset.name,
    infrastructure_type: asset.type,
    location: asset.location,
    latitude: asset.latitude,
    longitude: asset.longitude,
    risk_score: r.risk_score,
    risk_level: r.risk_level,
    factors: JSON.parse(r.factors),
    factor_details: JSON.parse(r.factor_details),
    imputed_features: JSON.parse(r.imputed_features),
    features: JSON.parse(r.features),
    model_version: r.model_version,
    prediction_timestamp: r.created_at,
  };
}

function latestRow(id: string): Row | undefined {
  ensureTable();
  return getDb()
    .prepare("SELECT * FROM risk_predictions WHERE infrastructure_id = ? ORDER BY id DESC LIMIT 1")
    .get(id) as unknown as Row | undefined;
}

function persist(asset: DbInfrastructure, p: MlPrediction, features: FeatureVector, version: string): PredictionRecord {
  ensureTable();
  const prev = latestRow(asset.id);
  const featuresJson = JSON.stringify(features);
  // Identical inputs + same model => nothing new to record.
  if (prev && prev.features === featuresJson && prev.model_version === version) return toRecord(asset, prev);
  const created = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO risk_predictions (infrastructure_id, risk_score, risk_level, factors, factor_details, imputed_features, features, model_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(asset.id, p.risk_score, p.risk_level, JSON.stringify(p.factors), JSON.stringify(p.factor_details), JSON.stringify(p.imputed_features), featuresJson, version, created);
  return toRecord(asset, latestRow(asset.id)!);
}

// ---------------------------------------------------------------------------------------------
// Prediction orchestration
// ---------------------------------------------------------------------------------------------

/** Recompute (and store) predictions for the given assets from the current database state. */
export async function predictAssets(ids?: string[]): Promise<PredictionRecord[]> {
  const infra = getAllInfrastructure();
  const assets = ids ? infra.filter((i) => ids.includes(i.id)) : infra;
  if (!assets.length) return [];
  const linked = complaintsByAsset(infra);
  const now = Date.now();
  const featureSets = assets.map((a) => buildFeatures(a, linked.get(a.id) ?? [], now));
  const { model_version, predictions } = await mlPredict(featureSets as unknown as Record<string, unknown>[]);
  return assets.map((a, i) => persist(a, predictions[i]!, featureSets[i]!, model_version));
}

/** Fire-and-forget recalculation after complaint/infrastructure changes; never blocks or fails the caller. */
const pending = new Map<string, NodeJS.Timeout>();
export function scheduleRecalculation(assetId: string | null | undefined) {
  if (!assetId) return;
  clearTimeout(pending.get(assetId));
  pending.set(
    assetId,
    setTimeout(async () => {
      pending.delete(assetId);
      try {
        const [rec] = await predictAssets([assetId]);
        if (rec) broadcastRealtimeEvent("prediction_updated", rec);
      } catch (err) {
        console.warn(`[predictions] recalculation for ${assetId} failed:`, (err as Error).message);
      }
    }, 250),
  );
}

function summarize(records: PredictionRecord[]) {
  const by_level = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of records) by_level[r.risk_level]++;
  return {
    assets_scored: records.length,
    at_risk_count: by_level.HIGH + by_level.CRITICAL,
    by_level,
    average_risk_score: records.length
      ? Math.round((records.reduce((a, r) => a + r.risk_score, 0) / records.length) * 10) / 10
      : 0,
  };
}

function modelMetrics(): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "ml/artifacts/metrics.json"), "utf8"));
  } catch {
    return null;
  }
}

function fail(res: Response, err: unknown) {
  if (err instanceof MlUnavailableError) {
    return res.status(503).json({ error: "ML_SERVICE_UNAVAILABLE", message: err.message });
  }
  res.status(500).json({ error: "PREDICTION_FAILED", message: (err as Error).message });
}

// ---------------------------------------------------------------------------------------------
// Routes (mounted at /api/predictions)
// ---------------------------------------------------------------------------------------------

export const predictionsRouter = Router();

// POST /api/predictions/predict  { infrastructure_id, complaint_data?, infrastructure_data? }
predictionsRouter.post("/predict", async (req: Request, res: Response) => {
  try {
    const { infrastructure_id, complaint_data, infrastructure_data } = req.body || {};
    const existing = infrastructure_id ? getInfrastructureById(String(infrastructure_id)) : null;
    if (!existing && !infrastructure_data) {
      return res.status(404).json({
        error: "INFRASTRUCTURE_NOT_FOUND",
        message: `No infrastructure '${infrastructure_id ?? ""}' and no infrastructure_data supplied.`,
      });
    }
    const hasOverrides = !!(complaint_data || infrastructure_data);
    if (existing && !hasOverrides) {
      const [rec] = await predictAssets([existing.id]);
      return res.json({
        infrastructure_id: rec!.infrastructure_id,
        risk_score: rec!.risk_score,
        risk_level: rec!.risk_level,
        factors: rec!.factors,
        factor_details: rec!.factor_details,
        imputed_features: rec!.imputed_features,
        prediction_timestamp: rec!.prediction_timestamp,
        model_version: rec!.model_version,
        persisted: true,
      });
    }
    // What-if / ad-hoc request: live DB features (if the asset exists) overlaid with the supplied data. Not stored.
    const infra = getAllInfrastructure();
    const base = existing
      ? buildFeatures(existing, complaintsByAsset(infra).get(existing.id) ?? [])
      : buildFeatures({ complaints: 0, age: NaN, past_failures: NaN, condition: "" } as DbInfrastructure, []);
    const { features } = applyOverrides(base, infrastructure_data, complaint_data);
    const { model_version, predictions } = await mlPredict([features as unknown as Record<string, unknown>]);
    const p = predictions[0]!;
    res.json({
      infrastructure_id: infrastructure_id ?? null,
      risk_score: p.risk_score,
      risk_level: p.risk_level,
      factors: p.factors,
      factor_details: p.factor_details,
      imputed_features: p.imputed_features,
      prediction_timestamp: new Date().toISOString(),
      model_version,
      persisted: false,
    });
  } catch (err) {
    fail(res, err);
  }
});

// GET /api/predictions  -> latest prediction for every infrastructure asset (+ summary + model metrics)
predictionsRouter.get("/", async (req: Request, res: Response) => {
  try {
    ensureTable();
    const infra = getAllInfrastructure();
    const refresh = req.query.refresh === "1";
    let version: string | null = null;
    const records: PredictionRecord[] = [];
    const missing: string[] = [];
    for (const a of infra) {
      const row = latestRow(a.id);
      if (row && !refresh) records.push(toRecord(a, row));
      else missing.push(a.id);
    }
    let error: { error: string; message: string } | null = null;
    if (missing.length) {
      try {
        records.push(...(await predictAssets(missing)));
        version = records[0]?.model_version ?? null;
      } catch (err) {
        error = {
          error: err instanceof MlUnavailableError ? "ML_SERVICE_UNAVAILABLE" : "PREDICTION_FAILED",
          message: (err as Error).message,
        };
      }
    }
    if (!records.length && error) return res.status(error.error === "ML_SERVICE_UNAVAILABLE" ? 503 : 500).json(error);
    records.sort((a, b) => b.risk_score - a.risk_score);
    res.json({
      predictions: records,
      summary: summarize(records),
      model: modelMetrics(),
      ...(error ? { partial_error: error, unscored: missing.filter((id) => !records.some((r) => r.infrastructure_id === id)) } : {}),
      model_version: version ?? records[0]?.model_version ?? null,
    });
  } catch (err) {
    fail(res, err);
  }
});

// POST /api/predictions/recompute -> re-score all assets from the current database state
predictionsRouter.post("/recompute", async (_req: Request, res: Response) => {
  try {
    const records = (await predictAssets()).sort((a, b) => b.risk_score - a.risk_score);
    for (const r of records) broadcastRealtimeEvent("prediction_updated", r);
    res.json({ predictions: records, summary: summarize(records), model: modelMetrics() });
  } catch (err) {
    fail(res, err);
  }
});

// GET /api/predictions/model -> training metrics + live service health
predictionsRouter.get("/model", async (_req: Request, res: Response) => {
  let service: unknown = null;
  try {
    service = await mlHealth();
  } catch (err) {
    service = { status: "unavailable", message: (err as Error).message };
  }
  res.json({ service, metrics: modelMetrics() });
});

// GET /api/predictions/:id -> latest stored prediction (history via ?history=1)
predictionsRouter.get("/:id", (req: Request, res: Response) => {
  const asset = getInfrastructureById(req.params.id);
  if (!asset) return res.status(404).json({ error: "INFRASTRUCTURE_NOT_FOUND" });
  ensureTable();
  if (req.query.history === "1") {
    const rows = getDb()
      .prepare("SELECT * FROM risk_predictions WHERE infrastructure_id = ? ORDER BY id DESC LIMIT 50")
      .all(asset.id) as unknown as Row[];
    return res.json(rows.map((r) => toRecord(asset, r)));
  }
  const row = latestRow(asset.id);
  if (!row) return res.status(404).json({ error: "NO_PREDICTION_YET" });
  res.json(toRecord(asset, row));
});
