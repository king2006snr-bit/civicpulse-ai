import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  FileImage,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  Maximize2,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/civic/Logo";
import { PageHeader } from "@/components/civic/PageHeader";
import { StatCard } from "@/components/civic/StatCard";
import { StatusBadge } from "@/components/civic/SeverityBadge";
import { GoogleCityMap } from "@/components/civic/GoogleCityMap";
import { LiveCameraModal } from "@/components/civic/LiveCameraModal";
import { CitizenReportDossierModal } from "@/components/civic/CitizenReportDossierModal";
import { ThemeToggle } from "@/components/civic/ThemeToggle";
import { useReports, type ExtendedCitizenReport } from "@/lib/reports-store";
import { geocodeLocation, reverseGeocodeCoords } from "@/lib/geocoding";

export const Route = createFileRoute("/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Portal — CivicPulse AI" },
      {
        name: "description",
        content:
          "File infrastructure reports, track live resolution status in My Reports, and view your ward map.",
      },
      { property: "og:title", content: "Citizen Portal — CivicPulse AI" },
      {
        property: "og:description",
        content:
          "Track reported issues and follow every update from the municipal team in real time.",
      },
    ],
  }),
  component: CitizenDashboard,
});

function CitizenDashboard() {
  const { citizenReports, stats, addCitizenReport, deleteCitizenReport, resetDefaults } =
    useReports();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<
    "report" | "my-reports" | "map" | "profile" | "settings"
  >("report");

  // Report form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("road");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [imageDescription, setImageDescription] = useState("");
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  // Live Location Geolocation State
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [citizenCoords, setCitizenCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live Camera Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected report for interactive Project Details / Dossier Modal
  const [selectedReport, setSelectedReport] = useState<ExtendedCitizenReport | null>(null);

  // Selected report for deletion confirmation
  const [reportToDelete, setReportToDelete] = useState<ExtendedCitizenReport | null>(null);

  // My Reports filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Profile states
  const [profileName, setProfileName] = useState("Resident Citizen");
  const [profileEmail, setProfileEmail] = useState("citizen@demo.city");
  const [profilePhone, setProfilePhone] = useState("+91 98450 12345");
  const [selectedWard, setSelectedWard] = useState("Ward 15 — Patamata (South)");

  // Settings states
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [autoLocation, setAutoLocation] = useState(true);
  const [highResPhotos, setHighResPhotos] = useState(true);

  // Real-time GPS & Google Maps Location Detection
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setIsDetectingLocation(true);
    toast.loading("Accessing device GPS & Google Maps coordinates...", { id: "gps-fetch" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const latStr = lat.toFixed(5);
        const lngStr = lng.toFixed(5);

        setCitizenCoords({ lat, lng });

        // Attempt reverse geocoding via Google Maps API
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const formattedAddress = await reverseGeocodeCoords(lat, lng, apiKey);
            if (formattedAddress) {
              setLocation(`${formattedAddress} (${latStr}° N, ${lngStr}° E)`);
              toast.success("Live Google location captured!", {
                id: "gps-fetch",
                description: formattedAddress,
              });
              setIsDetectingLocation(false);
              return;
            }
          }
        } catch {
          // If network fetch fails, use coordinates directly
        }

        const resolvedText = `Device GPS Location (${latStr}° N, ${lngStr}° E)`;
        setLocation(resolvedText);
        toast.success("GPS Location Captured!", {
          id: "gps-fetch",
          description: `Coordinates: ${latStr}° N, ${lngStr}° E`,
        });
        setIsDetectingLocation(false);
      },
      () => {
        setIsDetectingLocation(false);
        toast.info(
          "Location permission not granted. You can type any location or click on the map.",
          {
            id: "gps-fetch",
          },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
  };

  // Handle image upload from file picker or camera
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be under 10MB");
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      toast.success("Photo attached successfully", {
        description: "You can add an optional description specifically for this photo.",
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle image captured via live webcam/camera modal
  const handleCameraCapture = (imageDataUrl: string, fileName: string) => {
    setImagePreview(imageDataUrl);
    setImageName(fileName);
    toast.success("Live photo captured successfully", {
      description: "Photo ready for AI severity scoring.",
    });
  };

  // Remove attached image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageName("");
    setImageDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Photo removed");
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please state what the problem is");
      return;
    }

    let lat = citizenCoords?.lat;
    let lng = citizenCoords?.lng;

    // If coordinates were not explicitly set by GPS or pin, geocode the entered location text
    if (typeof lat !== "number" || typeof lng !== "number") {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey && location.trim()) {
        const geocoded = await geocodeLocation(location.trim(), apiKey);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
      }
    }

    // Call reactive store to add report in real time with actual coordinates
    const newReportId = await addCitizenReport({
      title: title.trim(),
      category,
      location:
        location.trim() ||
        `${selectedWard} (GPS: ${lat ? lat.toFixed(4) : "16.5062"}° N, ${lng ? lng.toFixed(4) : "80.6480"}° E)`,
      ward: selectedWard,
      description: description.trim(),
      imageUrl: imagePreview || undefined,
      imageDescription: imageDescription.trim() || undefined,
      latitude: lat,
      longitude: lng,
    });

    setLastSubmittedId(newReportId);

    // Show informative success toast with interactive action
    toast.success("Report submitted successfully!", {
      description: `Issue #${newReportId} logged. Status is now tracked in real time.`,
      action: {
        label: "View in My Reports",
        onClick: () => setActiveTab("my-reports"),
      },
    });

    // Reset form fields
    setTitle("");
    setLocation("");
    setCitizenCoords(null);
    setDescription("");
    setImagePreview(null);
    setImageName("");
    setImageDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filter citizen reports for My Reports section
  const filteredMyReports = citizenReports.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchCat = r.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchDesc && !matchCat) return false;
    }

    if (statusFilter !== "all") {
      if (
        (statusFilter === "new" || statusFilter === "pending") &&
        r.status !== "New" &&
        r.status !== "Pending"
      ) {
        return false;
      }
      if (statusFilter === "in-review" && r.status !== "In Review") {
        return false;
      }
      if (
        (statusFilter === "assigned" || statusFilter === "in-progress") &&
        r.status !== "Assigned" &&
        r.status !== "In Progress"
      ) {
        return false;
      }
      if (statusFilter === "resolved" && r.status !== "Resolved") {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button to easily switch pages */}
            {activeTab !== "report" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("report")}
                className="h-8 rounded-xl px-2.5 text-xs font-medium text-foreground hover:bg-accent/60 cursor-pointer gap-1.5 shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-1"
                title="Return to Home"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            )}

            <Link to="/" className="min-w-0">
              <Logo />
            </Link>
          </div>

          {/* Navigation Links for Citizen Hub */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              type="button"
              variant={activeTab === "report" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("report")}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Report Issue
            </Button>
            <Button
              type="button"
              variant={activeTab === "my-reports" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("my-reports")}
              className="rounded-xl text-xs font-semibold cursor-pointer relative"
            >
              My Reports
              <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] rounded-full">
                {stats.citizenTotal}
              </Badge>
            </Button>
            <Button
              type="button"
              variant={activeTab === "map" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("map")}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Ward Map
            </Button>
            <Button
              type="button"
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("profile")}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Profile
            </Button>
            <Button
              type="button"
              variant={activeTab === "settings" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("settings")}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Settings
            </Button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-xs text-muted-foreground lg:inline font-medium">
              Vijayawada · {selectedWard}
            </span>
            <Button asChild variant="outline" className="rounded-xl h-9 text-xs">
              <Link to="/login/citizen">Sign out</Link>
            </Button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around border-t border-border px-2 py-1.5 bg-card/60 overflow-x-auto text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
              activeTab === "report"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my-reports")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeTab === "my-reports"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            My Reports ({stats.citizenTotal})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
              activeTab === "map"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Ward Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
              activeTab === "profile"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Settings
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        {/* Welcome Header */}
        <PageHeader
          title={
            activeTab === "report"
              ? "Welcome"
              : activeTab === "my-reports"
                ? "My Reports"
                : activeTab === "map"
                  ? "Ward Geographic Map"
                  : activeTab === "profile"
                    ? "Citizen Profile"
                    : "Portal Settings"
          }
          description={
            activeTab === "report"
              ? "Report municipal problems in Vijayawada, track live resolution stages in My Reports, and follow public works progress."
              : activeTab === "my-reports"
                ? "Track real-time resolution stages and detailed municipal updates for all your submitted issues."
                : activeTab === "map"
                  ? "Real-time Google Maps telemetry of monitored roads, flyovers and water infrastructure across Vijayawada."
                  : activeTab === "profile"
                    ? "Your resident credentials, designated municipal ward, and civic contribution score."
                    : "Configure SMS/email alerts, camera permissions, and emergency contacts."
          }
          actions={
            activeTab !== "report" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("report")}
                className="rounded-xl text-xs gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="size-3.5" /> Back to Dashboard
              </Button>
            )
          }
        />

        {/* Real-time stats across citizen submissions: ONLY rendered on the first dashboard page */}
        {activeTab === "report" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Your reports"
              value={String(stats.citizenTotal)}
              delta="Live tracked"
              icon={FileImage}
            />
            <StatCard
              label="Resolved"
              value={String(stats.citizenResolved)}
              delta="Verified by city"
              trend="up"
              icon={CheckCircle2}
            />
            <StatCard
              label="In progress"
              value={String(stats.citizenInProgress)}
              delta="Field crews dispatched"
              icon={Clock}
            />
            <StatCard label="Ward Health" value="78%" delta="Vijayawada telemetry" icon={MapPin} />
          </div>
        )}

        {/* -------------------- TAB 1: REPORT ISSUE (DASHBOARD) -------------------- */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Report submission form */}
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Report a new issue</CardTitle>
                  <CardDescription className="text-xs">
                    Submissions are analyzed by AI and dispatched to the {selectedWard} engineering
                    team in Vijayawada.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-xs font-semibold">
                        What's the problem? *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Deep pothole near Benz Circle flyover ramp"
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cat" className="text-xs font-semibold">
                          Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="cat" className="w-full rounded-xl text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="road">Road damage / Pothole</SelectItem>
                            <SelectItem value="drain">Drainage / Canal flooding</SelectItem>
                            <SelectItem value="light">Street lighting blackout</SelectItem>
                            <SelectItem value="water">Water main pipeline leak</SelectItem>
                            <SelectItem value="structural">Bridge / Structural fatigue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location input with Real-Time Google & GPS location capture */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="loc" className="text-xs font-semibold">
                            Location *
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDetectCurrentLocation}
                            disabled={isDetectingLocation}
                            className="h-6 px-2 text-[11px] font-medium rounded-lg text-primary border-primary/30 hover:bg-primary/10 gap-1 cursor-pointer"
                            title="Capture live GPS & Google Maps location"
                          >
                            {isDetectingLocation ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Navigation className="size-3 text-primary" />
                            )}
                            {isDetectingLocation ? "Detecting..." : "Detect Live Location"}
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="loc"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. MG Road, Vijayawada or click Detect"
                            className="rounded-xl text-xs pr-8"
                            required
                          />
                          <button
                            type="button"
                            onClick={handleDetectCurrentLocation}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Auto-fill with live device GPS"
                          >
                            <MapPin className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="desc" className="text-xs font-semibold">
                        Problem Description
                      </Label>
                      <Textarea
                        id="desc"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe observations, depth/size, and safety hazards for motorists or pedestrians..."
                        className="rounded-xl text-xs"
                      />
                    </div>

                    {/* PHOTO ATTACHMENT SECTION (File, Live WebCam or Native Camera) */}
                    <div className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-surface/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Camera className="size-3.5" /> Photo Evidence (Camera Access or File)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Photos enable automated AI severity scoring and faster crew dispatch.
                          </p>
                        </div>
                        {imagePreview && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsCameraModalOpen(true)}
                              className="text-xs text-teal hover:bg-teal/10 cursor-pointer h-7 px-2"
                            >
                              <Camera className="size-3 mr-1" /> Retake Photo
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveImage}
                              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer h-7 px-2"
                            >
                              <Trash2 className="size-3 mr-1" /> Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Hidden standard file picker */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />

                      {!imagePreview ? (
                        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                          {/* Live Camera button with direct webcam access */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCameraModalOpen(true)}
                            className="flex-1 rounded-xl border-teal/40 bg-teal/5 hover:bg-teal/15 text-teal cursor-pointer text-xs font-semibold h-10 gap-2"
                          >
                            <Camera className="size-4" />
                            Open Camera
                          </Button>

                          {/* Choose file fallback */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 rounded-xl border-border bg-card hover:bg-accent/60 cursor-pointer text-xs font-medium h-10 gap-2"
                          >
                            <Upload className="size-4 text-primary" />
                            Upload File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                              <img
                                src={imagePreview}
                                alt="Attached report evidence"
                                className="size-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {imageName || "Attached Image"}
                              </p>
                              <p className="text-[11px] text-success flex items-center gap-1 font-medium">
                                <CheckCircle2 className="size-3" /> Image attached for AI severity
                                triage
                              </p>
                            </div>
                          </div>

                          {/* Photo Description Input */}
                          <div className="space-y-1">
                            <Label htmlFor="img-desc" className="text-xs font-medium">
                              Photo Description / Specific Observation
                            </Label>
                            <Input
                              id="img-desc"
                              value={imageDescription}
                              onChange={(e) => setImageDescription(e.target.value)}
                              placeholder="e.g. Close-up of 6-inch road surface depression near storm drain"
                              className="rounded-xl text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Add specific notes about the photo to help repair crews locate the
                              defect.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-xl cursor-pointer font-semibold"
                    >
                      <Send className="size-4 mr-2" /> Submit Report
                    </Button>

                    {lastSubmittedId && (
                      <div className="rounded-xl bg-success/12 border border-success/30 p-3 text-center text-xs font-medium text-success flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>
                          Reference <strong>#{lastSubmittedId}</strong> registered. Track status in{" "}
                          <button
                            type="button"
                            onClick={() => setActiveTab("my-reports")}
                            className="underline font-bold hover:opacity-80 cursor-pointer"
                          >
                            My Reports
                          </button>
                          .
                        </span>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Side Panels: Ward Metrics & My Reports Quick Access */}
              <div className="space-y-6">
                {/* My Reports Shortcut Card */}
                <Card className="rounded-2xl border-border/80 shadow-card bg-gradient-to-br from-card to-accent/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileImage className="size-4 text-primary" /> Track In My Reports
                      </CardTitle>
                      <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
                        {citizenReports.length} Submitted
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      All your previous issue filings, live status timelines, and official engineer
                      updates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      You have{" "}
                      <strong>{stats.citizenInProgress} issues currently in progress</strong> by
                      municipal engineering crews in Vijayawada.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setActiveTab("my-reports")}
                      className="w-full rounded-xl text-xs font-semibold cursor-pointer gap-2"
                    >
                      Open My Reports Tracking →
                    </Button>
                  </CardContent>
                </Card>

                {/* Ward Resolution Progress */}
                <Card className="rounded-2xl border-border/80 shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Ward resolution rate</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Monthly municipal repair completion rate in {selectedWard}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ["Road resurfacing & potholes", 86],
                      ["Drainage & Canal desilting", 74],
                      ["Street lighting luminaires", 95],
                      ["Water supply pipeline fixes", 82],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span>{label}</span>
                          <span className="text-muted-foreground font-semibold">{value}%</span>
                        </div>
                        <Progress value={value as number} className="mt-1.5 h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Emergency Helplines Card */}
                <Card className="rounded-2xl border-border/80 shadow-card bg-surface/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5 text-primary" /> Vijayawada 24/7 Control Room
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                    <p>For active gas leaks, severe flood risks, or collapsed bridge hazards:</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-foreground">Municipal Toll-Free:</span>
                      <span className="font-mono font-bold text-primary">1800-425-0012</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Issues near you: Interactive Google Maps with Vijayawada telemetry */}
            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="size-4 text-primary" /> Monitored Infrastructure Near You
                    (Vijayawada)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Click any marker to inspect conditions or pre-fill location for your report.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("map")}
                  className="rounded-xl text-xs self-start sm:self-auto cursor-pointer"
                >
                  <Maximize2 className="size-3.5 mr-1" /> Open Full Ward Map
                </Button>
              </CardHeader>
              <CardContent>
                <GoogleCityMap
                  className="h-[360px]"
                  userLocation={citizenCoords}
                  onMapClick={(coords) => {
                    setCitizenCoords({ lat: coords.lat, lng: coords.lng });
                    setLocation(
                      coords.address || `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E`,
                    );
                    toast.success("Incident location pinned on map!");
                  }}
                  onLocationFound={(loc) => {
                    setCitizenCoords({ lat: loc.lat, lng: loc.lng });
                    setLocation(
                      `${loc.formattedAddress} (${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E)`,
                    );
                    toast.success(`Selected: ${loc.formattedAddress}`);
                  }}
                  onSelectIssueForReport={(issueName, loc, lat, lng) => {
                    setTitle(`Issue at ${issueName}`);
                    setLocation(loc);
                    if (typeof lat === "number" && typeof lng === "number") {
                      setCitizenCoords({ lat, lng });
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    toast.info(`Pre-filled location for ${issueName}`);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* -------------------- TAB 2: MY REPORTS SECTION -------------------- */}
        {activeTab === "my-reports" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("report")}
                  className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
                <div>
                  <h2 className="text-xl font-bold font-display text-foreground">My Reports</h2>
                  <p className="text-xs text-muted-foreground">
                    Track the real-time status, color-coded badges, and audit updates of all your
                    submitted issues.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reports or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl pl-8.5 h-9 text-xs"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] rounded-xl h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending (New)</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* List of reports with real-time color-coded status badges and delete buttons */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMyReports.length > 0 ? (
                filteredMyReports.map((report) => (
                  <Card
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReport(report)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedReport(report)}
                    className="rounded-2xl border-border/80 shadow-card transition-all hover:border-primary/50 hover:shadow-lift cursor-pointer flex flex-col justify-between group relative bg-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {report.id}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Visual color-coded status badge with animated pulse indicator */}
                          <StatusBadge status={report.status} />
                          {/* Remove/Delete button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(report);
                            }}
                            className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                            title="Delete this report"
                            aria-label={`Delete report ${report.id}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2 mt-1">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                        <MapPin className="size-3 text-muted-foreground" />
                        <span className="truncate">{report.location || report.ward}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {report.imageUrl && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black/5">
                          <img
                            src={report.imageUrl}
                            alt={report.title}
                            className="size-full object-cover transition-transform group-hover:scale-105"
                          />
                          {report.imageDescription && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur max-w-[90%] truncate">
                              {report.imageDescription}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Real-time status progress indicators */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">Resolution Progress</span>
                          <span className="font-semibold text-primary">{report.status}</span>
                        </div>
                        <Progress
                          value={
                            report.status === "Resolved"
                              ? 100
                              : report.status === "Assigned" || report.status === "In Progress"
                                ? 75
                                : report.status === "In Review"
                                  ? 45
                                  : 20
                          }
                          className="h-1.5"
                        />
                      </div>

                      {/* Official latest update */}
                      <div className="rounded-xl bg-surface/70 p-2.5 text-xs text-muted-foreground border border-border/60">
                        <span className="text-[11px] font-semibold text-foreground block mb-0.5">
                          City Update:
                        </span>
                        <p className="line-clamp-2 text-xs">{report.update}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/70">
                        <span>Filed: {report.reportedAt}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(report);
                            }}
                            className="text-muted-foreground hover:text-destructive text-xs font-medium cursor-pointer transition-colors"
                          >
                            Delete
                          </button>
                          <span className="text-primary font-semibold group-hover:underline">
                            View Dossier →
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
                  <FileText className="size-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">
                    No reports match your filters
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Try searching for another keyword or submit a new report using the button below.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("report")}
                    className="rounded-xl text-xs cursor-pointer mt-2"
                  >
                    File a New Report
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 3: WARD MAP (REAL-TIME GOOGLE MAPS) -------------------- */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("report")}
                  className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
                <div>
                  <h2 className="text-xl font-bold font-display text-foreground">
                    Ward Geographic Map
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Live Google Maps telemetry showing monitored infrastructure across Vijayawada.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setActiveTab("report")}
                className="rounded-xl text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <FileImage className="size-3.5" /> Report Issue in this Area
              </Button>
            </div>

            <GoogleCityMap
              className="h-[560px] shadow-lift"
              userLocation={citizenCoords}
              onMapClick={(coords) => {
                setCitizenCoords({ lat: coords.lat, lng: coords.lng });
                setLocation(
                  coords.address || `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E`,
                );
                toast.success("Location selected! Switching to Report tab...");
                setActiveTab("report");
              }}
              onLocationFound={(loc) => {
                setCitizenCoords({ lat: loc.lat, lng: loc.lng });
                setLocation(
                  `${loc.formattedAddress} (${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E)`,
                );
                toast.success(`Location centered: ${loc.formattedAddress}`);
              }}
              onSelectIssueForReport={(issueName, loc, lat, lng) => {
                setTitle(`Issue at ${issueName}`);
                setLocation(loc);
                if (typeof lat === "number" && typeof lng === "number") {
                  setCitizenCoords({ lat, lng });
                }
                setActiveTab("report");
                toast.info(`Pre-filled location for ${issueName}`);
              }}
            />
          </div>
        )}

        {/* -------------------- TAB 4: PROFILE (NO DASHBOARD STAT CARDS) -------------------- */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("report")}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
              <div>
                <h2 className="text-xl font-bold font-display text-foreground">Citizen Profile</h2>
                <p className="text-xs text-muted-foreground">
                  Your registered details, designated municipal division, and civic contribution.
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                    <User className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{profileName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {profileEmail} · {selectedWard}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-name" className="text-xs font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="prof-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-email" className="text-xs font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="prof-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-phone" className="text-xs font-semibold">
                      Mobile Number (for SMS dispatch alerts)
                    </Label>
                    <Input
                      id="prof-phone"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-ward" className="text-xs font-semibold">
                      Registered Ward Division (Vijayawada)
                    </Label>
                    <Select value={selectedWard} onValueChange={setSelectedWard}>
                      <SelectTrigger id="prof-ward" className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ward 15 — Patamata (South)">
                          Ward 15 — Patamata (South)
                        </SelectItem>
                        <SelectItem value="Ward 12 — Governorpet (Central)">
                          Ward 12 — Governorpet (Central)
                        </SelectItem>
                        <SelectItem value="Ward 7 — One Town (North)">
                          Ward 7 — One Town (North)
                        </SelectItem>
                        <SelectItem value="Ward 21 — Gunadala (East)">
                          Ward 21 — Gunadala (East)
                        </SelectItem>
                        <SelectItem value="Ward 3 — Bhavanipuram (West)">
                          Ward 3 — Bhavanipuram (West)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Civic Score & Badges */}
                <div className="rounded-2xl border border-primary/20 bg-accent/30 p-4 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" /> Civic Impact Score
                    </span>
                    <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                      Level 3 Contributor
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have submitted <strong>{stats.citizenTotal} verified reports</strong>,
                    helping municipal teams in Vijayawada resolve{" "}
                    <strong>{stats.citizenResolved} infrastructure defects</strong>.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => toast.success("Profile saved successfully")}
                  className="rounded-xl text-xs font-semibold cursor-pointer w-full sm:w-auto"
                >
                  Save Profile Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* -------------------- TAB 5: SETTINGS (NO DASHBOARD STAT CARDS) -------------------- */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("report")}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
              <div>
                <h2 className="text-xl font-bold font-display text-foreground">Portal Settings</h2>
                <p className="text-xs text-muted-foreground">
                  Manage notification preferences, night mode, and device capture permissions.
                </p>
              </div>
            </div>

            {/* Night Mode & Appearance */}
            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> Appearance & Monitoring Theme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">Night Mode</span>
                    <span className="text-xs text-muted-foreground block">
                      Toggle dark theme for night-time reporting and low-light eye comfort
                    </span>
                  </div>
                  <ThemeToggle showLabel />
                </div>
              </CardContent>
            </Card>

            {/* Notification settings */}
            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-primary" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      SMS Status Notifications
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Receive text alerts when a crew is assigned or issue is resolved
                    </span>
                  </div>
                  <Switch checked={notifySms} onCheckedChange={setNotifySms} />
                </div>

                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      Email Weekly Ward Digest
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Summary of resolved infrastructure projects in your Vijayawada ward
                    </span>
                  </div>
                  <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                </div>
              </CardContent>
            </Card>

            {/* Hardware & Location */}
            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Camera className="size-4 text-teal" /> Hardware & Capture Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      Automatic GPS Geotagging
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Auto-detect coordinates when filing reports from mobile or laptop
                    </span>
                  </div>
                  <Switch checked={autoLocation} onCheckedChange={setAutoLocation} />
                </div>

                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      High-Definition Camera Capture
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Capture 1080p full resolution photo frames for structural analysis
                    </span>
                  </div>
                  <Switch checked={highResPhotos} onCheckedChange={setHighResPhotos} />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card className="rounded-2xl border-border/80 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Phone className="size-4 text-destructive" /> Vijayawada Municipal Emergency
                  Helplines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-surface/70 p-3 border border-border/70">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Civic Emergency Control Room (24/7)
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Flooding, water main bursts, road collapse
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary">1800-425-0012</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface/70 p-3 border border-border/70">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Streetlight & Electrical Grid Fault
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Blackouts, sparking cables, fallen poles
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary">1912</span>
                </div>
              </CardContent>
            </Card>

            {/* Data reset */}
            <Card className="rounded-2xl border-destructive/30 shadow-card bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-destructive">
                  Reset Demo Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Reset the in-browser real-time reports state back to default sample city data.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetDefaults();
                    toast.success("Reports store reset to defaults");
                  }}
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer text-xs"
                >
                  <RefreshCw className="size-3 mr-1" /> Reset to Initial State
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Live Camera Modal (Direct MediaStream WebCam Access) */}
      <LiveCameraModal
        open={isCameraModalOpen}
        onOpenChange={setIsCameraModalOpen}
        onCapture={handleCameraCapture}
      />

      {/* Interactive Project / Report Dossier Modal */}
      <CitizenReportDossierModal
        report={selectedReport}
        open={Boolean(selectedReport)}
        onOpenChange={(open) => !open && setSelectedReport(null)}
        onDelete={(id) => {
          deleteCitizenReport(id);
          setSelectedReport(null);
        }}
      />

      {/* Confirmation Dialog for Deleting Report */}
      <Dialog
        open={Boolean(reportToDelete)}
        onOpenChange={(open) => !open && setReportToDelete(null)}
      >
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Report #{reportToDelete?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete this report? This will permanently remove{" "}
              <strong>"{reportToDelete?.title}"</strong> from your submitted issues list and the
              municipal queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReportToDelete(null)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (reportToDelete) {
                  deleteCitizenReport(reportToDelete.id);
                  toast.success(`Report #${reportToDelete.id} deleted successfully`);
                  setReportToDelete(null);
                }
              }}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Delete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
