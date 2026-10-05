import { Link } from "@tanstack/react-router";
import { assets } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { getMarkerColorByScore, getRiskRuleByScore, riskLevels } from "@/lib/map-data";

export function CityMap({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface civic-hero-grid",
        className,
      )}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 30 L100 36" stroke="var(--color-border)" strokeWidth="1.4" fill="none" />
        <path d="M0 68 L100 60" stroke="var(--color-border)" strokeWidth="1.4" fill="none" />
        <path d="M28 0 L34 100" stroke="var(--color-border)" strokeWidth="1.4" fill="none" />
        <path d="M70 0 L64 100" stroke="var(--color-border)" strokeWidth="1.4" fill="none" />
        <path
          d="M0 88 C25 78, 55 96, 100 82"
          stroke="var(--color-teal)"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
      </svg>

      {assets.map((a) => {
        // Marker color is automatically determined from riskScore
        const rule = getRiskRuleByScore(a.riskScore);
        const markerColor = rule.color;

        return (
          <Link
            key={a.id}
            to="/authority/infrastructure/$assetId"
            params={{ assetId: a.id }}
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            aria-label={`${a.name}, risk ${a.riskScore} (${rule.label} - ${rule.colorName})`}
          >
            <span className="relative grid place-items-center">
              <span
                className="absolute size-7 animate-pulse rounded-full opacity-35"
                style={{ background: markerColor }}
              />
              <span
                className="size-3.5 rounded-full border-2 border-card shadow-card transition-transform group-hover:scale-125"
                style={{ background: markerColor }}
              />
            </span>
            <span className="pointer-events-none absolute left-5 top-0 z-30 hidden w-52 rounded-xl border border-border bg-card p-3 text-left shadow-lift group-hover:block">
              <span className="block truncate text-xs font-semibold text-foreground">{a.name}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{a.ward}</span>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-medium" style={{ color: markerColor }}>
                  Risk {a.riskScore} · {rule.label} ({rule.colorName})
                </span>
                <span className="text-muted-foreground">Health {a.healthScore}%</span>
              </div>
            </span>
          </Link>
        );
      })}

      {/* Map legend synchronized with reusable risk score rules */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/95 px-3 py-2 text-[11px] font-medium shadow-card backdrop-blur">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5">
          Risk score:
        </span>
        {riskLevels.map((r) => (
          <span key={r.level} className="flex items-center gap-1.5 text-foreground">
            <span
              className="size-2.5 rounded-full border border-card shadow-sm"
              style={{ background: r.color }}
            />
            <span>{r.label}</span>
            <span className="text-muted-foreground tabular-nums">({r.range})</span>
            <span className="text-[10px] font-semibold" style={{ color: r.color }}>
              {r.colorName}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
