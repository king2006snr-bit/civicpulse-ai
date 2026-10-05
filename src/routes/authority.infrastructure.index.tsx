import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/civic/PageHeader";
import { SeverityBadge } from "@/components/civic/SeverityBadge";
import { getMarkerColorByScore, type MapInfrastructure } from "@/lib/map-data";
import { useReports } from "@/lib/reports-store";
import { generateInfrastructureReportPdf } from "@/lib/report-generator";

export const Route = createFileRoute("/authority/infrastructure/")({
  head: () => ({
    meta: [
      { title: "Infrastructure register — CivicPulse AI" },
      {
        name: "description",
        content:
          "Searchable register of roads, bridges, drains, water mains and lighting grids with health and risk scores.",
      },
      { property: "og:title", content: "Infrastructure register — CivicPulse AI" },
      {
        property: "og:description",
        content: "Every city asset with its health score, risk score and inspection history.",
      },
    ],
  }),
  component: InfrastructureList,
});

function InfrastructureList() {
  const { infrastructure: mapInfrastructure, complaints } = useReports();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const handleGenerateReport = () => {
    try {
      const fileName = generateInfrastructureReportPdf({
        infrastructure: mapInfrastructure,
        complaints,
        title: "Official Municipal Infrastructure Register & Grievance Report",
      });
      toast.success("Infrastructure Report Generated", {
        description: `Downloaded ${fileName} with ${mapInfrastructure.length} urban assets and ${complaints.length} grievances.`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate infrastructure report.");
    }
  };

  const filtered = useMemo(() => {
    return mapInfrastructure.filter((item: MapInfrastructure) => {
      const matchQuery = (item.name + " " + item.id + " " + item.location + " " + item.type)
        .toLowerCase()
        .includes(query.trim().toLowerCase());

      if (!matchQuery) return false;

      if (tab === "roads") return item.type.toLowerCase().includes("road");
      if (tab === "bridges")
        return (
          item.type.toLowerCase().includes("bridge") || item.type.toLowerCase().includes("flyover")
        );
      if (tab === "water")
        return (
          item.type.toLowerCase().includes("water") || item.type.toLowerCase().includes("drainage")
        );
      if (tab === "other")
        return (
          !item.type.toLowerCase().includes("road") && !item.type.toLowerCase().includes("water")
        );
      return true;
    });
  }, [mapInfrastructure, query, tab]);

  return (
    <>
      <PageHeader
        title="Infrastructure Register"
        description="All monitored urban assets with real-time risk scores, inspection logs, and AI maintenance status."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateReport}
              variant="outline"
              className="rounded-xl shadow-xs cursor-pointer"
            >
              <FileText className="size-4" /> Generate Report
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/authority/map">
                <MapPin className="size-4" /> View Map
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by asset, ward or ID…"
            className="rounded-xl pl-9 sm:w-80"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="all" className="rounded-lg cursor-pointer">
              All ({mapInfrastructure.length})
            </TabsTrigger>
            <TabsTrigger value="roads" className="rounded-lg cursor-pointer">
              Roads
            </TabsTrigger>
            <TabsTrigger value="bridges" className="rounded-lg cursor-pointer">
              Bridges & Flyovers
            </TabsTrigger>
            <TabsTrigger value="water" className="rounded-lg cursor-pointer">
              Water & Drainage
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardContent className="overflow-x-auto p-0 sm:p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="min-w-[130px]">Risk Score</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Complaints</TableHead>
                <TableHead>Last Inspected</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const color = getMarkerColorByScore(a.riskScore);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="block font-semibold text-foreground">{a.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{a.id}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.type}</TableCell>
                    <TableCell
                      className="text-muted-foreground max-w-[200px] truncate"
                      title={a.location}
                    >
                      {a.location.split("·")[0]?.trim() || a.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span style={{ color }}>{a.riskScore}/100</span>
                      </div>
                      <Progress value={a.riskScore} className="h-1.5" />
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={a.priority} />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{a.condition}</TableCell>
                    <TableCell className="tabular-nums text-foreground">{a.complaints}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {a.lastInspection}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-lg cursor-pointer"
                      >
                        <Link to="/authority/infrastructure/$assetId" params={{ assetId: a.id }}>
                          View Details
                        </Link>
                      </Button>
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
