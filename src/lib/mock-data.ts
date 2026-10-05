export type Severity = "critical" | "high" | "medium" | "low";

export type Asset = {
  id: string;
  name: string;
  type: "Road" | "Bridge" | "Drainage" | "Streetlight" | "Water Line";
  ward: string;
  healthScore: number;
  severity: Severity;
  lastInspected: string;
  riskScore: number;
  openComplaints: number;
  x: number; // map position %
  y: number;
  notes: string;
};

export type Complaint = {
  id: string;
  title: string;
  assetId: string;
  ward: string;
  citizen: string;
  category: string;
  severity: Severity;
  status: "New" | "In Review" | "Assigned" | "Resolved";
  reportedAt: string;
  aiConfidence: number;
};

export type Prediction = {
  id: string;
  assetId: string;
  assetName: string;
  failureWindow: string;
  probability: number;
  estimatedCost: string;
  recommendation: string;
};

export const assets: Asset[] = [
  {
    id: "AST-1041",
    name: "MG Road (Bandar Road)",
    type: "Road",
    ward: "Circle 2 — MG Road Corridor, Vijayawada",
    healthScore: 32,
    severity: "critical",
    lastInspected: "2026-08-14",
    riskScore: 91,
    openComplaints: 42,
    x: 52,
    y: 48,
    notes:
      "Condition: Poor. Traffic: High. Age: 14 years. Past failures: 3. Severe roadbed deterioration near Governorpet junction.",
  },
  {
    id: "AST-2210",
    name: "Prakasam Barrage Bridge",
    type: "Bridge",
    ward: "Circle 1 — Krishna River Crossing, Vijayawada",
    healthScore: 38,
    severity: "critical",
    lastInspected: "2026-09-02",
    riskScore: 87,
    openComplaints: 31,
    x: 25,
    y: 35,
    notes:
      "Condition: Poor. Traffic: Heavy. Age: 36 years. Past failures: 4. Expansion joints vibration fatigue recorded.",
  },
  {
    id: "AST-3087",
    name: "Eluru Road Corridor",
    type: "Road",
    ward: "Circle 2 — Eluru Road Transit Line, Vijayawada",
    healthScore: 54,
    severity: "high",
    lastInspected: "2026-08-29",
    riskScore: 71,
    openComplaints: 19,
    x: 48,
    y: 28,
    notes:
      "Condition: Fair. Traffic: High. Age: 12 years. Past failures: 1. Alligator cracking and pothole formation.",
  },
  {
    id: "AST-5590",
    name: "Benz Circle Flyover",
    type: "Road",
    ward: "Circle 3 — Benz Circle Junction, Vijayawada",
    healthScore: 48,
    severity: "high",
    lastInspected: "2026-09-18",
    riskScore: 76,
    openComplaints: 27,
    x: 68,
    y: 62,
    notes:
      "Condition: Poor. Traffic: Very high. Age: 6 years. Past failures: 2. Approach ramp subsidence reported.",
  },
  {
    id: "AST-6701",
    name: "Besant Road Bazaar",
    type: "Road",
    ward: "Circle 2 — Governorpet Market, Vijayawada",
    healthScore: 61,
    severity: "high",
    lastInspected: "2026-09-21",
    riskScore: 63,
    openComplaints: 16,
    x: 42,
    y: 42,
    notes:
      "Condition: Fair. Traffic: Moderate. Age: 9 years. Past failures: 1. Footpath paver damage and drainage shoulder erosion.",
  },
  {
    id: "AST-4412",
    name: "Krishna River Water Main",
    type: "Water Line",
    ward: "Circle 1 — Bhavanipuram, Vijayawada",
    healthScore: 66,
    severity: "medium",
    lastInspected: "2026-09-11",
    riskScore: 52,
    openComplaints: 11,
    x: 18,
    y: 50,
    notes: "Pressure anomalies recorded near Bhavanipuram utility duct.",
  },
];

export const complaints: Complaint[] = [
  {
    id: "CMP-8891",
    title: "Large pothole near Benz Circle bus stop",
    assetId: "AST-5590",
    ward: "Circle 3 — Benz Circle, Vijayawada",
    citizen: "R. Srinivas",
    category: "Road damage",
    severity: "high",
    status: "Assigned",
    reportedAt: "2026-09-24",
    aiConfidence: 94,
  },
  {
    id: "CMP-8884",
    title: "Vibrations on Prakasam Barrage span 3",
    assetId: "AST-2210",
    ward: "Circle 1 — Krishna River Crossing, Vijayawada",
    citizen: "S. Kulkarni",
    category: "Bridge structural",
    severity: "critical",
    status: "In Review",
    reportedAt: "2026-09-23",
    aiConfidence: 89,
  },
  {
    id: "CMP-8870",
    title: "Deep asphalt breakdown near Governorpet",
    assetId: "AST-1041",
    ward: "Circle 2 — MG Road, Vijayawada",
    citizen: "A. Venkat",
    category: "Road damage",
    severity: "critical",
    status: "New",
    reportedAt: "2026-09-22",
    aiConfidence: 97,
  },
  {
    id: "CMP-8842",
    title: "Surface subsidence at Bandar Road ramp",
    assetId: "AST-5590",
    ward: "Circle 3 — Patamata, Vijayawada",
    citizen: "T. Shaik",
    category: "Road damage",
    severity: "high",
    status: "Assigned",
    reportedAt: "2026-09-20",
    aiConfidence: 81,
  },
  {
    id: "CMP-8790",
    title: "Water main leak near Bhavanipuram",
    assetId: "AST-4412",
    ward: "Circle 1 — Bhavanipuram, Vijayawada",
    citizen: "D. Rao",
    category: "Water supply",
    severity: "medium",
    status: "Resolved",
    reportedAt: "2026-09-14",
    aiConfidence: 76,
  },
  {
    id: "CMP-8755",
    title: "Debris blocking Besant Road pedestrian lane",
    assetId: "AST-6701",
    ward: "Circle 2 — Governorpet, Vijayawada",
    citizen: "N. Murthy",
    category: "Sanitation",
    severity: "low",
    status: "Resolved",
    reportedAt: "2026-09-09",
    aiConfidence: 68,
  },
];

export const predictions: Prediction[] = [
  {
    id: "PRD-01",
    assetId: "AST-1041",
    assetName: "MG Road (Bandar Road)",
    failureWindow: "Within 30 days",
    probability: 91,
    estimatedCost: "₹2.4 Cr",
    recommendation: "Immediate roadbed rehabilitation and emergency resurfacing.",
  },
  {
    id: "PRD-02",
    assetId: "AST-2210",
    assetName: "Prakasam Barrage Bridge",
    failureWindow: "Within 45 days",
    probability: 87,
    estimatedCost: "₹3.8 Cr",
    recommendation: "Structural expansion joint replacement and heavy-freight diversion.",
  },
  {
    id: "PRD-03",
    assetId: "AST-3087",
    assetName: "Eluru Road Corridor",
    failureWindow: "Within 90 days",
    probability: 71,
    estimatedCost: "₹1.1 Cr",
    recommendation: "Mill and overlay the 1.8 km worst-rated commercial segment.",
  },
  {
    id: "PRD-04",
    assetId: "AST-5590",
    assetName: "Benz Circle Flyover",
    failureWindow: "Within 60 days",
    probability: 76,
    estimatedCost: "₹1.5 Cr",
    recommendation: "Base reinforcement and drainage slope grading along approach ramp.",
  },
];

export const complaintTrend = [
  { month: "Apr", reported: 210, resolved: 168 },
  { month: "May", reported: 264, resolved: 205 },
  { month: "Jun", reported: 398, resolved: 260 },
  { month: "Jul", reported: 441, resolved: 352 },
  { month: "Aug", reported: 372, resolved: 331 },
  { month: "Sep", reported: 318, resolved: 302 },
];

export const riskByCategory = [
  { category: "Roads", score: 72 },
  { category: "Drainage", score: 81 },
  { category: "Bridges", score: 92 },
  { category: "Water", score: 54 },
  { category: "Lighting", score: 44 },
];

export const healthForecast = [
  { month: "Oct", baseline: 68, withRepairs: 68 },
  { month: "Nov", baseline: 65, withRepairs: 71 },
  { month: "Dec", baseline: 61, withRepairs: 75 },
  { month: "Jan", baseline: 57, withRepairs: 78 },
  { month: "Feb", baseline: 52, withRepairs: 82 },
  { month: "Mar", baseline: 47, withRepairs: 85 },
];

export const wardSplit = [
  { name: "Central", value: 34 },
  { name: "North", value: 24 },
  { name: "East", value: 21 },
  { name: "South", value: 13 },
  { name: "West", value: 8 },
];

export const citizenReports = [
  {
    id: "CMP-8842",
    title: "Street lamps off for four nights",
    status: "Assigned" as const,
    ward: "Ward 15 — South",
    reportedAt: "2026-09-20",
    update: "Field crew scheduled for 28 Sep.",
  },
  {
    id: "CMP-8701",
    title: "Broken footpath tile near school",
    status: "In Review" as const,
    ward: "Ward 15 — South",
    reportedAt: "2026-09-12",
    update: "AI matched with 6 similar reports nearby.",
  },
  {
    id: "CMP-8533",
    title: "Overflowing drain at market lane",
    status: "Resolved" as const,
    ward: "Ward 15 — South",
    reportedAt: "2026-08-30",
    update: "Cleared and inspected on 04 Sep.",
  },
];

export const reportFiles = [
  {
    id: "RPT-2026-09",
    name: "September infrastructure health digest",
    period: "Sep 2026",
    type: "Monthly digest",
    size: "2.4 MB",
    generated: "2026-09-26",
  },
  {
    id: "RPT-RISK-Q3",
    name: "Q3 city-wide risk assessment",
    period: "Jul–Sep 2026",
    type: "Risk assessment",
    size: "5.1 MB",
    generated: "2026-09-25",
  },
  {
    id: "RPT-BRIDGE-01",
    name: "Bridge structural audit — MG Road",
    period: "Aug 2026",
    type: "Audit",
    size: "8.7 MB",
    generated: "2026-08-30",
  },
  {
    id: "RPT-CITZ-09",
    name: "Citizen engagement summary",
    period: "Sep 2026",
    type: "Engagement",
    size: "1.2 MB",
    generated: "2026-09-24",
  },
];

export function getAsset(id: string) {
  return assets.find((a) => a.id === id);
}
