import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { mapInfrastructure as initialMapInfra } from "../lib/map-data";

export interface DbComplaint {
  id: string;
  title: string;
  ward: string;
  citizen: string;
  citizen_id?: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "New" | "Pending" | "In Review" | "Assigned" | "In Progress" | "Resolved";
  reported_at: string;
  created_at: string;
  updated_at: string;
  ai_confidence: number;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  image_description?: string;
  update_note: string;
  resolved_at?: string;
  asset_id?: string;
}

export interface DbInfrastructure {
  id: string;
  name: string;
  type: string;
  risk_score: number;
  condition: string;
  traffic: string;
  last_inspection: string;
  priority: string;
  status: string;
  complaints: number;
  age: number;
  past_failures: number;
  latitude: number;
  longitude: number;
  location: string;
  ai_recommendation?: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "civicpulse.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ward TEXT NOT NULL,
      citizen TEXT NOT NULL,
      citizen_id TEXT,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ai_confidence REAL DEFAULT 85,
      description TEXT,
      location TEXT,
      latitude REAL,
      longitude REAL,
      image_url TEXT,
      image_description TEXT,
      update_note TEXT,
      resolved_at TEXT,
      asset_id TEXT
    );

    CREATE TABLE IF NOT EXISTS infrastructure (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      condition TEXT NOT NULL,
      traffic TEXT NOT NULL,
      last_inspection TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      complaints INTEGER NOT NULL DEFAULT 0,
      age INTEGER NOT NULL DEFAULT 5,
      past_failures INTEGER NOT NULL DEFAULT 0,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      location TEXT NOT NULL,
      ai_recommendation TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed initial infrastructure if empty
  const infraCount =
    (db.prepare("SELECT COUNT(*) as count FROM infrastructure").get() as { count: number })
      ?.count ?? 0;
  if (infraCount === 0) {
    const insertInfra = db.prepare(`
      INSERT INTO infrastructure (
        id, name, type, risk_score, condition, traffic, last_inspection,
        priority, status, complaints, age, past_failures, latitude, longitude, location, ai_recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of initialMapInfra) {
      insertInfra.run(
        item.id,
        item.name,
        item.type,
        item.riskScore,
        item.condition,
        item.traffic,
        item.lastInspection,
        item.priority,
        item.status || "Operational",
        item.complaints,
        item.age,
        item.pastFailures,
        item.latitude,
        item.longitude,
        item.location,
        item.aiRecommendation || null,
      );
    }
  }

  // Seed initial complaints if empty
  const complaintCount =
    (db.prepare("SELECT COUNT(*) as count FROM complaints").get() as { count: number })?.count ?? 0;
  if (complaintCount === 0) {
    const seedComplaints = [
      {
        id: "CMP-8891",
        title: "Deep roadway depression near culvert crossing",
        ward: "Ward 12",
        citizen: "A. Sharma",
        citizen_id: "cit_1",
        category: "Road damage",
        severity: "critical",
        status: "In Progress",
        reported_at: "2026-10-02",
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        ai_confidence: 94,
        description:
          "Hazardous 7-inch road subsidence near culvert junction on Bandar Road. Major hazard for two-wheelers.",
        location: "Bandar Road, Benz Circle, Ward 12",
        latitude: 16.4988,
        longitude: 80.6542,
        update_note: "Field maintenance unit deployed with compaction roller and asphalt patch.",
        asset_id: "INF-101",
      },
      {
        id: "CMP-8884",
        title: "Pressurized water main fracture causing road subsidence",
        ward: "Ward 4",
        citizen: "S. Varma",
        citizen_id: "cit_2",
        category: "Water leak & contamination",
        severity: "critical",
        status: "In Review",
        reported_at: "2026-10-02",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        ai_confidence: 91,
        description:
          "Significant potable water geyser flooding Bhavanipuram Main Road with structural cavitation.",
        location: "Bhavanipuram Main Road, Ward 4",
        latitude: 16.5085,
        longitude: 80.6065,
        update_note: "Water supply isolated; heavy excavator unit en route.",
        asset_id: "INF-102",
      },
      {
        id: "CMP-8870",
        title: "Grid electrical failure across 4 consecutive lampposts",
        ward: "Ward 18",
        citizen: "M. Reddy",
        citizen_id: "cit_3",
        category: "Street lighting",
        severity: "medium",
        status: "Assigned",
        reported_at: "2026-10-01",
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        ai_confidence: 88,
        description: "Dark zone on busy pedestrian corridor near school crossing.",
        location: "Governorpet 5th Cross, Ward 18",
        latitude: 16.5015,
        longitude: 80.642,
        update_note: "Electrical line crew assigned work order #E-4421.",
        asset_id: "INF-105",
      },
      {
        id: "CMP-8842",
        title: "Stormwater culvert silt blockage & backflow",
        ward: "Ward 7",
        citizen: "K. Lakshmi",
        citizen_id: "cit_4",
        category: "Drainage overflow",
        severity: "high",
        status: "In Progress",
        reported_at: "2026-09-30",
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        ai_confidence: 87,
        description: "Heavy silt deposition restricting discharge flow into canal.",
        location: "Patamata Canal Road, Ward 7",
        latitude: 16.495,
        longitude: 80.658,
        update_note: "Suction desilting machine operational at site.",
        asset_id: "INF-103",
      },
      {
        id: "CMP-8790",
        title: "Culvert retaining wall mortar crack",
        ward: "Ward 2",
        citizen: "R. Prasad",
        citizen_id: "cit_5",
        category: "Structural fissure",
        severity: "low",
        status: "Resolved",
        reported_at: "2026-09-27",
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        ai_confidence: 83,
        description: "Hairline crack on concrete abutment.",
        location: "One Town Market Road, Ward 2",
        latitude: 16.518,
        longitude: 80.598,
        update_note: "Polymer mortar grouting completed and strength verified.",
        resolved_at: "2026-09-29",
        asset_id: "INF-104",
      },
      {
        id: "CMP-8755",
        title: "Pothole cluster repaired on commercial arterial",
        ward: "Ward 15",
        citizen: "D. Naidu",
        citizen_id: "cit_6",
        category: "Road damage",
        severity: "medium",
        status: "Resolved",
        reported_at: "2026-09-25",
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        ai_confidence: 89,
        description: "Surface milling and hot-mix bituminous overlay applied.",
        location: "Besant Road Commercial Strip, Ward 15",
        latitude: 16.512,
        longitude: 80.628,
        update_note:
          "Pothole filled and sealed with bituminous asphalt. Surface leveled and reopened to traffic.",
        resolved_at: "2026-09-26",
        asset_id: "INF-101",
      },
    ];

    const insertComplaint = db.prepare(`
      INSERT INTO complaints (
        id, title, ward, citizen, citizen_id, category, severity, status,
        reported_at, created_at, updated_at, ai_confidence, description,
        location, latitude, longitude, update_note, resolved_at, asset_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of seedComplaints) {
      insertComplaint.run(
        c.id,
        c.title,
        c.ward,
        c.citizen,
        c.citizen_id,
        c.category,
        c.severity,
        c.status,
        c.reported_at,
        c.created_at,
        c.updated_at,
        c.ai_confidence,
        c.description,
        c.location,
        c.latitude,
        c.longitude,
        c.update_note,
        c.resolved_at || null,
        c.asset_id || null,
      );
    }
  }

  // Seed default users
  const userCount =
    (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number })?.count ?? 0;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, role, department, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      "auth_1",
      "authority@civicpulse.ai",
      "civicpulse123",
      "A. Kulkarni",
      "authority",
      "Public Works & Engineering",
      new Date().toISOString(),
    );

    insertUser.run(
      "cit_1",
      "citizen@civicpulse.ai",
      "citizen123",
      "P. Sharma",
      "citizen",
      "Ward 12 Resident",
      new Date().toISOString(),
    );
  }
}

// ----------------- CRUD Operations -----------------

export function getAllComplaints(): DbComplaint[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM complaints ORDER BY created_at DESC")
    .all() as unknown as DbComplaint[];
  return rows;
}

export function getComplaintById(id: string): DbComplaint | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id) as unknown as
    DbComplaint | undefined;
  return row || null;
}

export function createComplaint(complaint: Partial<DbComplaint>): DbComplaint {
  const db = getDb();
  const now = new Date();
  const id = complaint.id || `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = now.toISOString().split("T")[0]!;

  const newRecord: DbComplaint = {
    id,
    title: complaint.title || "Untitled infrastructure grievance",
    ward: complaint.ward || "Ward 12",
    citizen: complaint.citizen || "Verified Resident",
    citizen_id: complaint.citizen_id || "cit_1",
    category: complaint.category || "Road damage",
    severity: complaint.severity || "medium",
    status: (complaint.status as DbComplaint["status"]) || "New",
    reported_at: complaint.reported_at || dateStr,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ai_confidence: complaint.ai_confidence ?? 92,
    description: complaint.description || complaint.title || "",
    location: complaint.location || complaint.ward || "Municipal Zone",
    latitude: typeof complaint.latitude === "number" ? complaint.latitude : 16.5062,
    longitude: typeof complaint.longitude === "number" ? complaint.longitude : 80.648,
    image_url: complaint.image_url || undefined,
    image_description: complaint.image_description || undefined,
    update_note: complaint.update_note || "New submission registered in municipal queue.",
    resolved_at: undefined,
    asset_id: complaint.asset_id || undefined,
  };

  const insert = db.prepare(`
    INSERT INTO complaints (
      id, title, ward, citizen, citizen_id, category, severity, status,
      reported_at, created_at, updated_at, ai_confidence, description,
      location, latitude, longitude, image_url, image_description, update_note, asset_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    newRecord.id,
    newRecord.title,
    newRecord.ward,
    newRecord.citizen,
    newRecord.citizen_id,
    newRecord.category,
    newRecord.severity,
    newRecord.status,
    newRecord.reported_at,
    newRecord.created_at,
    newRecord.updated_at,
    newRecord.ai_confidence,
    newRecord.description,
    newRecord.location,
    newRecord.latitude,
    newRecord.longitude,
    newRecord.image_url || null,
    newRecord.image_description || null,
    newRecord.update_note,
    newRecord.asset_id || null,
  );

  // If linked to an infrastructure asset, increment asset complaint counter
  if (newRecord.asset_id) {
    db.prepare("UPDATE infrastructure SET complaints = complaints + 1 WHERE id = ?").run(
      newRecord.asset_id,
    );
  }

  return newRecord;
}

export function updateComplaintStatus(
  id: string,
  rawStatus: string,
  resolutionNote?: string,
): DbComplaint | null {
  const db = getDb();
  const existing = getComplaintById(id);
  if (!existing) return null;

  const normalized = rawStatus.trim().toUpperCase();
  const status: DbComplaint["status"] =
    normalized === "RESOLVED"
      ? "Resolved"
      : normalized === "IN_PROGRESS" || normalized === "IN PROGRESS"
        ? "In Progress"
        : normalized === "ASSIGNED"
          ? "Assigned"
          : normalized === "IN_REVIEW" || normalized === "IN REVIEW"
            ? "In Review"
            : normalized === "PENDING"
              ? "Pending"
              : "New";

  const resolvedAt = status === "Resolved" ? new Date().toISOString().split("T")[0] : null;
  const updateNote =
    resolutionNote ||
    (status === "Resolved"
      ? "Problem solved and verified by municipal engineering unit. Work order closed."
      : status === "In Progress"
        ? "Field repair work in progress at reported site."
        : status === "Assigned"
          ? "Field repair crew assigned to location."
          : status === "In Review"
            ? "Under technical review by municipal engineers."
            : "Awaiting municipal triage.");

  db.prepare(
    `
    UPDATE complaints
    SET status = ?, update_note = ?, resolved_at = COALESCE(?, resolved_at), updated_at = ?
    WHERE id = ?
  `,
  ).run(status, updateNote, resolvedAt, new Date().toISOString(), id);

  // If resolved, decrement linked asset complaint count if applicable
  if (status === "Resolved" && existing.asset_id && existing.status !== "Resolved") {
    db.prepare(
      `
      UPDATE infrastructure
      SET complaints = MAX(0, complaints - 1),
          risk_score = MAX(10, risk_score - 2)
      WHERE id = ?
    `,
    ).run(existing.asset_id);
  }

  return getComplaintById(id);
}

export function getAllInfrastructure(): DbInfrastructure[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM infrastructure ORDER BY risk_score DESC")
    .all() as unknown as DbInfrastructure[];
  return rows;
}

export function getInfrastructureById(id: string): DbInfrastructure | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM infrastructure WHERE id = ?").get(id) as unknown as
    DbInfrastructure | undefined;
  return row || null;
}

export function updateInfrastructureStatus(
  id: string,
  status: string,
  notes?: string,
): DbInfrastructure | null {
  const db = getDb();
  const existing = getInfrastructureById(id);
  if (!existing) return null;

  const isResolved =
    status.toLowerCase().includes("resolved") || status.toLowerCase().includes("repaired");
  const newScore = isResolved
    ? Math.max(20, Math.round(existing.risk_score * 0.6))
    : existing.risk_score;

  db.prepare(
    `
    UPDATE infrastructure
    SET status = ?, risk_score = ?, ai_recommendation = COALESCE(?, ai_recommendation)
    WHERE id = ?
  `,
  ).run(status, newScore, notes || null, id);

  return getInfrastructureById(id);
}

export function getDatabaseStats() {
  const db = getDb();
  const complaints = getAllComplaints();
  const infrastructure = getAllInfrastructure();

  const totalComplaints = complaints.length;
  const pending = complaints.filter((c) => c.status === "New" || c.status === "Pending").length;
  const inProgress = complaints.filter(
    (c) => c.status === "In Progress" || c.status === "Assigned" || c.status === "In Review",
  ).length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const highPriority = complaints.filter(
    (c) => c.severity === "critical" || c.severity === "high",
  ).length;

  const criticalInfra = infrastructure.filter((i) => i.risk_score >= 80).length;
  const highRiskInfra = infrastructure.filter(
    (i) => i.risk_score >= 60 && i.risk_score < 80,
  ).length;
  const averageRisk = Math.round(
    infrastructure.reduce((acc, i) => acc + i.risk_score, 0) / (infrastructure.length || 1),
  );

  return {
    totalComplaints,
    pending,
    inProgress,
    resolved,
    highPriority,
    totalInfrastructure: infrastructure.length,
    criticalInfrastructure: criticalInfra,
    highRiskInfrastructure: highRiskInfra,
    averageRisk,
  };
}
