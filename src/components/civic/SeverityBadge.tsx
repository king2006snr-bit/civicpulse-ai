import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/mock-data";
import { CheckCircle2, Clock, Wrench, AlertCircle } from "lucide-react";

const severityStyles: Record<Severity, string> = {
  critical: "bg-destructive/12 text-destructive border-destructive/25",
  high: "bg-warning/18 text-warning-foreground border-warning/35",
  medium: "bg-accent text-accent-foreground border-primary/20",
  low: "bg-success/14 text-success border-success/30",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity | string;
  className?: string;
}) {
  const norm = (severity?.toLowerCase() || "low") as Severity;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full capitalize",
        severityStyles[norm] ?? severityStyles["low"],
        className,
      )}
    >
      {severity}
    </Badge>
  );
}

export type CitizenReportStatus =
  "New" | "Pending" | "In Review" | "Assigned" | "In Progress" | "Resolved";

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  pulseDot?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}

const statusConfigs: Record<string, StatusConfig> = {
  New: {
    label: "Pending",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
    pulseDot: true,
    Icon: Clock,
  },
  Pending: {
    label: "Pending",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
    pulseDot: true,
    Icon: Clock,
  },
  "In Review": {
    label: "In Review",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotClass: "bg-purple-500",
    pulseDot: true,
    Icon: AlertCircle,
  },
  Assigned: {
    label: "In Progress",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dotClass: "bg-sky-500",
    pulseDot: true,
    Icon: Wrench,
  },
  "In Progress": {
    label: "In Progress",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dotClass: "bg-sky-500",
    pulseDot: true,
    Icon: Wrench,
  },
  Resolved: {
    label: "Resolved",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-500",
    pulseDot: false,
    Icon: CheckCircle2,
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
  displayRawLabel = false,
}: {
  status: string;
  className?: string;
  showIcon?: boolean;
  displayRawLabel?: boolean;
}) {
  const config = statusConfigs[status] ?? statusConfigs["New"]!;
  const Icon = config.Icon;
  const label = displayRawLabel ? status : config.label;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs",
        config.badgeClass,
        className,
      )}
    >
      <span className="relative flex size-2 items-center justify-center">
        {config.pulseDot && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              config.dotClass,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", config.dotClass)} />
      </span>
      {showIcon && <Icon className="size-3 shrink-0 opacity-80" />}
      <span>{label}</span>
    </Badge>
  );
}
