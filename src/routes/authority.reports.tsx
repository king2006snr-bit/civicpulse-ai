import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FileText,
  Filter,
  Layers,
  MapPin,
  PieChart as PieChartIcon,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/civic/PageHeader";
import { SeverityBadge } from "@/components/civic/SeverityBadge";
import { StatCard } from "@/components/civic/StatCard";
import {
  getMarkerColorByScore,
  getRiskLevelByScore,
  getRiskRuleByScore,
  riskLevels,
  type MapInfrastructure,
} from "@/lib/map-data";
import { reportFiles } from "@/lib/mock-data";
import { useReports } from "@/lib/reports-store";
import { generateInfrastructureReportPdf } from "@/lib/report-generator";

export const Route = createFileRoute("/authority/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics | CivicPulse AI" },
      {
        name: "description",
        content:
          "CivicPulse municipal infrastructure analytics, risk distribution, inspection health, and executive council report generator.",
      },
      { property: "og:title", content: "Reports & Analytics | CivicPulse AI" },
      {
        property: "og:description",
        content:
          "Risk distributions, complaint trajectory trends, and official report generation for city authorities.",
      },
    ],
  }),
  component: ReportsAndAnalyticsPage,
});

// Mock 6-month complaint trends with resolution velocity
const complaintTrendsData = [
  { month: "Apr 2026", reported: 48, resolved: 39, predictedSpike: 12 },
  { month: "May 2026", reported: 55, resolved: 46, predictedSpike: 15 },
  { month: "Jun 2026", reported: 68, resolved: 52, predictedSpike: 22 },
  { month: "Jul 2026", reported: 82, resolved: 65, predictedSpike: 28 },
  { month: "Aug 2026", reported: 96, resolved: 78, predictedSpike: 35 },
  { month: "Sep 2026", reported: 88, resolved: 81, predictedSpike: 30 },
];

export function ReportsAndAnalyticsPage() {
  const { infrastructure: mapInfrastructure, complaints, stats } = useReports();

  // Filter States: Date/Time & Infrastructure Category
  const [timePeriod, setTimePeriod] = useState("last-30-days");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [inspectionFilter, setInspectionFilter] = useState("all");

  // Report Preview Dialog State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState<"executive" | "audit" | "risk">("executive");

  // Filtered infrastructure dataset based on category & inspection status
  const filteredAssets = useMemo(() => {
    return mapInfrastructure.filter((item) => {
      // Category filter
      if (selectedCategory !== "all") {
        const cat = selectedCategory.toLowerCase();
        if (cat === "roads" && !item.type.toLowerCase().includes("road")) return false;
        if (
          cat === "bridges" &&
          !item.type.toLowerCase().includes("bridge") &&
          !item.type.toLowerCase().includes("flyover")
        )
          return false;
        if (cat === "drainage" && !item.type.toLowerCase().includes("drainage")) return false;
        if (cat === "water" && !item.type.toLowerCase().includes("water")) return false;
        if (cat === "lighting" && !item.type.toLowerCase().includes("streetlight")) return false;
      }

      // Inspection status filter
      if (inspectionFilter !== "all") {
        if (inspectionFilter === "action-required" && item.riskScore < 80) return false;
        if (inspectionFilter === "audited" && item.riskScore >= 80) return false;
      }

      return true;
    });
  }, [selectedCategory, inspectionFilter, mapInfrastructure]);

  // 1. Risk distribution calculations
  const riskDistribution = useMemo(() => {
    return [
      {
        level: "Low",
        range: "0–30",
        count: filteredAssets.filter((i) => getRiskLevelByScore(i.riskScore) === "low").length,
        color: "#16a34a",
      },
      {
        level: "Medium",
        range: "31–60",
        count: filteredAssets.filter((i) => getRiskLevelByScore(i.riskScore) === "medium").length,
        color: "#eab308",
      },
      {
        level: "High",
        range: "61–80",
        count: filteredAssets.filter((i) => getRiskLevelByScore(i.riskScore) === "high").length,
        color: "#f97316",
      },
      {
        level: "Critical",
        range: "81–100",
        count: filteredAssets.filter((i) => getRiskLevelByScore(i.riskScore) === "critical").length,
        color: "#dc2626",
      },
    ];
  }, [filteredAssets]);

  // 2. Infrastructure by Type calculations
  const infrastructureByType = useMemo(() => {
    const typeMap = new Map<string, { count: number; totalRisk: number; complaints: number }>();
    mapInfrastructure.forEach((item) => {
      const group = item.type.includes("Road")
        ? "Roads"
        : item.type.includes("Bridge") || item.type.includes("Flyover")
          ? "Bridges & Flyovers"
          : item.type.includes("Drainage")
            ? "Stormwater Drainage"
            : item.type.includes("Water")
              ? "Water Utilities"
              : "Streetlighting";

      const current = typeMap.get(group) || { count: 0, totalRisk: 0, complaints: 0 };
      typeMap.set(group, {
        count: current.count + 1,
        totalRisk: current.totalRisk + item.riskScore,
        complaints: current.complaints + item.complaints,
      });
    });

    const colors = ["#2563eb", "#0d9488", "#f97316", "#8b5cf6", "#eab308"];
    return Array.from(typeMap.entries()).map(([name, data], idx) => ({
      name,
      count: data.count,
      avgRisk: Math.round(data.totalRisk / data.count),
      complaints: data.complaints,
      color: colors[idx % colors.length]!,
    }));
  }, [mapInfrastructure]);

  // 4. Critical Infrastructure List (Risk score 81-100)
  const criticalAssets = useMemo(() => {
    return filteredAssets
      .filter((i) => getRiskLevelByScore(i.riskScore) === "critical")
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [filteredAssets]);

  // 5. High-Risk Infrastructure List (Risk score 61-80)
  const highRiskAssets = useMemo(() => {
    return filteredAssets
      .filter((i) => getRiskLevelByScore(i.riskScore) === "high")
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [filteredAssets]);

  // 6. Infrastructure Inspection Status metrics
  const inspectionSummary = useMemo(() => {
    const total = filteredAssets.length;
    const criticalNeeds = criticalAssets.length;
    const completedRecent = filteredAssets.filter((i) => i.riskScore <= 60).length;
    const scheduledAudit = filteredAssets.filter(
      (i) => i.riskScore > 60 && i.riskScore <= 80,
    ).length;
    const complianceRate = total > 0 ? Math.round((completedRecent / total) * 100) : 0;

    return {
      total,
      criticalNeeds,
      completedRecent,
      scheduledAudit,
      complianceRate,
    };
  }, [filteredAssets, criticalAssets]);

  // Summary Metrics
  const avgRiskScore = Math.round(
    filteredAssets.reduce((acc, i) => acc + i.riskScore, 0) / (filteredAssets.length || 1),
  );
  const totalComplaints = filteredAssets.reduce((acc, i) => acc + i.complaints, 0);

  const handleOpenPreview = () => {
    setIsPreviewOpen(true);
  };

  const handleDownloadReport = () => {
    try {
      const fileName = generateInfrastructureReportPdf({
        infrastructure: filteredAssets,
        complaints,
        title: "Executive Municipal Infrastructure & Citizen Grievance Audit",
        categoryFilter: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setIsPreviewOpen(false);
      toast.success("Executive Municipal Report Generated", {
        description: `Downloaded ${fileName} with live municipal telemetry and ${complaints.length} citizen complaints.`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate report PDF.");
    }
  };

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive diagnostic metrics, predictive risk distributions, and automated council-ready audit reports."
        actions={
          <Button
            onClick={handleOpenPreview}
            size="lg"
            className="rounded-xl shadow-lift bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            <FileText className="size-4" /> Generate Report
          </Button>
        }
      />

      {/* 7 & 8: DATE/TIME & INFRASTRUCTURE CATEGORY FILTERS */}
      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter 1: Date/Time Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Period:
              </span>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="q3-2026">This Quarter (Q3 2026)</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="year-2026">Year to Date (2026)</SelectItem>
                  <SelectItem value="all-time">All Recorded History</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Category:
              </span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[190px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Infrastructure ({mapInfrastructure.length})
                  </SelectItem>
                  <SelectItem value="roads">Roads & Streets</SelectItem>
                  <SelectItem value="bridges">Bridges & Flyovers</SelectItem>
                  <SelectItem value="drainage">Stormwater Drains</SelectItem>
                  <SelectItem value="water">Water Utility Lines</SelectItem>
                  <SelectItem value="lighting">Streetlight Grids</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Inspection Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="size-3.5 text-primary" /> Inspection:
              </span>
              <Select value={inspectionFilter} onValueChange={setInspectionFilter}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inspection Tiers</SelectItem>
                  <SelectItem value="action-required">Action Required (Critical)</SelectItem>
                  <SelectItem value="audited">Audited & Monitored</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimePeriod("last-30-days");
                setSelectedCategory("all");
                setInspectionFilter("all");
              }}
              className="rounded-xl text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3.5" /> Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={handleOpenPreview}
              className="rounded-xl text-xs cursor-pointer"
            >
              <Eye className="size-3.5" /> Preview Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Primary Analytic Metric Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monitored In Scope"
          value={String(filteredAssets.length)}
          delta={`${timePeriod.replace(/-/g, " ")} window`}
          icon={Layers}
        />
        <StatCard
          label="Critical Tiers"
          value={String(criticalAssets.length)}
          delta="Immediate intervention required"
          trend="down"
          icon={AlertTriangle}
        />
        <StatCard
          label="Average City Risk Score"
          value={`${avgRiskScore}/100`}
          delta="Based on sensor & audit logs"
          icon={BarChart3}
        />
        <StatCard
          label="Citizen Complaints"
          value={String(totalComplaints)}
          delta="Active grievances linked"
          icon={TrendingUp}
        />
      </div>

      {/* SECTIONS 1 & 2: 1. Risk Distribution & 2. Infrastructure by Type (Displayed Vertically with Full Width) */}
      <div className="space-y-6">
        {/* 1. RISK DISTRIBUTION CHART */}
        <Card className="rounded-2xl border-border/70 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">1. Risk Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">
                Distribution of infrastructure across standard municipal risk classifications
              </p>
            </div>
            <Badge variant="outline" className="text-xs rounded-full">
              {filteredAssets.length} Assets
            </Badge>
          </CardHeader>
          <CardContent className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskDistribution}
                margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="level" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]!.payload as (typeof riskDistribution)[0];
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-lift text-xs">
                          <p className="font-bold text-foreground mb-1">
                            {data.level} Risk ({data.range})
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ background: data.color }}
                            />
                            <span className="font-semibold text-foreground">
                              {data.count} assets
                            </span>
                            <span className="text-muted-foreground">
                              ({Math.round((data.count / (filteredAssets.length || 1)) * 100)}%)
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="Assets" radius={[8, 8, 0, 0]}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="grid grid-cols-4 border-t border-border/70 p-3 text-center text-xs">
            {riskDistribution.map((item) => (
              <div key={item.level} className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="size-2 rounded-full" style={{ background: item.color }} />
                  {item.level}
                </span>
                <span className="text-muted-foreground tabular-nums text-[11px]">
                  {item.count} ({item.range})
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. INFRASTRUCTURE BY TYPE */}
        <Card className="rounded-2xl border-border/70 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">2. Infrastructure by Type</CardTitle>
              <p className="text-xs text-muted-foreground">
                Inventory breakdown by asset class with average risk scoring
              </p>
            </div>
            <PieChartIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={infrastructureByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {infrastructureByType.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]!.payload as (typeof infrastructureByType)[0];
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-lift text-xs">
                          <p className="font-bold text-foreground mb-1">{data.name}</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            <div>
                              Count:{" "}
                              <span className="font-semibold text-foreground">
                                {data.count} assets
                              </span>
                            </div>
                            <div>
                              Average Risk:{" "}
                              <span className="font-semibold text-foreground">
                                {data.avgRisk}/100
                              </span>
                            </div>
                            <div>
                              Complaints:{" "}
                              <span className="font-semibold text-foreground">
                                {data.complaints} reports
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-foreground font-medium">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="flex flex-wrap items-center justify-around border-t border-border/70 p-3 text-xs">
            {infrastructureByType.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: cat.color }} />
                <span className="font-medium text-foreground">{cat.name}:</span>
                <span className="text-muted-foreground font-bold tabular-nums">{cat.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. COMPLAINT TRENDS */}
      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              3. Complaint Trends & Resolution Velocity
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              6-month trajectory comparing incoming citizen grievances, resolution speed, and AI
              predicted hotspots
            </p>
          </div>
          <Badge variant="outline" className="rounded-full text-xs">
            <TrendingUp className="mr-1 size-3 text-teal" /> 92% Resolution Efficiency
          </Badge>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={complaintTrendsData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  color: "var(--color-foreground)",
                  fontSize: 12,
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground font-medium">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="reported"
                name="Citizen Reports"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#f97316" }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Work Orders Closed"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#16a34a" }}
              />
              <Line
                type="monotone"
                dataKey="predictedSpike"
                name="AI Predicted Hotspots"
                stroke="#2563eb"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. CRITICAL INFRASTRUCTURE LIST & 5. HIGH-RISK INFRASTRUCTURE LIST (Displayed Vertically in Natural Triage Order) */}
      <div className="space-y-6">
        {/* 4. CRITICAL INFRASTRUCTURE LIST */}
        <Card className="rounded-2xl border-destructive/30 shadow-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  4. Critical Infrastructure Priority List ({criticalAssets.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Assets with Risk Score 81–100 requiring immediate municipal engineering dispatch
                </p>
              </div>
            </div>
            <SeverityBadge severity="Critical" className="text-xs self-start sm:self-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{asset.name}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full">
                      {asset.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{asset.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {asset.location} · {asset.complaints} complaints · Infrastructure Age:{" "}
                    {asset.age} yrs · Condition:{" "}
                    <span className="font-medium text-foreground">{asset.condition}</span>
                  </p>
                  <p className="text-xs text-destructive font-medium">
                    AI Advisory: {asset.aiRecommendation}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t border-destructive/15 md:border-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-destructive tabular-nums">
                      {asset.riskScore}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                    >
                      <Link to="/authority/infrastructure/$assetId" params={{ assetId: asset.id }}>
                        Inspect Dossier
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                    >
                      <Link to="/authority/map" search={{ selected: asset.id }}>
                        <MapPin className="size-3.5" /> View Map
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 5. HIGH-RISK INFRASTRUCTURE LIST */}
        <Card className="rounded-2xl border-warning/40 shadow-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-warning/15 text-warning">
                <ShieldAlert className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  5. High-Risk Infrastructure Scheduled Queue ({highRiskAssets.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Assets with Risk Score 61–80 scheduled for targeted preventative maintenance
                </p>
              </div>
            </div>
            <SeverityBadge severity="High" className="text-xs self-start sm:self-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            {highRiskAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-xl border border-warning/30 bg-surface/50 p-4 transition-colors hover:bg-surface"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{asset.name}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full">
                      {asset.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{asset.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {asset.location} · {asset.complaints} complaints · Condition:{" "}
                    <span className="font-medium text-foreground">{asset.condition}</span>
                  </p>
                  <p className="text-xs text-foreground font-medium">
                    AI Advisory: {asset.aiRecommendation}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t border-warning/20 md:border-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-warning tabular-nums">
                      {asset.riskScore}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                    >
                      <Link to="/authority/infrastructure/$assetId" params={{ assetId: asset.id }}>
                        Inspect Dossier
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                    >
                      <Link to="/authority/map" search={{ selected: asset.id }}>
                        <MapPin className="size-3.5" /> View Map
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 6. INFRASTRUCTURE INSPECTION STATUS */}
      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              6. Infrastructure Inspection Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Official audit compliance tracking across all wards under municipal public works
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Compliance Rate:</span>
            <span className="font-display text-base font-bold text-primary tabular-nums">
              {inspectionSummary.complianceRate}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-xs text-muted-foreground font-medium block">
                Audited & Sound
              </span>
              <span className="font-display text-2xl font-bold text-teal mt-1 block tabular-nums">
                {inspectionSummary.completedRecent} assets
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Risk score ≤ 60; routine sensors active
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-xs text-muted-foreground font-medium block">
                Audit Cycle Pending
              </span>
              <span className="font-display text-2xl font-bold text-warning mt-1 block tabular-nums">
                {inspectionSummary.scheduledAudit} assets
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Routine 60-day visual cycle upcoming
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-xs text-muted-foreground font-medium block">
                Urgent Re-Audit Required
              </span>
              <span className="font-display text-2xl font-bold text-destructive mt-1 block tabular-nums">
                {inspectionSummary.criticalNeeds} assets
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Critical degradation or past failures
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Ward / Zone</TableHead>
                  <TableHead>Last Inspection</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Lifecycle Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const color = getMarkerColorByScore(asset.riskScore);
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <span className="font-semibold text-foreground block">{asset.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{asset.id}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {asset.location.split("·")[0]?.trim()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                        {asset.lastInspection}
                      </TableCell>
                      <TableCell className="text-foreground">{asset.condition}</TableCell>
                      <TableCell>
                        <span className="font-bold tabular-nums" style={{ color }}>
                          {asset.riskScore}/100
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            asset.riskScore >= 80
                              ? "border-destructive/30 bg-destructive/10 text-destructive text-xs"
                              : "border-border text-xs"
                          }
                        >
                          {asset.status ||
                            (asset.riskScore >= 80 ? "Action Required" : "Monitored")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="rounded-lg text-xs">
                          <Link
                            to="/authority/infrastructure/$assetId"
                            params={{ assetId: asset.id }}
                          >
                            Inspect
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* HISTORICAL COUNCIL ARCHIVE */}
      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Council-Ready Report Archive</CardTitle>
            <p className="text-xs text-muted-foreground">
              Previously generated official audit packages available for download
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenPreview} className="rounded-xl">
            <FileDown className="size-4" /> Export Current Scope
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportFiles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="block font-medium text-foreground">{r.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{r.id}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.period}</TableCell>
                  <TableCell className="text-muted-foreground">{r.generated}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {r.size}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          const fileName = generateInfrastructureReportPdf({
                            infrastructure: mapInfrastructure,
                            complaints,
                            title: r.name,
                          });
                          toast.success(`Downloaded ${r.name}`, {
                            description: `Saved ${fileName} to your local downloads.`,
                          });
                        } catch (err) {
                          console.error("PDF generation failed:", err);
                          toast.error("Failed to generate PDF report.");
                        }
                      }}
                      className="rounded-lg cursor-pointer"
                    >
                      <Download className="size-3.5" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* REPORT PREVIEW MODAL / DIALOG BEFORE GENERATING REPORT */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-display">
                    Council Report Preview
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Review official parameters before generating & archiving the municipal report
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground text-xs">Draft Preview</Badge>
            </div>
          </DialogHeader>

          {/* Clean printable report preview document */}
          <div className="space-y-5 py-3 text-xs">
            {/* Header Document Banner */}
            <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  CIVICPULSE AI · MUNICIPAL RISK REPORT
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  Urban Infrastructure Health & Risk Evaluation Digest
                </h2>
                <p className="text-muted-foreground mt-0.5">
                  Scope: {selectedCategory.toUpperCase()} · Period: {timePeriod.toUpperCase()}
                </p>
              </div>
              <div className="text-left sm:text-right text-muted-foreground space-y-0.5">
                <div>
                  Ref:{" "}
                  <span className="font-mono text-foreground font-semibold">REP-2026-Q3-CP</span>
                </div>
                <div>
                  Date: <span className="text-foreground font-medium">27 Sep 2026</span>
                </div>
                <div>
                  Sign-off:{" "}
                  <span className="text-foreground font-medium">Chief Municipal Engineer</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border p-3 bg-card">
                <span className="text-muted-foreground block text-[11px]">
                  Total Assets Audited
                </span>
                <span className="font-display text-xl font-bold text-foreground mt-0.5 block tabular-nums">
                  {filteredAssets.length}
                </span>
              </div>
              <div className="rounded-xl border border-destructive/30 p-3 bg-destructive/5">
                <span className="text-destructive font-medium block text-[11px]">
                  Critical Interventions
                </span>
                <span className="font-display text-xl font-bold text-destructive mt-0.5 block tabular-nums">
                  {criticalAssets.length}
                </span>
              </div>
              <div className="rounded-xl border border-border p-3 bg-card">
                <span className="text-muted-foreground block text-[11px]">Avg Municipal Risk</span>
                <span className="font-display text-xl font-bold text-foreground mt-0.5 block tabular-nums">
                  {avgRiskScore}/100
                </span>
              </div>
              <div className="rounded-xl border border-border p-3 bg-card">
                <span className="text-muted-foreground block text-[11px]">Citizen Grievances</span>
                <span className="font-display text-xl font-bold text-foreground mt-0.5 block tabular-nums">
                  {totalComplaints}
                </span>
              </div>
            </div>

            {/* AI Predictive Executive Digest */}
            <div className="rounded-xl border border-primary/20 bg-accent/40 p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Sparkles className="size-4 text-primary" /> Executive AI Maintenance Recommendation
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Based on machine learning evaluation of structural aging, citizen complaint volume (
                {totalComplaints} reports), and past failure telemetry, immediate priority must be
                allocated to <strong>{criticalAssets.map((a) => a.name).join(", ")}</strong>.
                Preventive resurfacing and drainage clearance within the next 14 days will avoid
                emergency structural reconstruction costs estimated at $1.4M across municipal wards.
              </p>
            </div>

            {/* Priority Assets Table */}
            <div>
              <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-2">
                High & Critical Priority Asset Registry
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-surface">
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Complaints</TableHead>
                      <TableHead>AI Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...criticalAssets, ...highRiskAssets].slice(0, 5).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-semibold text-foreground">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.type}</TableCell>
                        <TableCell>
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: getMarkerColorByScore(a.riskScore) }}
                          >
                            {a.riskScore}/100
                          </span>
                        </TableCell>
                        <TableCell>
                          <SeverityBadge
                            severity={a.priority}
                            className="text-[10px] px-1.5 py-0"
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">{a.complaints}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {a.aiRecommendation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.print?.();
              }}
              className="rounded-xl cursor-pointer"
            >
              <Printer className="size-4" /> Print Report
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={handleDownloadReport}
                className="rounded-xl bg-primary text-primary-foreground cursor-pointer"
              >
                <Download className="size-4" /> Generate & Download PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
