import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  ImageIcon,
  Search,
  Wrench,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/civic/PageHeader";
import { StatCard } from "@/components/civic/StatCard";
import { SeverityBadge, StatusBadge } from "@/components/civic/SeverityBadge";
import { useReports, type ExtendedComplaint } from "@/lib/reports-store";

export const Route = createFileRoute("/authority/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints & Grievances — CivicPulse AI" },
      {
        name: "description",
        content:
          "Triage citizen complaints with AI severity scoring, linked assets and assignment status.",
      },
      { property: "og:title", content: "Complaints & Grievances — CivicPulse AI" },
      {
        property: "og:description",
        content: "Every citizen complaint, scored and linked to the asset it affects.",
      },
    ],
  }),
  component: ComplaintsPage,
});

function ComplaintsPage() {
  const { complaints, stats, updateComplaintStatus } = useReports();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("any");

  // Selected complaint for full inspection dialog
  const [inspecting, setInspecting] = useState<ExtendedComplaint | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesWard = c.ward.toLowerCase().includes(q);
        const matchesCat = c.category.toLowerCase().includes(q);
        const matchesCitizen = c.citizen.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesWard && !matchesCat && !matchesCitizen) {
          return false;
        }
      }

      if (statusFilter !== "all") {
        if (statusFilter === "new" && c.status !== "New") return false;
        if (statusFilter === "review" && c.status !== "In Review") return false;
        if (statusFilter === "assigned" && c.status !== "Assigned") return false;
        if (statusFilter === "progress" && c.status !== "In Progress") return false;
        if (statusFilter === "resolved" && c.status !== "Resolved") return false;
      }

      if (severityFilter !== "any") {
        if (c.severity !== severityFilter) return false;
      }

      return true;
    });
  }, [complaints, search, statusFilter, severityFilter]);

  const handleQuickResolve = (id: string, title: string) => {
    updateComplaintStatus(
      id,
      "Resolved",
      "Problem resolved by Ward maintenance crew. Work verified.",
    );
    toast.success(`Complaint #${id} solved`, {
      description: `"${title}" has been marked as Resolved. Live changes reflect immediately on all dashboards.`,
    });
  };

  const handleStatusChange = (
    id: string,
    newStatus: "New" | "In Review" | "Assigned" | "Resolved",
  ) => {
    updateComplaintStatus(id, newStatus);
    toast.success(`Status updated for #${id}`, {
      description: `New status "${newStatus}" registered. Changes reflected across dashboards.`,
    });
  };

  const handleModalResolve = () => {
    if (!inspecting) return;
    updateComplaintStatus(
      inspecting.id,
      "Resolved",
      resolutionNote.trim() || "Problem resolved and verified by Ward engineering unit.",
    );
    toast.success(`Complaint #${inspecting.id} resolved`, {
      description: "Marked as solved. Verified audit trail saved to records.",
    });
    setInspecting(null);
    setResolutionNote("");
  };

  return (
    <>
      <PageHeader
        title="Complaints & Grievances"
        description="Citizen submissions grouped by asset, ranked by AI severity, with real-time status dispatch and resolution tracking."
        actions={
          <Button
            className="rounded-xl cursor-pointer"
            onClick={() =>
              toast.success("Complaints dispatched", {
                description:
                  "Batch assigned open complaints to corresponding ward maintenance crews.",
              })
            }
          >
            Bulk assign
          </Button>
        }
      />

      {/* Real-time statistics derived from reactive store */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New today" value={String(stats.newComplaints)} />
        <StatCard label="In review" value={String(stats.inProgressComplaints)} />
        <StatCard label="Total in queue" value={String(stats.totalComplaints)} />
        <StatCard
          label="Resolved"
          value={String(stats.resolvedComplaints)}
          delta="Real-time synchronized"
          trend="up"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search complaints, wards, or IDs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl pl-9 sm:w-72"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="review">In review</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardContent className="overflow-x-auto p-0 sm:p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Complaint</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status & Quick Action</TableHead>
                <TableHead>AI Confidence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((c) => (
                  <TableRow key={c.id} className="transition-colors hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-start gap-2.5">
                        {c.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setInspecting(c)}
                            className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border hover:opacity-85 cursor-pointer mt-0.5 group"
                            title="View attached photo"
                          >
                            <img
                              src={c.imageUrl}
                              alt={c.title}
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                              <ZoomIn className="size-3 text-white" />
                            </div>
                          </button>
                        )}
                        <div>
                          <span className="block font-semibold text-foreground text-sm">
                            {c.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.id} · {c.citizen} · {c.reportedAt}
                          </span>
                          {c.imageUrl && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                              <ImageIcon className="size-3" /> Photo Attached
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {c.ward}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.category}</TableCell>
                    <TableCell>
                      <SeverityBadge severity={c.severity} />
                    </TableCell>
                    <TableCell>
                      {/* Direct Live Status Selector */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={c.status}
                          onValueChange={(val) =>
                            handleStatusChange(
                              c.id,
                              val as "New" | "In Review" | "Assigned" | "Resolved",
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="In Review">In Review</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Quick 1-click solve button if not resolved */}
                        {c.status !== "Resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickResolve(c.id, c.title)}
                            className="h-8 px-2.5 rounded-lg text-xs text-success border-success/40 bg-success/5 hover:bg-success/15 cursor-pointer"
                            title="Mark problem as Solved"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Solve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-xs">
                      {c.aiConfidence}%
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspecting(c)}
                          className="h-8 rounded-lg text-xs cursor-pointer"
                        >
                          <Eye className="size-3.5 mr-1" /> Details
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                        >
                          <Link
                            to="/authority/infrastructure/$assetId"
                            params={{ assetId: c.assetId }}
                          >
                            {c.assetId}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No complaints match current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Complaint Inspection Modal with Photo, Photo Description, and Problem Solver */}
      <Dialog open={Boolean(inspecting)} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold font-display">
                {inspecting?.title}
              </DialogTitle>
              {inspecting?.status && <StatusBadge status={inspecting.status} />}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Reference #{inspecting?.id} · Reported on {inspecting?.reportedAt} by{" "}
              {inspecting?.citizen}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Attached Photo and Description if present */}
            {inspecting?.imageUrl && (
              <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <ImageIcon className="size-3.5 text-primary" /> Citizen Uploaded Image
                </span>
                <div className="overflow-hidden rounded-lg border border-border bg-black/5">
                  <img
                    src={inspecting.imageUrl}
                    alt={inspecting.title}
                    className="max-h-[260px] w-full object-contain mx-auto"
                  />
                </div>
                {inspecting.imageDescription && (
                  <div className="rounded-lg bg-card p-2.5 border border-border/80">
                    <span className="font-semibold text-foreground block text-[11px]">
                      Photo Description:
                    </span>
                    <p className="text-muted-foreground mt-0.5">{inspecting.imageDescription}</p>
                  </div>
                )}
              </div>
            )}

            {/* Problem Details */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-3 text-muted-foreground">
              <div>
                Location:{" "}
                <span className="text-foreground font-medium">
                  {inspecting?.location || inspecting?.ward}
                </span>
              </div>
              <div>
                Category:{" "}
                <span className="text-foreground font-medium">{inspecting?.category}</span>
              </div>
              <div>
                Severity:{" "}
                <span className="text-foreground font-medium uppercase">
                  {inspecting?.severity}
                </span>
              </div>
              <div>
                AI Confidence:{" "}
                <span className="text-foreground font-medium">{inspecting?.aiConfidence}%</span>
              </div>
            </div>

            {inspecting?.description && (
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="font-semibold text-foreground block mb-1">
                  Citizen Problem Description:
                </span>
                <p className="text-muted-foreground leading-relaxed">{inspecting.description}</p>
              </div>
            )}

            {/* Solve Problem Action */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 space-y-2">
              <span className="font-semibold text-success flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="size-3.5" /> Municipal Resolution Dispatch
              </span>
              <p className="text-muted-foreground text-[11px]">
                Marking this problem as Resolved updates the city risk queue, citizen dashboard, and
                infrastructure telemetry in real time.
              </p>
              <div className="space-y-1">
                <Label htmlFor="res-note" className="text-[11px] font-medium text-foreground">
                  Official Resolution Note (optional)
                </Label>
                <Textarea
                  id="res-note"
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Asphalt patch applied, drainage cleared and certified by Ward 15 crew"
                  className="rounded-xl text-xs bg-card"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInspecting(null)}
              className="rounded-xl cursor-pointer"
            >
              Close
            </Button>
            <div className="flex items-center gap-2">
              {inspecting?.status !== "Resolved" ? (
                <Button
                  type="button"
                  onClick={handleModalResolve}
                  className="rounded-xl bg-success text-success-foreground hover:bg-success/90 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="size-4 mr-1.5" /> Mark as Solved / Resolved
                </Button>
              ) : (
                <Badge className="bg-success text-success-foreground px-3 py-1 text-xs">
                  Already Solved
                </Badge>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
