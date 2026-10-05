import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  MapPin,
  MessageSquareWarning,
  Search,
  SearchX,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusBadge } from "@/components/civic/SeverityBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getMarkerColorByScore,
  getRiskLevelByScore,
  getRiskRuleByScore,
  riskLevels,
  type MapInfrastructure,
} from "@/lib/map-data";
import { useReports, type ExtendedComplaint } from "@/lib/reports-store";
import { GoogleCityMap } from "@/components/civic/GoogleCityMap";
import { geocodeLocation, type GeocodedLocation } from "@/lib/geocoding";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDasexWATsD8JFvgxQ3fnTL-H7yRJSNr9s";

export type RiskFilter = "All" | "Critical" | "High" | "Medium" | "Low";

const filterOptions: { label: RiskFilter; color?: string; range?: string }[] = [
  { label: "All" },
  { label: "Critical", color: "#dc2626", range: "81–100" },
  { label: "High", color: "#f97316", range: "61–80" },
  { label: "Medium", color: "#eab308", range: "31–60" },
  { label: "Low", color: "#16a34a", range: "0–30" },
];

type MapSearchParams = {
  selected?: string;
  filter?: RiskFilter;
};

export const Route = createFileRoute("/authority/map")({
  validateSearch: (search: Record<string, unknown>): MapSearchParams => {
    return {
      selected: typeof search.selected === "string" ? search.selected : undefined,
      filter: typeof search.filter === "string" ? (search.filter as RiskFilter) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "City Map | CivicPulse AI" },
      {
        name: "description",
        content:
          "Interactive real-time Google Map of every monitored road, bridge, utility, and citizen complaint.",
      },
      { property: "og:title", content: "City Map | CivicPulse AI" },
      {
        property: "og:description",
        content:
          "Interactive real-time Google Map of every monitored road, bridge, utility, and citizen complaint.",
      },
    ],
  }),
  component: CityMapPage,
});

function CityMapPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const urlSelected = searchParams.selected;

  const { infrastructure, complaints, updateComplaintStatus } = useReports();

  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskFilter>(
    searchParams.filter || "All",
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (urlSelected) return urlSelected;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const sel = p.get("selected");
      if (sel) return sel;
    }
    return "INF-001";
  });

  const [detailModalItem, setDetailModalItem] = useState<MapInfrastructure | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 16.5062,
    lng: 80.648,
  });
  const [mapZoom, setMapZoom] = useState<number>(13);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync selectedId and clear filters when urlSelected changes
  useEffect(() => {
    if (urlSelected) {
      setSelectedId(urlSelected);
      setSelectedRiskFilter("All");
    }
  }, [urlSelected]);

  // Close search suggestions on clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Precomputed counts for each risk filter option
  const counts = useMemo(() => {
    return {
      All: infrastructure.length,
      Critical: infrastructure.filter((i) => getRiskLevelByScore(i.riskScore) === "critical")
        .length,
      High: infrastructure.filter((i) => getRiskLevelByScore(i.riskScore) === "high").length,
      Medium: infrastructure.filter((i) => getRiskLevelByScore(i.riskScore) === "medium").length,
      Low: infrastructure.filter((i) => getRiskLevelByScore(i.riskScore) === "low").length,
    };
  }, [infrastructure]);

  // Autocomplete suggestions matching infrastructure or complaints
  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const infraMatches = infrastructure.filter(
      (i) => i.name.toLowerCase().includes(trimmed) || i.id.toLowerCase().includes(trimmed),
    );
    const complaintMatches = complaints.filter(
      (c) =>
        c.title.toLowerCase().includes(trimmed) ||
        c.id.toLowerCase().includes(trimmed) ||
        c.ward.toLowerCase().includes(trimmed),
    );

    return {
      infrastructure: infraMatches.slice(0, 5),
      complaints: complaintMatches.slice(0, 5),
    };
  }, [query, infrastructure, complaints]);

  // Filter items by search input (name) and risk-level filter
  const filteredInfrastructure = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return infrastructure.filter((i) => {
      const level = getRiskLevelByScore(i.riskScore);
      const matchesRisk =
        selectedRiskFilter === "All" || level === selectedRiskFilter.toLowerCase();
      const matchesName = !trimmed || i.name.toLowerCase().includes(trimmed);
      return matchesRisk && matchesName;
    });
  }, [query, selectedRiskFilter, infrastructure]);

  // Select an infrastructure item
  const handleSelectInfrastructure = (item: MapInfrastructure) => {
    const itemLevel = getRiskLevelByScore(item.riskScore);
    if (selectedRiskFilter !== "All" && itemLevel !== selectedRiskFilter.toLowerCase()) {
      setSelectedRiskFilter("All");
    }
    setSelectedId(item.id);
    setMapCenter({ lat: item.latitude, lng: item.longitude });
    setMapZoom(15);
    setQuery(item.name);
    setIsSearchFocused(false);
  };

  // Select a complaint item
  const handleSelectComplaint = (complaint: ExtendedComplaint) => {
    setSelectedId(complaint.id);
    if (typeof complaint.latitude === "number" && typeof complaint.longitude === "number") {
      setMapCenter({ lat: complaint.latitude, lng: complaint.longitude });
      setMapZoom(15);
    }
    setQuery(complaint.title);
    setIsSearchFocused(false);
  };

  // Handle location search query (e.g. "Guntur", "Visakhapatnam", "Hyderabad", "Vijayawada", etc.)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check if it matches an infrastructure asset
    const infraMatch = infrastructure.find(
      (i) =>
        i.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        i.id.toLowerCase() === trimmed.toLowerCase(),
    );
    if (infraMatch) {
      handleSelectInfrastructure(infraMatch);
      return;
    }

    // Check if it matches a complaint
    const complaintMatch = complaints.find(
      (c) =>
        c.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        c.id.toLowerCase() === trimmed.toLowerCase(),
    );
    if (complaintMatch) {
      handleSelectComplaint(complaintMatch);
      return;
    }

    // Geocode place / city name
    const geocoded = await geocodeLocation(trimmed, GOOGLE_MAPS_API_KEY);
    if (geocoded) {
      setMapCenter({ lat: geocoded.lat, lng: geocoded.lng });
      setMapZoom(13);
      setIsSearchFocused(false);
    }
  };

  const handleFilterSelect = (filter: RiskFilter) => {
    setSelectedRiskFilter(filter);
    const trimmed = query.trim().toLowerCase();
    const nextItems = infrastructure.filter((i) => {
      const level = getRiskLevelByScore(i.riskScore);
      const matchesRisk = filter === "All" || level === filter.toLowerCase();
      const matchesName = !trimmed || i.name.toLowerCase().includes(trimmed);
      return matchesRisk && matchesName;
    });

    if (nextItems.length > 0) {
      if (!nextItems.some((i) => i.id === selectedId)) {
        setSelectedId(nextItems[0]!.id);
      }
    }
  };

  // Currently selected item (could be an Infrastructure or a Citizen Complaint)
  const selectedInfra = useMemo(
    () => infrastructure.find((i) => i.id === selectedId || i.assetId === selectedId) ?? null,
    [infrastructure, selectedId],
  );

  const selectedComplaint = useMemo(
    () => complaints.find((c) => c.id === selectedId) ?? null,
    [complaints, selectedId],
  );

  const selectedRule = selectedInfra ? getRiskRuleByScore(selectedInfra.riskScore) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          City Map — Real-Time Infrastructure Risk & Complaints
        </h1>
        <p className="text-sm text-muted-foreground">
          Live Google Maps visualization of monitored urban assets and citizen complaints across any
          city (Vijayawada, Guntur, Visakhapatnam, Hyderabad, and more).
        </p>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Universal Search Input (City, Address, Infrastructure, or Complaint) */}
          <div ref={searchContainerRef} className="relative w-full lg:max-w-md">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search city (Guntur, Hyderabad), asset, or complaint..."
                aria-label="Search city, asset, or complaint"
                className="rounded-xl pl-9 pr-16 text-xs h-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 rounded-lg text-xs px-2.5 cursor-pointer"
              >
                Go
              </Button>
            </form>

            {/* Live Autocomplete Suggestions */}
            {isSearchFocused && query.trim() !== "" && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-border bg-card p-2 shadow-lift backdrop-blur animate-rise max-h-72 overflow-y-auto space-y-2">
                {/* Search city action */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSearchSubmit();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs bg-primary/10 text-primary hover:bg-primary/20 font-semibold cursor-pointer"
                >
                  <Compass className="size-4 shrink-0 text-primary" />
                  <span>Center map on "{query}" via Google Geocoding</span>
                </button>

                {searchResults.infrastructure.length > 0 && (
                  <div>
                    <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Infrastructure Assets
                    </p>
                    {searchResults.infrastructure.map((item) => {
                      const rule = getRiskRuleByScore(item.riskScore);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectInfrastructure(item);
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left text-xs hover:bg-surface cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.type} · {item.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="size-2 rounded-full"
                              style={{ background: rule.color }}
                            />
                            <span className="font-bold tabular-nums" style={{ color: rule.color }}>
                              {item.riskScore}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchResults.complaints.length > 0 && (
                  <div>
                    <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Citizen Complaints ({searchResults.complaints.length})
                    </p>
                    {searchResults.complaints.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectComplaint(c);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left text-xs hover:bg-surface cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block">
                            {c.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            #{c.id} · {c.category} · {c.status}
                          </span>
                        </div>
                        <StatusBadge status={c.status} className="text-[9px] px-1 py-0 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Risk-level filter controls */}
          <div className="flex flex-wrap items-center gap-2" aria-label="Risk-level filters">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Filter:
            </span>
            {filterOptions.map((opt) => {
              const isSelected = selectedRiskFilter === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleFilterSelect(opt.label)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  {opt.color ? (
                    <span
                      className="size-2 rounded-full border border-card shadow-xs shrink-0"
                      style={{ background: opt.color }}
                    />
                  ) : null}
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-surface text-muted-foreground",
                    )}
                  >
                    {counts[opt.label]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Real Google Maps Container for Authority Portal */}
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-card min-h-[500px] lg:min-h-[640px]">
          <GoogleCityMap
            mode="authority"
            className="size-full min-h-[500px] lg:min-h-[640px]"
            initialCenter={mapCenter}
            initialZoom={mapZoom}
            selectedId={selectedId}
            onSelectId={(id) => setSelectedId(id)}
            riskFilter={selectedRiskFilter}
            showInfrastructure={true}
            showComplaints={true}
            onViewDetails={(item) => {
              if ("pastFailures" in item) {
                setDetailModalItem(item);
              }
            }}
            onLocationFound={(loc) => {
              setMapCenter({ lat: loc.lat, lng: loc.lng });
              setMapZoom(13);
            }}
          />
        </div>

        {/* Selected Item Details Card / Inspector (Infrastructure OR Complaint) */}
        <div className="space-y-6">
          {selectedComplaint ? (
            /* Complaint Details Card */
            <Card className="rounded-2xl border-primary/25 shadow-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">
                      Complaint #{selectedComplaint.id}
                    </span>
                    <span className="text-[10px] text-muted-foreground">· Citizen Report</span>
                  </div>
                  <CardTitle className="text-base font-semibold mt-1">
                    {selectedComplaint.title}
                  </CardTitle>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 cursor-pointer"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface/60 p-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Status
                    </span>
                    <div className="mt-1">
                      <StatusBadge status={selectedComplaint.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Priority / Severity
                    </span>
                    <div className="mt-1">
                      <SeverityBadge severity={selectedComplaint.severity} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs rounded-xl bg-surface/70 p-3 border border-border/40">
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Category:</span>
                    <span className="font-semibold text-foreground">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Location:</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[190px]">
                      {selectedComplaint.location || selectedComplaint.ward}
                    </span>
                  </div>
                  {typeof selectedComplaint.latitude === "number" &&
                    typeof selectedComplaint.longitude === "number" && (
                      <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">GPS Coordinates:</span>
                        <span className="font-mono text-foreground text-[10px]">
                          {selectedComplaint.latitude.toFixed(4)}° N,{" "}
                          {selectedComplaint.longitude.toFixed(4)}° E
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Citizen:</span>
                    <span className="font-medium text-foreground">{selectedComplaint.citizen}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-muted-foreground font-medium">Reported Date:</span>
                    <span className="font-medium text-foreground">
                      {selectedComplaint.reportedAt}
                    </span>
                  </div>
                </div>

                {selectedComplaint.description && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Description
                    </span>
                    <p className="text-xs text-foreground bg-surface/60 rounded-xl p-2.5 border border-border/50 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>
                )}

                {/* Real-time status update buttons */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Update Complaint Status (Real-Time)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedComplaint.status === "In Review" ? "default" : "outline"}
                      onClick={() => updateComplaintStatus(selectedComplaint.id, "In Review")}
                      className="text-xs rounded-xl h-8 cursor-pointer"
                    >
                      In Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedComplaint.status === "Assigned" ? "default" : "outline"}
                      onClick={() => updateComplaintStatus(selectedComplaint.id, "Assigned")}
                      className="text-xs rounded-xl h-8 cursor-pointer text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      Assign
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedComplaint.status === "Resolved" ? "default" : "outline"}
                      onClick={() => updateComplaintStatus(selectedComplaint.id, "Resolved")}
                      className="text-xs rounded-xl h-8 cursor-pointer text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedInfra && selectedRule ? (
            /* Infrastructure Details Card */
            <Card className="rounded-2xl border-primary/25 shadow-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">{selectedInfra.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedInfra.id} · {selectedInfra.type}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 cursor-pointer"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface/60 p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-display text-4xl font-semibold tabular-nums"
                      style={{ color: selectedRule.color }}
                    >
                      {selectedInfra.riskScore}
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                        Risk score / 100
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: selectedRule.color }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: selectedRule.color }}
                        >
                          {selectedRule.label} ({selectedRule.colorName})
                        </span>
                      </div>
                    </div>
                  </div>
                  <SeverityBadge severity={selectedInfra.priority} />
                </div>

                <div className="space-y-2 text-xs rounded-xl bg-surface/70 p-3 border border-border/40">
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Location:</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[190px]">
                      {selectedInfra.location.split("·")[0]?.trim()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">GPS:</span>
                    <span className="font-mono text-foreground text-[10px]">
                      {selectedInfra.latitude.toFixed(4)}° N, {selectedInfra.longitude.toFixed(4)}°
                      E
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Physical Condition:</span>
                    <span className="font-semibold text-foreground">{selectedInfra.condition}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Active Complaints:</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {selectedInfra.complaints} reports
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Traffic Density:</span>
                    <span className="font-medium text-foreground">{selectedInfra.traffic}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-muted-foreground font-medium">Structure Age:</span>
                    <span className="font-medium text-foreground">{selectedInfra.age} years</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    AI Maintenance Prescription
                  </span>
                  <p className="text-xs text-foreground bg-accent/30 rounded-xl p-2.5 border border-primary/20 leading-relaxed">
                    {selectedInfra.aiRecommendation}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button asChild className="w-full rounded-xl text-xs">
                    <Link
                      to="/authority/infrastructure/$assetId"
                      params={{ assetId: selectedInfra.id }}
                    >
                      <span>Open Full Asset Dossier</span>
                      <ArrowRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetailModalItem(selectedInfra)}
                    className="w-full rounded-xl text-xs cursor-pointer"
                  >
                    Quick Specs Modal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Selection Default Guidance Card */
            <Card className="rounded-2xl border-border/70 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Map Inspector</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Click any marker or search any location to view monitored status.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Compass className="size-3.5 text-primary" /> Multi-City Navigation
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The map supports any place in India and globally. Search{" "}
                    <strong>Vijayawada</strong>, <strong>Guntur</strong>,{" "}
                    <strong>Visakhapatnam</strong>, <strong>Hyderabad</strong>, or any custom
                    address to view infrastructure and citizen reports.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-foreground text-xs">Summary Metrics:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border p-2.5 bg-card">
                      <span className="text-muted-foreground text-[11px]">Infrastructure</span>
                      <span className="block text-lg font-bold text-foreground">
                        {infrastructure.length}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border p-2.5 bg-card">
                      <span className="text-muted-foreground text-[11px]">Complaints</span>
                      <span className="block text-lg font-bold text-foreground">
                        {complaints.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Infrastructure Quick List */}
          <Card className="rounded-2xl border-border/70 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Priority Assets ({filteredInfrastructure.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredInfrastructure.slice(0, 6).map((item) => {
                const rule = getRiskRuleByScore(item.riskScore);
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectInfrastructure(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl p-2.5 text-left text-xs transition-colors border cursor-pointer",
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 hover:bg-surface",
                    )}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground truncate block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.type} · {item.complaints} complaints
                      </span>
                    </div>
                    <span
                      className="font-bold tabular-nums text-sm shrink-0"
                      style={{ color: rule.color }}
                    >
                      {item.riskScore}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Details Modal */}
      <Dialog open={!!detailModalItem} onOpenChange={(open) => !open && setDetailModalItem(null)}>
        {detailModalItem && (
          <DialogContent className="max-w-lg rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold font-display">
                  {detailModalItem.name}
                </DialogTitle>
                <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {detailModalItem.type}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Asset ID: {detailModalItem.id} · GPS Coordinates:{" "}
                {detailModalItem.latitude.toFixed(4)}° N, {detailModalItem.longitude.toFixed(4)}° E
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Risk Assessment
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="font-display text-3xl font-bold tabular-nums"
                      style={{ color: getMarkerColorByScore(detailModalItem.riskScore) }}
                    >
                      {detailModalItem.riskScore}/100
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: getMarkerColorByScore(detailModalItem.riskScore) }}
                    >
                      {getRiskRuleByScore(detailModalItem.riskScore).label} (
                      {getRiskRuleByScore(detailModalItem.riskScore).colorName})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Priority Tier
                  </div>
                  <SeverityBadge
                    severity={detailModalItem.priority}
                    className="text-xs px-2.5 py-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-muted-foreground font-medium block">
                    Citizen Complaints
                  </span>
                  <span className="text-base font-bold text-foreground mt-0.5 block tabular-nums">
                    {detailModalItem.complaints} reports
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-muted-foreground font-medium block">
                    Physical Condition
                  </span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    {detailModalItem.condition}
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-muted-foreground font-medium block">Traffic Density</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    {detailModalItem.traffic}
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-muted-foreground font-medium block">
                    Infrastructure Age
                  </span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    {detailModalItem.age} years
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button asChild className="rounded-xl">
                <Link
                  to="/authority/infrastructure/$assetId"
                  params={{ assetId: detailModalItem.id }}
                >
                  Open Full Asset Record
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-xl cursor-pointer"
                onClick={() => setDetailModalItem(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
