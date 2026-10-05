import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Map as MapIcon,
  MessageSquareWarning,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/civic/StatCard";
import { SeverityBadge } from "@/components/civic/SeverityBadge";
import { useReports } from "@/lib/reports-store";
import { getMarkerColorByScore, getRiskLevelByScore } from "@/lib/map-data";

export const Route = createFileRoute("/authority/")({
  head: () => ({
    meta: [
      { title: "City Infrastructure Command Center — CivicPulse AI" },
      {
        name: "description",
        content:
          "Monitor infrastructure health, identify risks, and prioritize action across the city.",
      },
      { property: "og:title", content: "City Infrastructure Command Center — CivicPulse AI" },
      {
        property: "og:description",
        content:
          "Monitor infrastructure health, identify risks, and prioritize action across the city.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const navigate = useNavigate();
  const { infrastructure, stats } = useReports();

  // Consistent priority queue sourced directly from live infrastructure store
  const priorityRows = useMemo(() => {
    return [...infrastructure].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  }, [infrastructure]);

  const totalAssetsCount = infrastructure.length;
  const criticalCount = infrastructure.filter(
    (i) => getRiskLevelByScore(i.riskScore) === "critical",
  ).length;
  const highCount = infrastructure.filter(
    (i) => getRiskLevelByScore(i.riskScore) === "high",
  ).length;

  // Navigate to City Map with target infrastructure selected
  const handleNavigateToMap = (id: string) => {
    navigate({
      to: "/authority/map",
      search: { selected: id },
    });
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            City Infrastructure Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Monitor infrastructure health, triage citizen grievances, and prioritize action in real
            time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="lg" className="rounded-xl cursor-pointer">
            <Link to="/authority/complaints">
              <MessageSquareWarning className="size-4" /> Manage Complaints
            </Link>
          </Button>
          <Button asChild size="lg" className="shrink-0 rounded-xl shadow-lift cursor-pointer">
            <Link to="/authority/map">
              <MapIcon className="size-4" /> View City Map
            </Link>
          </Button>
        </div>
      </header>

      {/* Real-Time Citizen Grievance & Operational Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Complaints"
          value={String(stats.totalComplaints)}
          delta="Logged across wards"
          icon={MessageSquareWarning}
        />
        <StatCard
          label="Pending"
          value={String(stats.newComplaints)}
          delta="Awaiting field assignment"
          trend={stats.newComplaints > 0 ? "up" : "down"}
          icon={Clock}
        />
        <StatCard
          label="In Progress"
          value={String(stats.inProgressComplaints)}
          delta="Active engineering response"
          icon={AlertTriangle}
        />
        <StatCard
          label="Resolved"
          value={String(stats.resolvedComplaints)}
          delta="Real-time synchronized"
          trend="up"
          icon={CheckCircle2}
        />
      </div>

      {/* Infrastructure Telemetry & Risk Health Indicators */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Monitored Infrastructure"
          value={String(totalAssetsCount)}
          delta="Continuous sensor telemetry"
          icon={Building2}
        />
        <StatCard
          label="Critical Risk"
          value={String(criticalCount)}
          delta="Immediate action required (80–100)"
          trend="down"
          icon={ShieldAlert}
        />
        <StatCard
          label="High Risk"
          value={String(highCount)}
          delta="Schedule remediation (60–79)"
          trend="down"
          icon={AlertTriangle}
        />
      </div>

      {/* Priority Infrastructure Table: Sourced from unified mapInfrastructure & Clickable with Full-Width Spacious Layout */}
      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Priority Infrastructure Queue</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked action list based on continuous sensor telemetry, structural age, and citizen
              complaint density
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl cursor-pointer self-start sm:self-auto"
          >
            <Link to="/authority/map">
              <MapIcon className="size-3.5" /> Full Map
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Infrastructure</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="min-w-[140px]">Risk Score</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Complaints</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priorityRows.map((r, index) => {
                const markerColor = getMarkerColorByScore(r.riskScore);
                return (
                  <TableRow
                    key={r.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => handleNavigateToMap(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleNavigateToMap(r.id)}
                    className="cursor-pointer hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none transition-colors group"
                    title={`Click to center City Map on ${r.name}`}
                  >
                    <TableCell className="font-display font-semibold tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {r.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.location.split("·")[0]?.trim() || r.id}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 font-semibold tabular-nums"
                          style={{ color: markerColor }}
                        >
                          {r.riskScore}
                        </span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${r.riskScore}%`,
                              background: markerColor,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={r.priority} />
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-foreground">
                      {r.complaints}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                        <span>View on Map</span>
                        <ChevronRight className="size-3.5" />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
