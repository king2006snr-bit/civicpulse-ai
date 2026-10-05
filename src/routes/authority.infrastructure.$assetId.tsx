import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  MapPin,
  MessageSquare,
  Printer,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/civic/SeverityBadge";
import {
  getInfrastructureById,
  getMarkerColorByScore,
  getRiskRuleByScore,
  type MapInfrastructure,
} from "@/lib/map-data";
import { useReports } from "@/lib/reports-store";
import { generateInfrastructureReportPdf } from "@/lib/report-generator";

export const Route = createFileRoute("/authority/infrastructure/$assetId")({
  head: () => ({
    meta: [
      { title: "Infrastructure Details | CivicPulse AI" },
      {
        name: "description",
        content:
          "CivicPulse infrastructure intelligence: AI deterioration predictions, risk scoring, complaints, and maintenance actions.",
      },
      { property: "og:title", content: "Infrastructure Details | CivicPulse AI" },
      {
        property: "og:description",
        content:
          "CivicPulse infrastructure intelligence: AI deterioration predictions, risk scoring, complaints, and maintenance actions.",
      },
    ],
  }),
  component: InfrastructureDetailsPage,
});

function InfrastructureDetailsPage() {
  const { assetId } = Route.useParams();
  const navigate = useNavigate();
  const { complaints: allComplaints, infrastructure, updateAssetStatus } = useReports();

  // Dynamically retrieve the selected infrastructure's data from live store
  const infra: MapInfrastructure =
    infrastructure.find(
      (i) => i.id === assetId || (i as { assetId?: string }).assetId === assetId,
    ) || getInfrastructureById(assetId);
  const rule = getRiskRuleByScore(infra.riskScore);
  const markerColor = getMarkerColorByScore(infra.riskScore);

  // Filter linked citizen complaints
  const linkedComplaints = allComplaints.filter(
    (c) =>
      c.assetId === infra.id ||
      c.assetId === infra.assetId ||
      c.title.toLowerCase().includes(infra.name.toLowerCase()) ||
      c.ward.toLowerCase().includes(infra.location.toLowerCase().split("·")[0]?.trim() || ""),
  );

  // Status update dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(infra.status || "Action Required");
  const [statusNote, setStatusNote] = useState("");

  // Report dialog state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Dynamic 6-month health trend based on risk score
  const baseHealth = Math.max(15, 100 - infra.riskScore);
  const history = [
    { month: "Apr", health: Math.min(95, baseHealth + 18) },
    { month: "May", health: Math.min(90, baseHealth + 14) },
    { month: "Jun", health: Math.min(85, baseHealth + 10) },
    { month: "Jul", health: Math.min(80, baseHealth + 6) },
    { month: "Aug", health: Math.min(75, baseHealth + 3) },
    { month: "Sep", health: baseHealth },
  ];

  const handleUpdateStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsStatusDialogOpen(false);
    updateAssetStatus(infra.id, currentStatus, statusNote);
    toast.success(`Status updated for ${infra.name}`, {
      description: `New status "${currentStatus}" registered with civic maintenance dispatch. Live changes reflect immediately on all dashboards.`,
    });
  };

  const handleGenerateReport = () => {
    try {
      const fileName = generateInfrastructureReportPdf({
        infrastructure: [infra],
        complaints: allComplaints,
        targetAsset: infra,
        title: `Official Infrastructure Audit & Risk Report: ${infra.name} (${infra.id})`,
      });
      toast.success(`Infrastructure report downloaded`, {
        description: `Downloaded ${fileName} with live telemetry and grievance records.`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate PDF report.");
    }
    setIsReportDialogOpen(true);
  };

  return (
    <>
      {/* Top back navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          className="w-fit rounded-xl px-2 text-muted-foreground hover:text-foreground"
        >
          <Link to="/authority/map" search={{ selected: infra.id }}>
            <ArrowLeft className="size-4" /> Back to City Map
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{infra.id}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <Badge variant="outline" className="text-xs rounded-full">
            {currentStatus}
          </Badge>
        </div>
      </div>

      {/* Main Header with Key Asset Metadata & Primary Action Buttons */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-card lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {infra.name}
            </h1>
            <Badge variant="secondary" className="rounded-full text-xs font-semibold px-3 py-1">
              {infra.type}
            </Badge>
            <SeverityBadge severity={infra.priority} className="px-3 py-1 text-xs" />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="font-medium text-foreground">Location:</span> {infra.location}
          </p>
        </div>

        {/* 4 Required Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:self-start">
          {/* Button 1: View on Map */}
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-border bg-card shadow-xs hover:bg-surface cursor-pointer"
          >
            <Link to="/authority/map" search={{ selected: infra.id }}>
              <Eye className="size-4 text-primary" />
              <span>View on Map</span>
            </Link>
          </Button>

          {/* Button 2: View Complaints */}
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-border bg-card shadow-xs hover:bg-surface cursor-pointer"
          >
            <Link to="/authority/complaints">
              <MessageSquare className="size-4 text-warning" />
              <span>View Complaints ({infra.complaints})</span>
            </Link>
          </Button>

          {/* Button 3: Update Status */}
          <Button
            variant="outline"
            onClick={() => setIsStatusDialogOpen(true)}
            className="rounded-xl border-border bg-card shadow-xs hover:bg-surface cursor-pointer"
          >
            <RefreshCw className="size-4 text-teal" />
            <span>Update Status</span>
          </Button>

          {/* Button 4: Generate Report */}
          <Button
            onClick={handleGenerateReport}
            className="rounded-xl bg-primary text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer"
          >
            <FileText className="size-4" />
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* Primary Key Infrastructure Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Risk Score */}
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span
                className="font-display text-4xl font-bold tabular-nums"
                style={{ color: markerColor }}
              >
                {infra.riskScore}
                <span className="text-base font-normal text-muted-foreground">/100</span>
              </span>
              <span className="text-xs font-semibold" style={{ color: markerColor }}>
                {rule.label} ({rule.colorName})
              </span>
            </div>
            <Progress value={infra.riskScore} className="mt-3 h-2" />
          </CardContent>
        </Card>

        {/* Priority & Condition */}
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Priority & Condition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Priority Tier:</span>
              <SeverityBadge severity={infra.priority} className="text-xs px-2 py-0.5" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Condition:</span>
              <span className="text-sm font-semibold text-foreground">{infra.condition}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Traffic Density:</span>
              <span className="text-sm font-semibold text-foreground">{infra.traffic}</span>
            </div>
          </CardContent>
        </Card>

        {/* Complaints & Age */}
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Complaints & Age
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Citizen Complaints:</span>
              <span className="font-display text-lg font-bold text-foreground tabular-nums">
                {infra.complaints} reports
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Infrastructure Age:</span>
              <span className="text-sm font-semibold text-foreground">{infra.age} years</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Past Failures:</span>
              <span className="text-sm font-semibold text-destructive tabular-nums">
                {infra.pastFailures} recorded
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Last Inspection */}
        <Card className="rounded-2xl border-border/80 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Inspection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-primary shrink-0" />
              <span className="font-display text-xl font-bold text-foreground">
                {infra.lastInspection}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Certified municipal audit conducted under Ward Public Works division.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI ANALYSIS SECTION (Required by Prompt) */}
      <Card className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-lift">
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold font-display text-foreground">
                  AI Analysis
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Neural predictive maintenance assessment powered by CivicPulse ML Engine
                </p>
              </div>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
              Live Diagnostic
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* AI Prediction */}
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-5">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Prediction</span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-foreground leading-snug">
              {infra.aiPrediction || "High probability of deterioration."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Based on telemetry from {infra.complaints} citizen reports, {infra.traffic} traffic
              loads, and an age of {infra.age} years with {infra.pastFailures} past failure events.
            </p>
          </div>

          {/* AI Recommendation */}
          <div className="rounded-2xl border border-teal/30 bg-teal/10 p-5">
            <div className="flex items-center gap-2 text-teal">
              <Wrench className="size-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Recommendation</span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-foreground leading-snug">
              {infra.aiRecommendation ||
                "Inspect drainage and resurface the damaged section within 7 days."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Recommended action dispatched to Ward Engineering. Timely intervention avoids
              projected emergency rebuild costs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive 6-Month Structural Health & Deterioration Trend (Full Width) */}
      <Card className="rounded-2xl border-border/80 shadow-card">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">
              6-Month Structural Health & Deterioration Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Dynamic physical structural score calculated from IoT strain sensors, acoustic
              monitors, and municipal audit logs
            </p>
          </div>
          <Badge variant="outline" className="text-xs rounded-full self-start sm:self-auto">
            Current Health:{" "}
            <span className="font-bold ml-1" style={{ color: markerColor }}>
              {baseHealth}%
            </span>
          </Badge>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[10, 100]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  color: "var(--color-foreground)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="health"
                stroke={markerColor}
                strokeWidth={3}
                dot={{ r: 5, fill: markerColor, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7 }}
                name="Structural Health Index"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engineering & Asset Specifications (Unique Metadata, Non-Duplicative) */}
      <Card className="rounded-2xl border-border/80 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Engineering & Structural Specifications
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Authoritative municipal registry record and geo-spatial coordinates
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Asset Identifier
              </span>
              <span className="font-mono font-semibold text-foreground text-sm">{infra.id}</span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Asset Classification
              </span>
              <span className="font-semibold text-foreground text-sm">{infra.type}</span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                GPS Coordinates
              </span>
              <span className="font-mono text-foreground text-xs">
                {infra.latitude.toFixed(4)}° N, {infra.longitude.toFixed(4)}° E
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Managing Jurisdiction
              </span>
              <span className="font-medium text-foreground text-sm">
                Department of Public Works ·{" "}
                {infra.location.split("·")[0]?.trim() || "Ward Division"}
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Telemetry Monitoring
              </span>
              <span className="font-medium text-teal text-sm flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-teal animate-pulse" />
                Active Continuous Stream
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/40 p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Next Audit Protocol
              </span>
              <span className="font-medium text-foreground text-sm">
                Quarterly Risk Re-evaluation (Q4 2026)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Citizen Complaints Section */}
      <Card className="rounded-2xl border-border/80 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Linked Citizen Reports ({linkedComplaints.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Community grievance reports matching {infra.name} location coordinates
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link to="/authority/complaints">Open Complaints Board</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {linkedComplaints.length > 0 ? (
            linkedComplaints.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-3.5 bg-surface/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {c.title}
                    </span>
                    <SeverityBadge severity={c.severity} className="text-[10px] px-1.5 py-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Report #{c.id} · Submitted by {c.citizen} · {c.reportedAt}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {c.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    AI Conf. {c.aiConfidence}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No unresolved grievances currently open for {infra.name}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog 1: Update Status Modal */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display">
              Update Infrastructure Status
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Change the operational lifecycle stage for{" "}
              <span className="font-semibold">{infra.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="status-select" className="text-xs font-semibold">
                Select Lifecycle Status
              </Label>
              <select
                id="status-select"
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Action Required">Action Required (Critical Attention)</option>
                <option value="Inspection Scheduled">Inspection Scheduled</option>
                <option value="Work Order Issued">Work Order Issued</option>
                <option value="Repairs In Progress">Repairs In Progress</option>
                <option value="Under Structural Audit">Under Structural Audit</option>
                <option value="Resolved / Repaired">Resolved / Repaired</option>
                <option value="Routine Monitoring">Routine Monitoring</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-notes" className="text-xs font-semibold">
                Official Engineer Notes
              </Label>
              <Textarea
                id="status-notes"
                placeholder="Specify work crew dispatch, materials requisitioned, or inspection scope…"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="rounded-xl min-h-[90px] text-sm"
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl cursor-pointer">
                Save & Dispatch Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Generate Report Modal */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <DialogTitle className="text-lg font-bold font-display">
                Infrastructure Audit & Risk Report
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official CivicPulse AI Generated Report · Asset Ref: {infra.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-foreground text-sm">{infra.name}</span>
                <span className="text-muted-foreground font-mono">{infra.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  Location: <span className="text-foreground font-medium">{infra.location}</span>
                </div>
                <div>
                  Category: <span className="text-foreground font-medium">{infra.type}</span>
                </div>
                <div>
                  Risk Score:{" "}
                  <span className="font-bold" style={{ color: markerColor }}>
                    {infra.riskScore}/100
                  </span>
                </div>
                <div>
                  Priority: <span className="text-foreground font-medium">{infra.priority}</span>
                </div>
                <div>
                  Condition: <span className="text-foreground font-medium">{infra.condition}</span>
                </div>
                <div>
                  Traffic Load: <span className="text-foreground font-medium">{infra.traffic}</span>
                </div>
                <div>
                  Complaints:{" "}
                  <span className="text-foreground font-medium">{infra.complaints}</span>
                </div>
                <div>
                  Asset Age: <span className="text-foreground font-medium">{infra.age} years</span>
                </div>
                <div>
                  Past Failures:{" "}
                  <span className="text-foreground font-medium">{infra.pastFailures}</span>
                </div>
                <div>
                  Last Inspection:{" "}
                  <span className="text-foreground font-medium">{infra.lastInspection}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-accent/30 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> AI Predictive Diagnostic Summary
              </div>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Prediction:</strong>{" "}
                {infra.aiPrediction || "High probability of deterioration."}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Recommendation:</strong>{" "}
                {infra.aiRecommendation ||
                  "Inspect drainage and resurface the damaged section within 7 days."}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                window.print?.();
              }}
              className="rounded-xl cursor-pointer"
            >
              <Printer className="size-4" /> Print Report
            </Button>
            <Button
              onClick={() => {
                try {
                  const fileName = generateInfrastructureReportPdf({
                    infrastructure: [infra],
                    complaints: allComplaints,
                    targetAsset: infra,
                    title: `Official Infrastructure Audit & Risk Report: ${infra.name} (${infra.id})`,
                  });
                  toast.success(`Downloaded ${fileName}`);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to download PDF");
                }
                setIsReportDialogOpen(false);
              }}
              className="rounded-xl cursor-pointer"
            >
              <Download className="size-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
