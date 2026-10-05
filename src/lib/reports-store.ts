import { useSyncExternalStore } from "react";
import {
  complaints as initialComplaints,
  citizenReports as initialCitizenReports,
  type Complaint,
  type Severity,
} from "./mock-data";
import { mapInfrastructure as initialMapInfra, type MapInfrastructure } from "./map-data";
import { extractCoordsFromString } from "./geocoding";

export type ComplaintStatus =
  "New" | "Pending" | "In Review" | "Assigned" | "In Progress" | "Resolved";

export type ExtendedComplaint = Omit<Complaint, "status"> & {
  status: ComplaintStatus;
  description?: string;
  location?: string;
  imageUrl?: string;
  imageDescription?: string;
  update?: string;
  resolvedAt?: string;
  latitude?: number;
  longitude?: number;
};

export type ExtendedCitizenReport = {
  id: string;
  title: string;
  status: ComplaintStatus;
  ward: string;
  reportedAt: string;
  update: string;
  category?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  imageDescription?: string;
  latitude?: number;
  longitude?: number;
};

const STORAGE_KEY = "civicpulse_reports_store_v4";
const BROADCAST_CHANNEL_NAME = "civicpulse_realtime_sync";

// Known coordinates for default initial complaints
const DEFAULT_COMPLAINT_COORDS: Record<string, { lat: number; lng: number }> = {
  "CMP-8891": { lat: 16.4988, lng: 80.6542 },
  "CMP-8884": { lat: 16.5085, lng: 80.6065 },
  "CMP-8870": { lat: 16.5015, lng: 80.642 },
  "CMP-8842": { lat: 16.495, lng: 80.658 },
  "CMP-8790": { lat: 16.518, lng: 80.598 },
  "CMP-8755": { lat: 16.512, lng: 80.628 },
};

type StoreState = {
  complaints: ExtendedComplaint[];
  citizenReports: ExtendedCitizenReport[];
  infrastructure: MapInfrastructure[];
  backendSynced: boolean;
};

function ensureCoords<
  T extends { id: string; location?: string; latitude?: number; longitude?: number },
>(item: T): T {
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return item;
  }
  const match = DEFAULT_COMPLAINT_COORDS[item.id];
  if (match) {
    return { ...item, latitude: match.lat, longitude: match.lng };
  }
  if (item.location) {
    const extracted = extractCoordsFromString(item.location);
    if (extracted) {
      return { ...item, latitude: extracted.lat, longitude: extracted.lng };
    }
  }
  return { ...item, latitude: 16.5062, longitude: 80.648 };
}

function normalizeRawComplaint(raw: Record<string, unknown>): ExtendedComplaint {
  const rawStatus = String(raw.status || "");
  const status: ComplaintStatus =
    rawStatus === "Resolved" || rawStatus === "RESOLVED"
      ? "Resolved"
      : rawStatus === "In Progress" || rawStatus === "IN_PROGRESS" || rawStatus === "IN PROGRESS"
        ? "In Progress"
        : rawStatus === "Assigned" || rawStatus === "ASSIGNED"
          ? "Assigned"
          : rawStatus === "In Review" || rawStatus === "IN_REVIEW" || rawStatus === "IN REVIEW"
            ? "In Review"
            : rawStatus === "Pending" || rawStatus === "PENDING"
              ? "Pending"
              : "New";

  return ensureCoords({
    id: String(raw.id || ""),
    title: String(raw.title || ""),
    ward: String(raw.ward || "Ward 12"),
    citizen: String(raw.citizen || "Verified Resident"),
    category: String(raw.category || "Road damage"),
    severity: (raw.severity as Severity) || "medium",
    status,
    reportedAt: String(
      raw.reportedAt || raw.reported_at || new Date().toISOString().split("T")[0]!,
    ),
    aiConfidence: Number(raw.aiConfidence ?? raw.ai_confidence ?? 90),
    description: String(raw.description || raw.title || ""),
    location: String(raw.location || raw.ward || ""),
    latitude: typeof raw.latitude === "number" ? raw.latitude : undefined,
    longitude: typeof raw.longitude === "number" ? raw.longitude : undefined,
    imageUrl:
      typeof raw.imageUrl === "string"
        ? raw.imageUrl
        : typeof raw.image_url === "string"
          ? raw.image_url
          : undefined,
    imageDescription:
      typeof raw.imageDescription === "string"
        ? raw.imageDescription
        : typeof raw.image_description === "string"
          ? raw.image_description
          : undefined,
    update: String(
      raw.update || raw.update_note || "New submission registered in municipal queue.",
    ),
    resolvedAt:
      typeof raw.resolvedAt === "string"
        ? raw.resolvedAt
        : typeof raw.resolved_at === "string"
          ? raw.resolved_at
          : undefined,
    assetId:
      typeof raw.assetId === "string"
        ? raw.assetId
        : typeof raw.asset_id === "string"
          ? raw.asset_id
          : undefined,
  });
}

function complaintToCitizenReport(c: ExtendedComplaint): ExtendedCitizenReport {
  return {
    id: c.id,
    title: c.title,
    status: c.status,
    ward: c.ward,
    reportedAt: c.reportedAt,
    update: c.update || "Under municipal tracking",
    category: c.category,
    location: c.location,
    description: c.description,
    imageUrl: c.imageUrl,
    imageDescription: c.imageDescription,
    latitude: c.latitude,
    longitude: c.longitude,
  };
}

function getInitialState(): StoreState {
  if (typeof window === "undefined") {
    return {
      complaints: initialComplaints.map((c) =>
        ensureCoords({
          ...c,
          location: c.ward,
          description: c.title,
          update:
            c.status === "Resolved"
              ? "Resolved and inspected by Ward maintenance crew."
              : c.status === "Assigned"
                ? "Assigned to Ward engineering response unit."
                : c.status === "In Review"
                  ? "Engineering assessment in progress."
                  : "New submission registered in queue.",
        }),
      ),
      citizenReports: initialCitizenReports.map((r) =>
        ensureCoords({
          ...r,
          location: r.ward,
          description: r.title,
        }),
      ),
      infrastructure: initialMapInfra.map((infra) => ({
        ...infra,
        complaints:
          infra.id === "INF-101"
            ? 3
            : infra.id === "INF-102"
              ? 2
              : infra.id === "INF-103"
                ? 1
                : infra.complaints,
      })),
      backendSynced: false,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.complaints) &&
        Array.isArray(parsed.citizenReports) &&
        Array.isArray(parsed.infrastructure)
      ) {
        return {
          complaints: parsed.complaints.map(ensureCoords),
          citizenReports: parsed.citizenReports.map(ensureCoords),
          infrastructure: parsed.infrastructure,
          backendSynced: false,
        };
      }
    }
  } catch (e) {
    console.warn("Could not load reports from storage, using initial data", e);
  }

  return {
    complaints: initialComplaints.map((c) =>
      ensureCoords({
        ...c,
        location: c.ward,
        description: c.title,
        update:
          c.status === "Resolved"
            ? "Resolved and inspected by Ward maintenance crew."
            : c.status === "Assigned"
              ? "Assigned to Ward engineering response unit."
              : c.status === "In Review"
                ? "Engineering assessment in progress."
                : "New submission registered in queue.",
      }),
    ),
    citizenReports: initialCitizenReports.map((r) =>
      ensureCoords({
        ...r,
        location: r.ward,
        description: r.title,
      }),
    ),
    infrastructure: initialMapInfra.map((infra) => ({
      ...infra,
      complaints:
        infra.id === "INF-101"
          ? 3
          : infra.id === "INF-102"
            ? 2
            : infra.id === "INF-103"
              ? 1
              : infra.complaints,
    })),
    backendSynced: false,
  };
}

let memoryState: StoreState = getInitialState();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function persistAndNotify() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {
      // ignore
    }

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: "SYNC_STORE", state: memoryState });
        bc.close();
      }
    } catch {
      // ignore
    }
  }

  notifyListeners();
}

// ----------------- Backend Integration & Realtime SSE -----------------

let sseEventSource: EventSource | null = null;
let isSyncing = false;

export async function fetchBackendData(): Promise<void> {
  if (typeof window === "undefined" || isSyncing) return;
  isSyncing = true;

  try {
    const [complaintsRes, infraRes] = await Promise.allSettled([
      fetch("/api/complaints"),
      fetch("/api/infrastructure"),
    ]);

    let newComplaints = memoryState.complaints;
    let newReports = memoryState.citizenReports;
    let newInfra = memoryState.infrastructure;

    if (complaintsRes.status === "fulfilled" && complaintsRes.value.ok) {
      const serverComplaints = await complaintsRes.value.json();
      if (Array.isArray(serverComplaints)) {
        newComplaints = serverComplaints.map(normalizeRawComplaint);
        newReports = newComplaints.map(complaintToCitizenReport);
      }
    }

    if (infraRes.status === "fulfilled" && infraRes.value.ok) {
      const serverInfra = await infraRes.value.json();
      if (Array.isArray(serverInfra)) {
        newInfra = serverInfra.map((i: Record<string, unknown>) => ({
          id: String(i.id || ""),
          name: String(i.name || ""),
          type: String(i.type || ""),
          riskScore: Number(i.risk_score ?? i.riskScore ?? 50),
          condition: String(i.condition || "Moderate"),
          traffic: String(i.traffic || "Medium"),
          lastInspection: String(i.last_inspection ?? i.lastInspection ?? "2026-09-15"),
          priority: String(i.priority || "medium"),
          status: String(i.status || "Operational"),
          complaints: Number(i.complaints ?? 0),
          age: Number(i.age ?? 5),
          pastFailures: Number(i.past_failures ?? i.pastFailures ?? 0),
          latitude: Number(i.latitude || 16.5062),
          longitude: Number(i.longitude || 80.648),
          location: String(i.location || "Vijayawada"),
          aiRecommendation:
            typeof i.ai_recommendation === "string"
              ? i.ai_recommendation
              : typeof i.aiRecommendation === "string"
                ? i.aiRecommendation
                : undefined,
        }));
      }
    }

    memoryState = {
      complaints: newComplaints,
      citizenReports: newReports,
      infrastructure: newInfra,
      backendSynced: true,
    };

    persistAndNotify();
  } catch (err) {
    console.warn("Initial backend sync warning (using cache):", err);
  } finally {
    isSyncing = false;
  }
}

export function initRealtimeSse() {
  if (typeof window === "undefined" || !("EventSource" in window)) return;
  if (sseEventSource) return;

  try {
    sseEventSource = new EventSource("/api/realtime/events");

    sseEventSource.addEventListener("complaint_created", (event) => {
      try {
        const raw = JSON.parse(event.data);
        const newComplaint = normalizeRawComplaint(raw);
        const newReport = complaintToCitizenReport(newComplaint);

        // Deduplicate
        const exists = memoryState.complaints.some((c) => c.id === newComplaint.id);
        if (!exists) {
          memoryState = {
            ...memoryState,
            complaints: [newComplaint, ...memoryState.complaints],
            citizenReports: [newReport, ...memoryState.citizenReports],
          };
          persistAndNotify();
        }
      } catch (e) {
        console.warn("Failed to parse complaint_created event:", e);
      }
    });

    sseEventSource.addEventListener("complaint_updated", (event) => {
      try {
        const raw = JSON.parse(event.data);
        const updated = normalizeRawComplaint(raw);

        memoryState = {
          ...memoryState,
          complaints: memoryState.complaints.map((c) => (c.id === updated.id ? updated : c)),
          citizenReports: memoryState.citizenReports.map((r) =>
            r.id === updated.id ? complaintToCitizenReport(updated) : r,
          ),
        };
        persistAndNotify();
      } catch (e) {
        console.warn("Failed to parse complaint_updated event:", e);
      }
    });

    sseEventSource.addEventListener("infrastructure_updated", (event) => {
      try {
        const raw = JSON.parse(event.data);
        const updatedId = raw.id;
        memoryState = {
          ...memoryState,
          infrastructure: memoryState.infrastructure.map((inf) =>
            inf.id === updatedId
              ? {
                  ...inf,
                  status: raw.status || inf.status,
                  riskScore: raw.risk_score ?? inf.riskScore,
                  aiRecommendation: raw.ai_recommendation ?? inf.aiRecommendation,
                }
              : inf,
          ),
        };
        persistAndNotify();
      } catch (e) {
        console.warn("Failed to parse infrastructure_updated event:", e);
      }
    });

    sseEventSource.onerror = () => {
      // EventSource automatically retries reconnection
    };
  } catch (err) {
    console.warn("SSE connection setup:", err);
  }
}

// Start backend sync & realtime connection on client load
if (typeof window !== "undefined") {
  fetchBackendData();
  initRealtimeSse();

  if ("BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "SYNC_STORE" && event.data.state) {
          memoryState = {
            complaints: event.data.state.complaints.map(ensureCoords),
            citizenReports: event.data.state.citizenReports.map(ensureCoords),
            infrastructure: event.data.state.infrastructure,
            backendSynced: true,
          };
          notifyListeners();
        }
      };
    } catch {
      // ignore
    }
  }
}

// ----------------- Reports Store Interface -----------------

export const reportsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): StoreState {
    return memoryState;
  },

  /**
   * Citizen files a new complaint. Persists to backend database & broadcasts via SSE.
   */
  async addCitizenComplaint(data: {
    title: string;
    ward: string;
    category: string;
    description: string;
    location: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    imageDescription?: string;
  }): Promise<string> {
    const id = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const reportedAt = new Date().toISOString().split("T")[0]!;

    let lat = data.latitude;
    let lng = data.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") {
      const extracted = extractCoordsFromString(data.location);
      if (extracted) {
        lat = extracted.lat;
        lng = extracted.lng;
      } else {
        const offsetLat = (Math.random() - 0.5) * 0.04;
        const offsetLng = (Math.random() - 0.5) * 0.04;
        lat = Number((16.5062 + offsetLat).toFixed(4));
        lng = Number((80.648 + offsetLng).toFixed(4));
      }
    }

    const severity: Severity =
      data.category === "pothole" ||
      data.category === "Road damage" ||
      data.category === "structural"
        ? "critical"
        : data.category === "water" || data.category === "Water leak & contamination"
          ? "high"
          : "medium";

    const newCitizenReport: ExtendedCitizenReport = {
      id,
      title: data.title,
      status: "New",
      ward: data.ward,
      reportedAt,
      update: "Dispatched to municipal response team.",
      category: data.category,
      location: data.location,
      description: data.description,
      imageUrl: data.imageUrl,
      imageDescription: data.imageDescription,
      latitude: lat,
      longitude: lng,
    };

    const newComplaint: ExtendedComplaint = {
      id,
      title: data.title,
      ward: data.ward,
      citizen: "P. Sharma (Ward 12)",
      category:
        data.category === "pothole"
          ? "Road damage"
          : data.category === "water"
            ? "Water leak & contamination"
            : data.category === "lighting"
              ? "Street lighting"
              : data.category === "structural"
                ? "Structural crack"
                : "Municipal issue",
      severity,
      status: "New",
      reportedAt,
      aiConfidence: Math.floor(88 + Math.random() * 10),
      description: data.description,
      location: data.location,
      latitude: lat,
      longitude: lng,
      imageUrl: data.imageUrl,
      imageDescription: data.imageDescription,
      update: "Dispatched to municipal response team.",
    };

    // Optimistic local state update
    memoryState = {
      ...memoryState,
      citizenReports: [newCitizenReport, ...memoryState.citizenReports],
      complaints: [newComplaint, ...memoryState.complaints],
    };
    persistAndNotify();

    // Send to backend API database
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: newComplaint.title,
          ward: newComplaint.ward,
          citizen: newComplaint.citizen,
          category: newComplaint.category,
          severity: newComplaint.severity,
          status: "New",
          description: newComplaint.description,
          location: newComplaint.location,
          latitude: lat,
          longitude: lng,
          imageUrl: newComplaint.imageUrl,
          imageDescription: newComplaint.imageDescription,
          aiConfidence: newComplaint.aiConfidence,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        const normalized = normalizeRawComplaint(saved);
        memoryState = {
          ...memoryState,
          complaints: memoryState.complaints.map((c) => (c.id === id ? normalized : c)),
          citizenReports: memoryState.citizenReports.map((r) =>
            r.id === id ? complaintToCitizenReport(normalized) : r,
          ),
        };
        persistAndNotify();
      }
    } catch (err) {
      console.warn("Complaint saved to local cache; will retry backend synchronization:", err);
    }

    return id;
  },

  /**
   * Authority solves or updates the status of a complaint in real time.
   */
  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus | string,
    resolutionNote?: string,
  ): Promise<void> {
    const raw = status.trim().toUpperCase();
    const normalizedStatus: ComplaintStatus =
      raw === "RESOLVED"
        ? "Resolved"
        : raw === "IN_PROGRESS" || raw === "IN PROGRESS"
          ? "In Progress"
          : raw === "ASSIGNED"
            ? "Assigned"
            : raw === "IN_REVIEW" || raw === "IN REVIEW"
              ? "In Review"
              : raw === "PENDING"
                ? "Pending"
                : "New";

    const resolvedAt =
      normalizedStatus === "Resolved" ? new Date().toISOString().split("T")[0] : undefined;
    const defaultNote =
      resolutionNote ||
      (normalizedStatus === "Resolved"
        ? "Problem solved and verified by municipal engineering unit. Work order closed."
        : normalizedStatus === "In Progress"
          ? "Field repair work in progress at reported site."
          : normalizedStatus === "Assigned"
            ? "Field repair crew assigned to location."
            : normalizedStatus === "In Review"
              ? "Under technical review by municipal engineers."
              : "Awaiting municipal triage.");

    // Optimistic update
    const updatedComplaints = memoryState.complaints.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          status: normalizedStatus,
          update: defaultNote,
          resolvedAt: resolvedAt || c.resolvedAt,
        };
      }
      return c;
    });

    const updatedCitizenReports = memoryState.citizenReports.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          status: normalizedStatus,
          update: defaultNote,
        };
      }
      return r;
    });

    let updatedInfra = memoryState.infrastructure;
    if (normalizedStatus === "Resolved") {
      const target = memoryState.complaints.find((c) => c.id === id);
      if (target) {
        updatedInfra = memoryState.infrastructure.map((inf) => {
          if (inf.id === target.assetId || inf.assetId === target.assetId) {
            return {
              ...inf,
              complaints: Math.max(0, inf.complaints - 1),
              riskScore: Math.max(10, inf.riskScore - 2),
            };
          }
          return inf;
        });
      }
    }

    memoryState = {
      ...memoryState,
      complaints: updatedComplaints,
      citizenReports: updatedCitizenReports,
      infrastructure: updatedInfra,
    };
    persistAndNotify();

    // Persist to backend database
    try {
      await fetch(`/api/complaints/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: normalizedStatus,
          resolutionNote: defaultNote,
        }),
      });
    } catch (err) {
      console.warn("Backend status update error:", err);
    }
  },

  /**
   * Update status of an infrastructure asset.
   */
  async updateAssetStatus(assetId: string, status: string, notes?: string): Promise<void> {
    const isResolved =
      status.toLowerCase().includes("resolved") || status.toLowerCase().includes("repaired");

    const updatedInfra = memoryState.infrastructure.map((inf) => {
      if (inf.id === assetId || inf.assetId === assetId) {
        const newScore = isResolved ? Math.max(20, Math.round(inf.riskScore * 0.6)) : inf.riskScore;
        return {
          ...inf,
          status,
          riskScore: newScore,
          aiRecommendation: notes || inf.aiRecommendation,
        };
      }
      return inf;
    });

    memoryState = {
      ...memoryState,
      infrastructure: updatedInfra,
    };
    persistAndNotify();

    try {
      await fetch(`/api/infrastructure/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
    } catch (err) {
      console.warn("Backend asset status update error:", err);
    }
  },

  updateComplaintLocation(id: string, location: string, latitude: number, longitude: number) {
    memoryState = {
      ...memoryState,
      complaints: memoryState.complaints.map((c) =>
        c.id === id ? { ...c, location, latitude, longitude } : c,
      ),
      citizenReports: memoryState.citizenReports.map((r) =>
        r.id === id ? { ...r, location, latitude, longitude } : r,
      ),
    };
    persistAndNotify();
  },

  deleteCitizenReport(id: string) {
    memoryState = {
      ...memoryState,
      citizenReports: memoryState.citizenReports.filter((r) => r.id !== id),
      complaints: memoryState.complaints.filter((c) => c.id !== id),
    };
    persistAndNotify();
  },

  resetToInitial() {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    fetchBackendData();
  },
};

export function useReports() {
  const state = useSyncExternalStore(reportsStore.subscribe, reportsStore.getSnapshot);

  const totalComplaints = state.complaints.length;
  const pending = state.complaints.filter(
    (c) => c.status === "New" || c.status === "Pending",
  ).length;
  const inProgress = state.complaints.filter(
    (c) => c.status === "In Progress" || c.status === "Assigned" || c.status === "In Review",
  ).length;
  const resolved = state.complaints.filter((c) => c.status === "Resolved").length;
  const highPriority = state.complaints.filter(
    (c) => c.severity === "critical" || c.severity === "high",
  ).length;

  const criticalInfra = state.infrastructure.filter((i) => i.riskScore >= 80).length;
  const highRiskInfra = state.infrastructure.filter(
    (i) => i.riskScore >= 60 && i.riskScore < 80,
  ).length;
  const avgRisk = Math.round(
    state.infrastructure.reduce((acc, i) => acc + i.riskScore, 0) /
      (state.infrastructure.length || 1),
  );

  return {
    complaints: state.complaints,
    citizenReports: state.citizenReports,
    infrastructure: state.infrastructure,
    stats: {
      totalComplaints,
      pending,
      newComplaints: pending,
      inProgress,
      inProgressComplaints: inProgress,
      resolved,
      resolvedComplaints: resolved,
      highPriority,
      criticalInfra,
      highRiskInfra,
      avgRisk,
    },
    addCitizenComplaint: reportsStore.addCitizenComplaint,
    addCitizenReport: reportsStore.addCitizenComplaint,
    updateComplaintStatus: reportsStore.updateComplaintStatus,
    updateAssetStatus: reportsStore.updateAssetStatus,
    updateComplaintLocation: reportsStore.updateComplaintLocation,
    deleteCitizenReport: reportsStore.deleteCitizenReport,
    resetToInitial: reportsStore.resetToInitial,
    resetDefaults: reportsStore.resetToInitial,
    syncWithBackend: fetchBackendData,
  };
}
