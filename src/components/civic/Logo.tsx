import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl civic-gradient text-primary-foreground shadow-card">
        <Activity className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-semibold leading-tight">
          CivicPulse<span className="text-primary"> AI</span>
        </span>
        <span className="block truncate text-[11px] uppercase tracking-wider text-muted-foreground">
          Urban infrastructure intelligence
        </span>
      </span>
    </span>
  );
}
