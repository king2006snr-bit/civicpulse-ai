import { useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck,
  ImageIcon,
  MapPin,
  Sparkles,
  User,
  Wrench,
  X,
  ZoomIn,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, SeverityBadge } from "./SeverityBadge";
import type { ExtendedCitizenReport } from "@/lib/reports-store";

interface CitizenReportDossierModalProps {
  report: ExtendedCitizenReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
}

export function CitizenReportDossierModal({
  report,
  open,
  onOpenChange,
  onDelete,
}: CitizenReportDossierModalProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!report) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.id);
    setCopied(true);
    toast.success(`Copied ${report.id} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine stage progression (1 to 5)
  const currentStage =
    report.status === "Resolved"
      ? 5
      : report.status === "Assigned"
        ? 4
        : report.status === "In Review"
          ? 3
          : 2;

  const timelineSteps = [
    {
      title: "Citizen Report Filed",
      desc: `Submitted on ${report.reportedAt}`,
      date: report.reportedAt,
      completed: true,
      icon: User,
    },
    {
      title: "AI Severity & Risk Scored",
      desc: `Analyzed photo & description · Severity: ${report.category || "General"}`,
      date: report.reportedAt,
      completed: currentStage >= 2,
      icon: BrainCircuit,
    },
    {
      title: "Dispatched to Ward Engineers",
      desc: `${report.ward} Public Works queue`,
      date: report.reportedAt,
      completed: currentStage >= 3,
      icon: MapPin,
    },
    {
      title: "Maintenance Crew Assigned",
      desc: report.update || "Field crew scheduled for on-site inspection",
      date:
        report.status === "Assigned" || report.status === "Resolved" ? "In Progress" : "Pending",
      completed: currentStage >= 4,
      icon: Wrench,
    },
    {
      title: "Resolved & Inspected",
      desc:
        report.status === "Resolved"
          ? report.update || "Work completed and certified by Ward engineers."
          : "Final municipal sign-off",
      date: report.status === "Resolved" ? "Completed" : "Awaiting fix",
      completed: currentStage >= 5,
      icon: CheckCircle2,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">{report.id}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy reference ID"
                >
                  <Copy className="size-3" />
                </Button>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">{report.ward}</span>
              </div>
              <DialogTitle className="text-xl font-bold font-display mt-1 text-foreground">
                {report.title}
              </DialogTitle>
            </div>
            <StatusBadge
              status={report.status}
              className="self-start sm:self-auto text-xs px-3 py-1"
            />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Photo & Photo Description if attached */}
          {report.imageUrl && (
            <div className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> Photographic Evidence
              </span>
              <div className="overflow-hidden rounded-xl border border-border bg-black/5">
                <img
                  src={report.imageUrl}
                  alt={report.title}
                  className="max-h-[300px] w-full object-contain mx-auto"
                />
              </div>
              {report.imageDescription && (
                <div className="rounded-xl border border-border/80 bg-card p-3 text-xs">
                  <span className="font-semibold text-foreground block mb-0.5">
                    Photo Description / Observation:
                  </span>
                  <p className="text-muted-foreground">{report.imageDescription}</p>
                </div>
              )}
            </div>
          )}

          {/* Report Problem Information */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-muted-foreground block text-[11px]">Location</span>
              <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary shrink-0" />
                {report.location || report.ward}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-muted-foreground block text-[11px]">Category</span>
              <span className="font-semibold text-foreground text-sm">
                {report.category || "Infrastructure Problem"}
              </span>
            </div>
          </div>

          {report.description && (
            <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-1">
              <span className="font-semibold text-foreground block text-xs">
                Citizen Problem Description:
              </span>
              <p className="text-muted-foreground leading-relaxed text-sm">{report.description}</p>
            </div>
          )}

          {/* Interactive Project Lifecycle Progress & History */}
          <div className="rounded-2xl border border-border bg-surface/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-primary" /> Live Resolution Timeline
              </h4>
              <span className="text-xs text-muted-foreground font-medium">
                Stage {currentStage} of 5
              </span>
            </div>

            <ol className="relative border-l-2 border-primary/25 ml-3 space-y-5">
              {timelineSteps.map((step, idx) => {
                const isCurrent = idx + 1 === currentStage;
                return (
                  <li key={step.title} className="ml-6 relative">
                    <span
                      className={`absolute -left-[31px] grid size-6 place-items-center rounded-full border-2 border-background text-xs ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-teal text-white ring-4 ring-teal/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <step.icon className="size-3" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            step.completed ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {step.date}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Current Authority Update Banner */}
          <div className="rounded-xl border border-teal/30 bg-teal/10 p-3.5 flex items-start gap-2.5 text-xs">
            <Sparkles className="size-4 text-teal mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-foreground block">
                Latest Municipal Response:
              </span>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{report.update}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl cursor-pointer text-xs"
            >
              Close
            </Button>

            {onDelete &&
              (!showConfirmDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmDelete(true)}
                  className="rounded-xl text-xs text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete Report
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 px-2 py-1 rounded-xl">
                  <span className="text-xs text-destructive font-medium">Delete permanently?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onDelete(report.id);
                      onOpenChange(false);
                      toast.success(`Report #${report.id} deleted`);
                    }}
                    className="h-6 text-[11px] px-2 rounded-lg cursor-pointer font-semibold"
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirmDelete(false)}
                    className="h-6 text-[11px] px-2 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
          </div>

          <Button
            type="button"
            onClick={() => {
              toast.info("Status check requested", {
                description: `Requested automated ping for reference ${report.id}.`,
              });
            }}
            variant="secondary"
            className="rounded-xl cursor-pointer text-xs"
          >
            Request Status Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
