import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  Filter,
  Info,
  Layers,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SeverityBadge, StatusBadge } from "./SeverityBadge";
import {
  getMarkerColorByScore,
  getRiskRuleByScore,
  riskLevels,
  type MapInfrastructure,
} from "@/lib/map-data";
import { useReports, type ExtendedComplaint } from "@/lib/reports-store";
import { geocodeLocation, reverseGeocodeCoords, type GeocodedLocation } from "@/lib/geocoding";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDasexWATsD8JFvgxQ3fnTL-H7yRJSNr9s";

export interface GoogleCityMapProps {
  className?: string;
  onSelectIssueForReport?: (
    issueName: string,
    location: string,
    lat?: number,
    lng?: number,
  ) => void;
  mode?: "citizen" | "authority";
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  onViewDetails?: (item: MapInfrastructure | ExtendedComplaint) => void;
  userLocation?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number; address?: string }) => void;
  showInfrastructure?: boolean;
  showComplaints?: boolean;
  riskFilter?: string;
  enableSearch?: boolean;
  onLocationFound?: (loc: GeocodedLocation) => void;
}

/**
 * Controller subcomponent to dynamically pan & zoom the Google Map instance
 */
function MapCameraController({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    if (typeof zoom === "number") {
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  return null;
}

/**
 * Click handler subcomponent to capture map click events
 */
function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (coords: { lat: number; lng: number; address?: string }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onMapClick) return;

    const listener = map.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const address = await reverseGeocodeCoords(lat, lng, GOOGLE_MAPS_API_KEY);
      onMapClick({ lat, lng, address });
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  return null;
}

export function GoogleCityMap({
  className,
  onSelectIssueForReport,
  mode = "citizen",
  initialCenter,
  initialZoom = 13,
  selectedId,
  onSelectId,
  onViewDetails,
  userLocation,
  onMapClick,
  showInfrastructure = true,
  showComplaints = true,
  riskFilter = "All",
  enableSearch = true,
  onLocationFound,
}: GoogleCityMapProps) {
  const { infrastructure, complaints, updateComplaintStatus } = useReports();

  const [selectedIssue, setSelectedIssue] = useState<MapInfrastructure | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ExtendedComplaint | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");
  const [markerFilter, setMarkerFilter] = useState<"all" | "infrastructure" | "complaints">("all");

  // Dynamic map viewport state
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>(
    initialCenter || { lat: 16.5062, lng: 80.648 },
  );
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Sync external selectedId if passed
  useEffect(() => {
    if (!selectedId) return;
    const infraMatch = infrastructure.find((i) => i.id === selectedId || i.assetId === selectedId);
    if (infraMatch) {
      setSelectedIssue(infraMatch);
      setSelectedComplaint(null);
      setCurrentCenter({ lat: infraMatch.latitude, lng: infraMatch.longitude });
      setCurrentZoom(15);
      return;
    }
    const complaintMatch = complaints.find((c) => c.id === selectedId);
    if (complaintMatch && complaintMatch.latitude && complaintMatch.longitude) {
      setSelectedComplaint(complaintMatch);
      setSelectedIssue(null);
      setCurrentCenter({ lat: complaintMatch.latitude, lng: complaintMatch.longitude });
      setCurrentZoom(15);
    }
  }, [selectedId, infrastructure, complaints]);

  // Sync external userLocation if provided
  useEffect(() => {
    if (userLocation) {
      setCurrentCenter(userLocation);
      setCurrentZoom(15);
    }
  }, [userLocation]);

  // Handle Location Search (e.g. "Guntur", "Visakhapatnam", "Vijayawada", "Hyderabad", "MG Road")
  const handleExecuteSearch = useCallback(
    async (queryText?: string) => {
      const q = (queryText !== undefined ? queryText : searchQuery).trim();
      if (!q) return;

      setIsSearching(true);
      setSearchFeedback(null);

      // Check if it matches an infrastructure asset first
      const infraMatch = infrastructure.find(
        (i) =>
          i.name.toLowerCase().includes(q.toLowerCase()) ||
          i.id.toLowerCase() === q.toLowerCase() ||
          i.assetId?.toLowerCase() === q.toLowerCase(),
      );
      if (infraMatch) {
        setSelectedIssue(infraMatch);
        setSelectedComplaint(null);
        setCurrentCenter({ lat: infraMatch.latitude, lng: infraMatch.longitude });
        setCurrentZoom(15);
        setIsSearching(false);
        setSearchFeedback(`Located: ${infraMatch.name}`);
        onSelectId?.(infraMatch.id);
        return;
      }

      // Check if it matches a complaint ID or title
      const complaintMatch = complaints.find(
        (c) =>
          c.id.toLowerCase() === q.toLowerCase() ||
          c.title.toLowerCase().includes(q.toLowerCase()) ||
          c.ward.toLowerCase().includes(q.toLowerCase()),
      );
      if (complaintMatch && complaintMatch.latitude && complaintMatch.longitude) {
        setSelectedComplaint(complaintMatch);
        setSelectedIssue(null);
        setCurrentCenter({ lat: complaintMatch.latitude, lng: complaintMatch.longitude });
        setCurrentZoom(15);
        setIsSearching(false);
        setSearchFeedback(`Located: ${complaintMatch.title}`);
        onSelectId?.(complaintMatch.id);
        return;
      }

      // Geocode using Google Maps Places/Geocoding API
      const result = await geocodeLocation(q, GOOGLE_MAPS_API_KEY);
      if (result) {
        setCurrentCenter({ lat: result.lat, lng: result.lng });
        setCurrentZoom(13);
        setSearchFeedback(`Centered on: ${result.formattedAddress}`);
        onLocationFound?.(result);
      } else {
        setSearchFeedback(`Location "${q}" not found. Try city or area name.`);
      }

      setIsSearching(false);
    },
    [searchQuery, infrastructure, complaints, onSelectId, onLocationFound],
  );

  // Filtered infrastructure items
  const filteredInfrastructure = useMemo(() => {
    if (!showInfrastructure || markerFilter === "complaints") return [];
    if (!riskFilter || riskFilter === "All") return infrastructure;
    return infrastructure.filter((i) => i.priority.toLowerCase() === riskFilter.toLowerCase());
  }, [infrastructure, showInfrastructure, markerFilter, riskFilter]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    if (!showComplaints || markerFilter === "infrastructure") return [];
    return complaints.filter(
      (c) => typeof c.latitude === "number" && typeof c.longitude === "number",
    );
  }, [complaints, showComplaints, markerFilter]);

  // Get status color for complaint markers
  const getComplaintStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "#16a34a"; // green
      case "Assigned":
        return "#8b5cf6"; // purple
      case "In Review":
        return "#f59e0b"; // amber
      default:
        return "#ef4444"; // red/new
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border border-border bg-card", className)}
    >
      {/* Search Header Bar (Supports ANY place: Vijayawada, Guntur, Visakhapatnam, Hyderabad, Chennai, Bengaluru, etc.) */}
      {enableSearch && (
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2 max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteSearch();
            }}
            className="flex-1 flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/95 p-1 shadow-card backdrop-blur"
          >
            <Search className="size-4 ml-2.5 text-muted-foreground shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search place, city, or issue (e.g. Guntur, Visakhapatnam, Hyderabad)..."
              aria-label="Search map location"
              className="h-8 border-0 bg-transparent text-xs focus-visible:ring-0 shadow-none px-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchFeedback(null);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSearching}
              className="h-7 rounded-lg text-xs px-2.5 cursor-pointer bg-primary text-primary-foreground font-medium shrink-0"
            >
              {isSearching ? <Loader2 className="size-3 animate-spin" /> : "Go"}
            </Button>
          </form>

          {/* Quick Preset Buttons for demonstration & rapid testing */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-card backdrop-blur text-[11px]">
            {["Vijayawada", "Guntur", "Visakhapatnam", "Hyderabad"].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  setSearchQuery(city);
                  handleExecuteSearch(city);
                }}
                className="px-2 py-0.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface font-medium cursor-pointer transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Map Type & Layer controls */}
      <div className="absolute top-16 left-3 z-10 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 rounded-xl border border-border/80 bg-card/95 p-1 shadow-card backdrop-blur text-xs">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mapType === "roadmap" ? "default" : "ghost"}
            onClick={() => setMapType("roadmap")}
            className="h-7 rounded-lg text-xs px-2.5 cursor-pointer"
          >
            Street
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mapType === "hybrid" ? "default" : "ghost"}
            onClick={() => setMapType("hybrid")}
            className="h-7 rounded-lg text-xs px-2.5 cursor-pointer"
          >
            Satellite
          </Button>
        </div>

        {/* Marker filter toggle */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-border/60 pt-1 sm:pt-0 sm:pl-1.5">
          <button
            type="button"
            onClick={() => setMarkerFilter("all")}
            className={cn(
              "px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors",
              markerFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All ({filteredInfrastructure.length + filteredComplaints.length})
          </button>
          <button
            type="button"
            onClick={() => setMarkerFilter("complaints")}
            className={cn(
              "px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1",
              markerFilter === "complaints"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquareWarning className="size-3" /> Complaints ({complaints.length})
          </button>
          <button
            type="button"
            onClick={() => setMarkerFilter("infrastructure")}
            className={cn(
              "px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1",
              markerFilter === "infrastructure"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Building2 className="size-3" /> Assets ({infrastructure.length})
          </button>
        </div>
      </div>

      {/* Top right live telemetry badge */}
      <div className="absolute top-16 right-3 z-10 hidden md:flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-3 py-1.5 shadow-card backdrop-blur text-xs">
        <span className="size-2 rounded-full bg-success animate-pulse" />
        <span className="font-medium text-foreground">Live Telemetry & Real-Time Sync</span>
      </div>

      {/* Search feedback toast if present */}
      {searchFeedback && (
        <div className="absolute top-28 left-3 z-10 max-w-sm rounded-xl border border-primary/30 bg-card/95 px-3 py-1.5 text-xs text-foreground shadow-lift backdrop-blur flex items-center justify-between gap-2 animate-rise">
          <span className="font-medium">{searchFeedback}</span>
          <button
            type="button"
            onClick={() => setSearchFeedback(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Google Maps Render Container */}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="size-full min-h-[420px]">
          <Map
            defaultCenter={currentCenter}
            defaultZoom={initialZoom}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            className="size-full"
          >
            {/* Dynamic Camera controller */}
            <MapCameraController center={currentCenter} zoom={currentZoom} />

            {/* Click listener for interactive placement */}
            {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

            {/* User's detected / selected GPS Location Marker */}
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Your Location">
                <div className="relative flex flex-col items-center cursor-pointer">
                  <span className="absolute size-7 animate-ping rounded-full bg-blue-500 opacity-30" />
                  <div className="relative grid size-8 place-items-center rounded-full border-2 border-white bg-blue-600 shadow-lift">
                    <User className="size-4 text-white" />
                  </div>
                  <div className="mt-1 rounded-md bg-card/95 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 shadow-sm border border-border">
                    Your Location
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Infrastructure Markers */}
            {filteredInfrastructure.map((item) => {
              const markerColor = getMarkerColorByScore(item.riskScore);
              const isSelected = selectedIssue?.id === item.id;

              return (
                <AdvancedMarker
                  key={item.id}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  onClick={() => {
                    setSelectedIssue(item);
                    setSelectedComplaint(null);
                    onSelectId?.(item.id);
                  }}
                  title={`${item.name} · Risk: ${item.riskScore}`}
                >
                  <div className="group relative cursor-pointer flex flex-col items-center">
                    <div
                      className={cn(
                        "relative grid size-8 place-items-center rounded-full border-2 border-white shadow-lift transition-transform",
                        isSelected ? "scale-125 ring-4 ring-primary/40" : "hover:scale-110",
                      )}
                      style={{ backgroundColor: markerColor }}
                    >
                      <span className="text-[11px] font-bold text-white tabular-nums">
                        {item.riskScore}
                      </span>
                    </div>
                    <div className="mt-1 max-w-[120px] truncate rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm border border-border/80 hidden sm:block">
                      {item.name}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Citizen Complaint Markers (Sourced from Real-Time Store with actual lat/lng) */}
            {filteredComplaints.map((c) => {
              if (typeof c.latitude !== "number" || typeof c.longitude !== "number") return null;
              const isSelected = selectedComplaint?.id === c.id;
              const statusColor = getComplaintStatusColor(c.status);

              return (
                <AdvancedMarker
                  key={c.id}
                  position={{ lat: c.latitude, lng: c.longitude }}
                  onClick={() => {
                    setSelectedComplaint(c);
                    setSelectedIssue(null);
                    onSelectId?.(c.id);
                  }}
                  title={`[Complaint ${c.id}] ${c.title} (${c.status})`}
                >
                  <div className="group relative cursor-pointer flex flex-col items-center">
                    <div
                      className={cn(
                        "relative flex items-center justify-center rounded-xl px-2 py-1 border-2 border-white shadow-lift text-white gap-1 transition-transform",
                        isSelected ? "scale-125 ring-4 ring-primary/50" : "hover:scale-110",
                      )}
                      style={{ backgroundColor: statusColor }}
                    >
                      <AlertTriangle className="size-3 shrink-0" />
                      <span className="text-[10px] font-bold tracking-tight">{c.id}</span>
                    </div>
                    <div className="mt-1 max-w-[110px] truncate rounded-md bg-card/95 px-1.5 py-0.5 text-[9px] font-semibold text-foreground shadow-sm border border-border/80 hidden sm:block">
                      {c.title}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Infrastructure Details InfoWindow */}
            {selectedIssue && (
              <InfoWindow
                position={{ lat: selectedIssue.latitude, lng: selectedIssue.longitude }}
                onCloseClick={() => setSelectedIssue(null)}
                headerDisabled
                className="rounded-2xl p-0"
              >
                <div className="max-w-xs space-y-2.5 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {selectedIssue.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {selectedIssue.location.split("·")[0]?.trim()}
                      </p>
                    </div>
                    <SeverityBadge
                      severity={selectedIssue.priority}
                      className="text-[10px] px-1.5 py-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                    <div>
                      Condition:{" "}
                      <span className="font-medium text-foreground">{selectedIssue.condition}</span>
                    </div>
                    <div>
                      Open reports:{" "}
                      <span className="font-bold text-foreground">{selectedIssue.complaints}</span>
                    </div>
                    <div>
                      Risk score:{" "}
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: getMarkerColorByScore(selectedIssue.riskScore) }}
                      >
                        {selectedIssue.riskScore}/100
                      </span>
                    </div>
                    <div>
                      Type:{" "}
                      <span className="font-medium text-foreground">{selectedIssue.type}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {selectedIssue.aiRecommendation}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    {onSelectIssueForReport && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelectIssueForReport(
                            selectedIssue.name,
                            selectedIssue.location,
                            selectedIssue.latitude,
                            selectedIssue.longitude,
                          );
                          setSelectedIssue(null);
                        }}
                        className="flex-1 rounded-xl text-xs h-7.5 bg-primary text-primary-foreground cursor-pointer"
                      >
                        Report issue here
                      </Button>
                    )}
                    {onViewDetails && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(selectedIssue)}
                        className="rounded-xl text-xs h-7.5 cursor-pointer"
                      >
                        Details →
                      </Button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Citizen Complaint Details InfoWindow */}
            {selectedComplaint &&
              typeof selectedComplaint.latitude === "number" &&
              typeof selectedComplaint.longitude === "number" && (
                <InfoWindow
                  position={{ lat: selectedComplaint.latitude, lng: selectedComplaint.longitude }}
                  onCloseClick={() => setSelectedComplaint(null)}
                  headerDisabled
                  className="rounded-2xl p-0"
                >
                  <div className="max-w-xs space-y-2.5 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">
                            {selectedComplaint.id}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            · {selectedComplaint.category}
                          </span>
                        </div>
                        <h4 className="font-medium text-xs text-foreground mt-0.5 line-clamp-1">
                          {selectedComplaint.title}
                        </h4>
                      </div>
                      <StatusBadge status={selectedComplaint.status} />
                    </div>

                    <div className="space-y-1 text-muted-foreground text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>Location:</span>
                        <span className="font-medium text-foreground text-right truncate max-w-[180px]">
                          {selectedComplaint.location || selectedComplaint.ward}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GPS Coordinates:</span>
                        <span className="font-mono text-foreground text-[10px]">
                          {selectedComplaint.latitude.toFixed(4)}° N,{" "}
                          {selectedComplaint.longitude.toFixed(4)}° E
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reported by:</span>
                        <span className="font-medium text-foreground">
                          {selectedComplaint.citizen}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Date:</span>
                        <span className="font-medium text-foreground">
                          {selectedComplaint.reportedAt}
                        </span>
                      </div>
                    </div>

                    {selectedComplaint.description && (
                      <p className="text-[11px] text-muted-foreground bg-surface/70 rounded-lg p-2 border border-border/40 line-clamp-2">
                        {selectedComplaint.description}
                      </p>
                    )}

                    {/* Authority Action: Real-Time Status Transition Buttons */}
                    {mode === "authority" ? (
                      <div className="pt-1 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Update Status (Real-Time)
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {selectedComplaint.status !== "In Review" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateComplaintStatus(selectedComplaint.id, "In Review");
                                setSelectedComplaint((prev) =>
                                  prev ? { ...prev, status: "In Review" } : null,
                                );
                              }}
                              className="h-6 text-[10px] rounded-lg px-2 cursor-pointer"
                            >
                              In Review
                            </Button>
                          )}
                          {selectedComplaint.status !== "Assigned" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateComplaintStatus(selectedComplaint.id, "Assigned");
                                setSelectedComplaint((prev) =>
                                  prev ? { ...prev, status: "Assigned" } : null,
                                );
                              }}
                              className="h-6 text-[10px] rounded-lg px-2 cursor-pointer text-purple-600 border-purple-300"
                            >
                              Assign Crew
                            </Button>
                          )}
                          {selectedComplaint.status !== "Resolved" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateComplaintStatus(selectedComplaint.id, "Resolved");
                                setSelectedComplaint((prev) =>
                                  prev ? { ...prev, status: "Resolved" } : null,
                                );
                              }}
                              className="h-6 text-[10px] rounded-lg px-2 cursor-pointer text-emerald-600 border-emerald-300"
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      onSelectIssueForReport && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onSelectIssueForReport(
                              selectedComplaint.title,
                              selectedComplaint.location || selectedComplaint.ward,
                              selectedComplaint.latitude,
                              selectedComplaint.longitude,
                            );
                            setSelectedComplaint(null);
                          }}
                          className="w-full rounded-xl text-xs h-7.5 bg-primary text-primary-foreground cursor-pointer"
                        >
                          Report similar issue here
                        </Button>
                      )
                    )}
                  </div>
                </InfoWindow>
              )}
          </Map>
        </div>
      </APIProvider>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-border/80 bg-card/95 px-3 py-1.5 text-[11px] font-medium shadow-card backdrop-blur z-10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Legend:
        </span>
        {riskLevels.map((r) => (
          <span key={r.level} className="flex items-center gap-1 text-foreground">
            <span
              className="size-2 rounded-full border border-card shadow-sm"
              style={{ background: r.color }}
            />
            <span className="hidden sm:inline">{r.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-foreground border-l border-border/60 pl-2">
          <AlertTriangle className="size-3 text-red-500" />
          <span>Complaints</span>
        </span>
      </div>
    </div>
  );
}
export default GoogleCityMap;
