import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {delta ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-muted-foreground",
              )}
            >
              {delta}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <Icon className="size-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
