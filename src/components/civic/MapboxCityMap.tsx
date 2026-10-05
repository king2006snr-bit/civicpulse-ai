import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowRight, SearchX, X } from "lucide-react";
import { SeverityBadge } from "@/components/civic/SeverityBadge";
import { getMarkerColorByScore, getRiskRuleByScore, type MapInfrastructure } from "@/lib/map-data";
import { cn } from "@/lib/utils";

function createRiskScoreElement(score: number, color: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "inline-flex items-center gap-1.5 font-bold tabular-nums";
  span.style.color = color;
  span.innerHTML = `<span class="size-2 rounded-full inline-block" style="background:${color}"></span> ${score}/100`;
  return span;
}

function createPriorityBadgeElement(priority: string): HTMLElement {
  const span = document.createElement("span");
  const p = priority.toLowerCase();
  let badgeStyles =
    "background: rgba(148, 163, 184, 0.15); color: #334155; border: 1px solid rgba(148, 163, 184, 0.3);";
  if (p === "critical") {
    badgeStyles =
      "background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3);";
  } else if (p === "high") {
    badgeStyles =
      "background: rgba(249, 115, 22, 0.15); color: #ea580c; border: 1px solid rgba(249, 115, 22, 0.3);";
  } else if (p === "medium") {
    badgeStyles =
      "background: rgba(234, 179, 8, 0.15); color: #ca8a04; border: 1px solid rgba(234, 179, 8, 0.3);";
  } else if (p === "low") {
    badgeStyles =
      "background: rgba(22, 163, 74, 0.15); color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.3);";
  }

  span.className = "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize inline-block";
  span.style.cssText = badgeStyles;
  span.textContent = priority;
  return span;
}

function createPopupDOM(
  item: MapInfrastructure,
  onClose: () => void,
  onViewDetails: () => void,
): HTMLElement {
  const rule = getRiskRuleByScore(item.riskScore);
  const root = document.createElement("div");
  root.className =
    "civic-popup-card rounded-2xl border border-border bg-card p-4 text-foreground shadow-lift w-[285px] sm:w-[310px]";

  // Header row
  const header = document.createElement("div");
  header.className = "flex items-start justify-between gap-2 border-b border-border/70 pb-2.5 mb-3";

  const titleWrap = document.createElement("div");
  titleWrap.className = "min-w-0";

  const nameEl = document.createElement("h3");
  nameEl.className =
    "font-display text-base font-semibold tracking-tight text-foreground truncate leading-tight";
  nameEl.textContent = item.name;

  const typeBadge = document.createElement("span");
  typeBadge.className =
    "inline-block mt-1 rounded-full bg-surface border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground";
  typeBadge.textContent = item.type;

  titleWrap.appendChild(nameEl);
  titleWrap.appendChild(typeBadge);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className =
    "rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors cursor-pointer shrink-0";
  closeBtn.setAttribute("aria-label", "Close popup");
  closeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    onClose();
  };

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);
  root.appendChild(header);

  // Content specifications list
  const list = document.createElement("div");
  list.className = "space-y-1.5 text-xs";

  const rows: [string, string | HTMLElement][] = [
    ["Risk Score:", createRiskScoreElement(item.riskScore, rule.color)],
    ["Priority:", createPriorityBadgeElement(item.priority)],
    ["Complaints:", String(item.complaints)],
    ["Condition:", item.condition],
    ["Traffic:", item.traffic],
    ["Age:", `${item.age} years`],
    ["Past Failures:", String(item.pastFailures)],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between py-0.5 border-b border-border/30 last:border-0";
    const dt = document.createElement("span");
    dt.className = "text-muted-foreground font-medium";
    dt.textContent = label;
    const dd = document.createElement("span");
    dd.className = "font-semibold text-foreground text-right";
    if (typeof value === "string") {
      dd.textContent = value;
    } else {
      dd.appendChild(value);
    }
    row.appendChild(dt);
    row.appendChild(dd);
    list.appendChild(row);
  });

  root.appendChild(list);

  // View Details action button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer";
  btn.innerHTML = `<span>View Details</span> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    onViewDetails();
  };

  root.appendChild(btn);
  return root;
}

export default function MapboxCityMap({
  items,
  selectedId,
  onSelect,
  onViewDetails,
}: {
  items: MapInfrastructure[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onViewDetails?: (item: MapInfrastructure) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map());
  const activePopup = useRef<mapboxgl.Popup | null>(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onViewDetailsRef = useRef(onViewDetails);
  onViewDetailsRef.current = onViewDetails;

  const [hasMapbox, setHasMapbox] = useState<boolean | null>(null);

  useEffect(() => {
    const token =
      (import.meta.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"] as string | undefined) ||
      (import.meta.env["VITE_MAPBOX_TOKEN"] as string | undefined);

    if (!container.current || !token) {
      setHasMapbox(false);
      return;
    }

    try {
      mapboxgl.accessToken = token;
      const m = new mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [80.648, 16.5062],
        zoom: 12.8,
      });

      m.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
      m.addControl(new mapboxgl.ScaleControl(), "bottom-right");

      m.on("load", () => {
        setHasMapbox(true);
      });

      m.on("error", () => {
        setHasMapbox(false);
      });

      // Clicking map canvas deselects active popup
      m.on("click", (e) => {
        const target = e.originalEvent.target as HTMLElement;
        if (target && !target.closest(".civic-marker") && !target.closest(".civic-popup-card")) {
          onSelectRef.current(null);
        }
      });

      map.current = m;

      const currentMarkers = markers.current;
      return () => {
        if (activePopup.current) {
          activePopup.current.remove();
          activePopup.current = null;
        }
        currentMarkers.clear();
        m.remove();
        map.current = null;
      };
    } catch {
      setHasMapbox(false);
    }
  }, []);

  // Sync markers with filtered items — each marker is clickable and auto-colored
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const keep = new Set(items.map((i) => i.id));
    for (const [id, { marker }] of markers.current) {
      if (!keep.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    for (const item of items) {
      if (markers.current.has(item.id)) continue;
      const el = document.createElement("div");
      el.className = "civic-marker";
      // Marker color is automatically determined from riskScore
      const markerColor = getMarkerColorByScore(item.riskScore);
      const rule = getRiskRuleByScore(item.riskScore);
      el.style.setProperty("--marker", markerColor);
      el.setAttribute("role", "button");
      el.setAttribute(
        "aria-label",
        `${item.name}, risk ${item.riskScore} (${rule.label}, ${rule.colorName})`,
      );
      el.title = `${item.name} · Risk ${item.riskScore} (${rule.label} - ${rule.colorName}) · Click to inspect`;

      // Marker click opens popup with actual infrastructure data
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(item.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([item.longitude, item.latitude])
        .addTo(m);
      markers.current.set(item.id, { marker, el });
    }
  }, [items]);

  // Handle selection state, centering, zooming into location, and opening marker popup
  useEffect(() => {
    for (const [id, { el }] of markers.current) {
      el.classList.toggle("is-selected", id === selectedId);
    }

    const item = items.find((i) => i.id === selectedId);

    if (map.current) {
      if (item) {
        // 1. Center map on it
        // 2. Zoom into its location (zoom 14.5 for high-detail view)
        map.current.flyTo({
          center: [item.longitude, item.latitude],
          zoom: 14.5,
          speed: 1.3,
          essential: true,
        });

        // 3. Highlight and open its marker popup displaying actual data
        if (!activePopup.current) {
          activePopup.current = new mapboxgl.Popup({
            offset: [0, -14],
            closeButton: false,
            closeOnClick: false,
            className: "civic-mapbox-popup",
            maxWidth: "340px",
          });
        }

        const popupDOM = createPopupDOM(
          item,
          () => onSelectRef.current(null),
          () => onViewDetailsRef.current?.(item),
        );

        activePopup.current
          .setLngLat([item.longitude, item.latitude])
          .setDOMContent(popupDOM)
          .addTo(map.current);
      } else if (activePopup.current) {
        activePopup.current.remove();
        activePopup.current = null;
      }
    }
  }, [selectedId, items]);

  // Projected positions for fallback vector map if WebGL/Token is unavailable
  const fallbackPoints = useMemo(() => {
    if (items.length === 0) return [];
    const minLat = 12.915;
    const maxLat = 13.015;
    const minLng = 77.56;
    const maxLng = 77.695;

    return items.map((item) => {
      const x = ((item.longitude - minLng) / (maxLng - minLng)) * 88 + 6;
      const y = ((maxLat - item.latitude) / (maxLat - minLat)) * 84 + 8;
      return { ...item, x: Math.max(4, Math.min(96, x)), y: Math.max(6, Math.min(94, y)) };
    });
  }, [items]);

  const selectedFallbackItem = useMemo(
    () => fallbackPoints.find((i) => i.id === selectedId) ?? null,
    [fallbackPoints, selectedId],
  );

  return (
    <div className="relative size-full">
      <div ref={container} className="size-full" />

      {/* Empty State when no items match */}
      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-lift backdrop-blur">
            <SearchX className="size-5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">No infrastructure found.</span>
          </div>
        </div>
      )}

      {hasMapbox === false && (
        <div
          className="absolute inset-0 flex flex-col overflow-hidden bg-surface civic-hero-grid"
          onClick={() => onSelect(null)}
        >
          {/* Zoomable vector container centered on selected item */}
          <div
            className="size-full transition-transform duration-500 ease-out"
            style={{
              transform: selectedFallbackItem ? "scale(1.25)" : "scale(1)",
              transformOrigin: selectedFallbackItem
                ? `${selectedFallbackItem.x}% ${selectedFallbackItem.y}%`
                : "50% 50%",
            }}
          >
            {/* Subtle civic road grid lines */}
            <svg
              className="absolute inset-0 size-full pointer-events-none opacity-40"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M0 25 L100 28" stroke="var(--color-border)" strokeWidth="1.2" fill="none" />
              <path d="M0 52 L100 50" stroke="var(--color-border)" strokeWidth="1.6" fill="none" />
              <path d="M0 76 L100 72" stroke="var(--color-border)" strokeWidth="1.2" fill="none" />
              <path d="M24 0 L28 100" stroke="var(--color-border)" strokeWidth="1.2" fill="none" />
              <path d="M50 0 L48 100" stroke="var(--color-border)" strokeWidth="1.6" fill="none" />
              <path d="M78 0 L74 100" stroke="var(--color-border)" strokeWidth="1.2" fill="none" />
              <path
                d="M10 90 C35 75, 65 92, 95 80"
                stroke="var(--color-teal)"
                strokeWidth="2.5"
                fill="none"
                opacity="0.35"
              />
            </svg>

            {/* Interactive infrastructure location markers plotted by geographic coordinates */}
            {fallbackPoints.map((item) => {
              const isSelected = item.id === selectedId;
              const markerColor = getMarkerColorByScore(item.riskScore);
              const rule = getRiskRuleByScore(item.riskScore);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item.id);
                  }}
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  className={cn(
                    "group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 focus:outline-none z-10 cursor-pointer",
                    isSelected && "scale-125 z-20",
                  )}
                  aria-label={`${item.name}, risk ${item.riskScore} (${rule.label}, ${rule.colorName})`}
                >
                  <span className="relative grid place-items-center">
                    <span
                      className={cn(
                        "absolute size-7 animate-pulse rounded-full opacity-35",
                        isSelected && "opacity-60 scale-125",
                      )}
                      style={{ background: markerColor }}
                    />
                    <span
                      className="size-4 rounded-full border-2 border-card shadow-card transition-all group-hover:scale-110"
                      style={{ background: markerColor }}
                    />
                  </span>

                  <span
                    className={cn(
                      "pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card/95 px-2.5 py-1 text-xs shadow-card backdrop-blur transition-opacity",
                      isSelected ? "opacity-0" : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      ({item.latitude.toFixed(3)}, {item.longitude.toFixed(3)})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fallback Popup displaying the selected infrastructure's actual data */}
          {selectedFallbackItem && (
            <div
              style={{
                left: `${Math.min(74, Math.max(26, selectedFallbackItem.x))}%`,
                top: `${Math.min(70, Math.max(28, selectedFallbackItem.y))}%`,
              }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 z-40 w-[285px] sm:w-[310px] rounded-2xl border border-border bg-card p-4 text-foreground shadow-lift animate-rise"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5 mb-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold tracking-tight text-foreground truncate leading-tight">
                    {selectedFallbackItem.name}
                  </h3>
                  <span className="inline-block mt-1 rounded-full bg-surface border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {selectedFallbackItem.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors cursor-pointer shrink-0"
                  aria-label="Close popup"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Risk Score:</span>
                  <span
                    className="inline-flex items-center gap-1.5 font-bold tabular-nums"
                    style={{ color: getMarkerColorByScore(selectedFallbackItem.riskScore) }}
                  >
                    <span
                      className="size-2 rounded-full inline-block"
                      style={{ background: getMarkerColorByScore(selectedFallbackItem.riskScore) }}
                    />
                    {selectedFallbackItem.riskScore}/100
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Priority:</span>
                  <SeverityBadge
                    severity={selectedFallbackItem.priority}
                    className="text-[10px] px-2 py-0.5"
                  />
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Complaints:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {selectedFallbackItem.complaints}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Condition:</span>
                  <span className="font-semibold text-foreground">
                    {selectedFallbackItem.condition}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Traffic:</span>
                  <span className="font-semibold text-foreground">
                    {selectedFallbackItem.traffic}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Age:</span>
                  <span className="font-semibold text-foreground">
                    {selectedFallbackItem.age} years
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground font-medium">Past Failures:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {selectedFallbackItem.pastFailures}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onViewDetailsRef.current?.(selectedFallbackItem)}
                className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="size-2 rounded-full bg-teal animate-pulse" />
            <span>Vijayawada Infrastructure Grid · Real-time coordinates</span>
          </div>
        </div>
      )}
    </div>
  );
}
