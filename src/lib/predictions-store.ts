import { useCallback, useEffect, useRef, useState } from "react";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ApiPrediction {
  infrastructure_id: string;
  infrastructure_name: string;
  infrastructure_type: string;
  location: string;
  risk_score: number;
  risk_level: RiskLevel;
  factors: string[];
  model_version: string;
  prediction_timestamp: string;
}

export interface PredictionsPayload {
  predictions: ApiPrediction[];
  summary: { assets_scored: number; at_risk_count: number; average_risk_score: number };
  model: { n_samples?: number; risk_level?: { accuracy?: number } } | null;
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message || body.error || `HTTP ${res.status}`;
}

/**
 * Real ML predictions from /api/predictions. Refreshes automatically when the backend
 * broadcasts `prediction_updated` over the existing SSE channel (new/updated complaints).
 */
export function usePredictions() {
  const [data, setData] = useState<PredictionsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/predictions");
      if (!res.ok) throw new Error(await readError(res));
      setData((await res.json()) as PredictionsPayload);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const recompute = useCallback(async (): Promise<PredictionsPayload> => {
    const res = await fetch("/api/predictions/recompute", { method: "POST" });
    if (!res.ok) throw new Error(await readError(res));
    const body = (await res.json()) as PredictionsPayload;
    setData(body);
    setError(null);
    return body;
  }, []);

  useEffect(() => {
    load();
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    const es = new EventSource("/api/realtime/events");
    es.addEventListener("prediction_updated", () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, 200);
    });
    return () => {
      es.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { data, error, loading, reload: load, recompute };
}
