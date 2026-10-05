export type RiskLevel = "low" | "medium" | "high" | "critical";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type RiskColorName = "Green" | "Yellow" | "Orange" | "Red";

export interface RiskRule {
  readonly level: RiskLevel;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly range: string;
  readonly colorName: RiskColorName;
  readonly color: string;
}

export const RISK_RULES: readonly RiskRule[] = [
  {
    level: "low",
    label: "Low",
    min: 0,
    max: 30,
    range: "0–30",
    colorName: "Green",
    color: "#16a34a",
  },
  {
    level: "medium",
    label: "Medium",
    min: 31,
    max: 60,
    range: "31–60",
    colorName: "Yellow",
    color: "#eab308",
  },
  {
    level: "high",
    label: "High",
    min: 61,
    max: 80,
    range: "61–80",
    colorName: "Orange",
    color: "#f97316",
  },
  {
    level: "critical",
    label: "Critical",
    min: 81,
    max: 100,
    range: "81–100",
    colorName: "Red",
    color: "#dc2626",
  },
] as const;

export const riskLevels = RISK_RULES;

/**
 * Reusable logic for automatically determining risk level and marker color based on riskScore:
 *   0–30   → Low      → Green  (#16a34a)
 *   31–60  → Medium   → Yellow (#eab308)
 *   61–80  → High     → Orange (#f97316)
 *   81–100 → Critical → Red    (#dc2626)
 */
export function getRiskRuleByScore(score: number): RiskRule {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  for (const rule of RISK_RULES) {
    if (normalized >= rule.min && normalized <= rule.max) {
      return rule;
    }
  }
  return RISK_RULES[RISK_RULES.length - 1]!;
}

export function getRiskLevelByScore(score: number): RiskLevel {
  return getRiskRuleByScore(score).level;
}

export function getMarkerColorByScore(score: number): string {
  return getRiskRuleByScore(score).color;
}

export function getRiskColorNameByScore(score: number): RiskColorName {
  return getRiskRuleByScore(score).colorName;
}

// Backward-compatible helper functions
export const riskLevel = getRiskLevelByScore;
export const riskColor = getMarkerColorByScore;

export function normalizeRiskLevel(priority?: string, score?: number): RiskLevel {
  if (typeof score === "number" && !Number.isNaN(score)) {
    return getRiskLevelByScore(score);
  }
  if (priority) {
    const p = priority.toLowerCase();
    if (p === "critical" || p === "high" || p === "medium" || p === "low") {
      return p as RiskLevel;
    }
  }
  return "low";
}

export type MapInfrastructure = {
  id: string;
  name: string;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  riskScore: number;
  priority: Priority;
  condition: "Good" | "Fair" | "Poor" | "Very poor";
  complaints: number;
  traffic: "Low" | "Moderate" | "High" | "Heavy" | "Very heavy";
  age: number;
  pastFailures: number;
  lastInspection: string;
  aiPrediction: string;
  aiRecommendation: string;
  assetId?: string;
  status?: string;
};

// No manual color assigned to individual infrastructure locations.
// Colors and risk levels are dynamically resolved from `riskScore` using `getMarkerColorByScore` / `getRiskRuleByScore`.
export const mapInfrastructure: MapInfrastructure[] = [
  {
    id: "INF-001",
    name: "MG Road (Bandar Road)",
    type: "Road",
    location: "Circle 2 — MG Road Corridor, Vijayawada (16.5015° N, 80.6420° E)",
    latitude: 16.5015,
    longitude: 80.642,
    riskScore: 91,
    priority: "Critical",
    condition: "Poor",
    complaints: 42,
    traffic: "High",
    age: 14,
    pastFailures: 3,
    lastInspection: "14 Aug 2026",
    aiPrediction: "High probability of roadbed deterioration under heavy transit.",
    aiRecommendation:
      "Inspect drainage culvert and resurface the damaged asphalt section within 7 days.",
    assetId: "AST-1041",
    status: "Action Required",
  },
  {
    id: "INF-002",
    name: "Prakasam Barrage Road Bridge",
    type: "Bridge",
    location: "Circle 1 — Krishna River Crossing, Vijayawada (16.5085° N, 80.6065° E)",
    latitude: 16.5085,
    longitude: 80.6065,
    riskScore: 87,
    priority: "Critical",
    condition: "Poor",
    complaints: 31,
    traffic: "High",
    age: 36,
    pastFailures: 4,
    lastInspection: "02 Sep 2026",
    aiPrediction: "High probability of expansion joint vibration fatigue.",
    aiRecommendation: "Inspect expansion joints and resurface bridge deck within 7 days.",
    assetId: "AST-2210",
    status: "Under Structural Audit",
  },
  {
    id: "INF-003",
    name: "Benz Circle Flyover",
    type: "Flyover",
    location: "Circle 3 — Benz Circle Junction, Vijayawada (16.4984° N, 80.6558° E)",
    latitude: 16.4984,
    longitude: 80.6558,
    riskScore: 76,
    priority: "High",
    condition: "Poor",
    complaints: 27,
    traffic: "High",
    age: 6,
    pastFailures: 2,
    lastInspection: "18 Sep 2026",
    aiPrediction: "Bearing pad wear and surface subsidence at approach ramp.",
    aiRecommendation: "Inspect drainage runoff and execute surface re-profiling within 10 days.",
    assetId: "AST-5590",
    status: "Work Order Pending",
  },
  {
    id: "INF-004",
    name: "Eluru Road Corridor",
    type: "Road",
    location: "Circle 2 — Eluru Road Transit Line, Vijayawada (16.5165° N, 80.6325° E)",
    latitude: 16.5165,
    longitude: 80.6325,
    riskScore: 71,
    priority: "High",
    condition: "Fair",
    complaints: 19,
    traffic: "High",
    age: 12,
    pastFailures: 1,
    lastInspection: "29 Aug 2026",
    aiPrediction: "Localized alligator cracking and pothole formation.",
    aiRecommendation: "Mill and overlay the 1.8 km commercial corridor segment.",
    assetId: "AST-3087",
    status: "Scheduled for Resurfacing",
  },
  {
    id: "INF-005",
    name: "Besant Road Commercial Bazaar",
    type: "Road",
    location: "Circle 2 — Governorpet Market, Vijayawada (16.5115° N, 80.6280° E)",
    latitude: 16.5115,
    longitude: 80.628,
    riskScore: 63,
    priority: "High",
    condition: "Fair",
    complaints: 16,
    traffic: "Moderate",
    age: 9,
    pastFailures: 1,
    lastInspection: "21 Sep 2026",
    aiPrediction: "Pedestrian walkway pavers fractured; drainage shoulder erosion.",
    aiRecommendation: "Repair paver tiles and unclog roadside stormwater grates.",
    assetId: "AST-6701",
    status: "Under Review",
  },
  {
    id: "INF-006",
    name: "Ryves Canal Stormwater Drain",
    type: "Drainage",
    location: "Circle 2 — Ryves Canal Channel, Vijayawada (16.5100° N, 80.6350° E)",
    latitude: 16.51,
    longitude: 80.635,
    riskScore: 84,
    priority: "Critical",
    condition: "Poor",
    complaints: 35,
    traffic: "Moderate",
    age: 22,
    pastFailures: 3,
    lastInspection: "10 Sep 2026",
    aiPrediction: "Severe desilting backlog posing high monsoon waterlogging hazard.",
    aiRecommendation:
      "Deploy mechanized desilting and reinforce canal retaining masonry within 7 days.",
    status: "Action Required",
  },
  {
    id: "INF-007",
    name: "Kanaka Durga Temple Ghat Road",
    type: "Road",
    location: "Circle 1 — Indrakeeladri Hill Slope, Vijayawada (16.5152° N, 80.6052° E)",
    latitude: 16.5152,
    longitude: 80.6052,
    riskScore: 79,
    priority: "High",
    condition: "Poor",
    complaints: 25,
    traffic: "High",
    age: 18,
    pastFailures: 2,
    lastInspection: "24 Aug 2026",
    aiPrediction: "Hill slope rockfall catchment net degradation.",
    aiRecommendation: "Anchor rockfall mitigation barriers and repair asphalt surface.",
    status: "Work Order Pending",
  },
  {
    id: "INF-008",
    name: "Autonagar Industrial Corridor Road",
    type: "Road",
    location: "Circle 3 — Autonagar Gateway, Vijayawada (16.4950° N, 80.6720° E)",
    latitude: 16.495,
    longitude: 80.672,
    riskScore: 58,
    priority: "Medium",
    condition: "Fair",
    complaints: 14,
    traffic: "High",
    age: 11,
    pastFailures: 1,
    lastInspection: "08 Sep 2026",
    aiPrediction: "Moderate subgrade settlement caused by heavy freight trucks.",
    aiRecommendation: "Reinforce heavy-duty road subbase and repair bitumen edges.",
    status: "Routine Maintenance",
  },
  {
    id: "INF-009",
    name: "Krishna River Water Treatment Main",
    type: "Water Line",
    location: "Circle 1 — Bhavanipuram Utility Corridor, Vijayawada (16.5180° N, 80.5980° E)",
    latitude: 16.518,
    longitude: 80.598,
    riskScore: 52,
    priority: "Medium",
    condition: "Fair",
    complaints: 11,
    traffic: "Low",
    age: 26,
    pastFailures: 2,
    lastInspection: "11 Sep 2026",
    aiPrediction: "Minor pressure telemetry oscillations under peak pumping hours.",
    aiRecommendation: "Perform ultrasonic valve audit and calibrate pressure monitors.",
    assetId: "AST-4412",
    status: "Routine Monitoring",
  },
  {
    id: "INF-010",
    name: "Gunadala Mary Matha Hill Approach",
    type: "Road",
    location: "Circle 3 — Gunadala Ridge, Vijayawada (16.5250° N, 80.6580° E)",
    latitude: 16.525,
    longitude: 80.658,
    riskScore: 28,
    priority: "Low",
    condition: "Good",
    complaints: 4,
    traffic: "Low",
    age: 7,
    pastFailures: 0,
    lastInspection: "22 Sep 2026",
    aiPrediction: "Structurally sound; minimal pavement fatigue.",
    aiRecommendation: "Routine quarterly visual maintenance and guardrail inspection.",
    status: "Healthy / Monitored",
  },
  {
    id: "INF-011",
    name: "Patamata High-Density Main Road",
    type: "Road",
    location: "Circle 3 — Patamata Ward 15, Vijayawada (16.4910° N, 80.6590° E)",
    latitude: 16.491,
    longitude: 80.659,
    riskScore: 19,
    priority: "Low",
    condition: "Good",
    complaints: 2,
    traffic: "Moderate",
    age: 4,
    pastFailures: 0,
    lastInspection: "21 Sep 2026",
    aiPrediction: "Minimal deterioration risk; optimal pavement friction.",
    aiRecommendation: "Continue regular automated sensor telemetry monitoring.",
    status: "Optimal Condition",
  },
  {
    id: "INF-012",
    name: "One Town Heritage Streetlight Grid",
    type: "Streetlight",
    location: "Circle 1 — Old City Core, Vijayawada (16.5200° N, 80.6150° E)",
    latitude: 16.52,
    longitude: 80.615,
    riskScore: 42,
    priority: "Medium",
    condition: "Fair",
    complaints: 13,
    traffic: "Moderate",
    age: 15,
    pastFailures: 1,
    lastInspection: "18 Sep 2026",
    aiPrediction: "Intermittent luminaire outages predicted due to monsoon wiring exposure.",
    aiRecommendation: "Upgrade vintage fixtures to smart LED luminaires with central monitoring.",
    status: "Routine Maintenance",
  },
];

/**
 * Dynamically resolves an infrastructure asset by ID, assetId, or slug.
 * Ensures the details page dynamically reflects the exact selected asset.
 */
export function getInfrastructureById(id?: string): MapInfrastructure {
  if (!id) return mapInfrastructure[0]!;
  const clean = id.trim().toLowerCase();

  const found = mapInfrastructure.find(
    (item) =>
      item.id.toLowerCase() === clean ||
      item.assetId?.toLowerCase() === clean ||
      item.name.toLowerCase() === clean ||
      item.name.toLowerCase().replace(/\s+/g, "-") === clean,
  );

  return found ?? mapInfrastructure[0]!;
}
