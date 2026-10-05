import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  FlipHorizontal,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LiveCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageUrl: string, fileName: string) => void;
}

export function LiveCameraModal({ open, onOpenChange, onCapture }: LiveCameraModalProps) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Starting camera...");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Helper to reliably stop all tracks and turn off hardware camera indicator
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsLiveActive(false);
  }, []);

  // Request camera permission using browser's real Web Camera API
  const startWebcam = useCallback(
    async (mode: "environment" | "user" = facingMode) => {
      // Prevent concurrent permission requests
      if (isRequestingRef.current) return;
      isRequestingRef.current = true;

      setIsLoading(true);
      setStatusMessage("Starting camera...");
      setCameraError(null);
      setCapturedImage(null);
      setCapturedBlob(null);

      // Stop any prior stream tracks first
      stopTracks();

      // Check browser support for navigator.mediaDevices.getUserMedia
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraError("Your browser does not support camera access.");
        setIsLoading(false);
        isRequestingRef.current = false;
        return;
      }

      let activeMediaStream: MediaStream | null = null;

      try {
        // Prefer rear camera on mobile devices with facingMode: "environment"
        try {
          activeMediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: mode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (constraintErr: unknown) {
          // Gracefully fall back to standard video on desktop or laptops where facingMode is not supported
          const err = constraintErr as Error;
          if (
            err.name === "OverconstrainedError" ||
            err.name === "ConstraintNotSatisfiedError" ||
            err.name === "TypeError"
          ) {
            activeMediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw constraintErr;
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Camera access error:", error);

        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setCameraError(
            "Camera access was denied. Please allow camera permission in your browser settings and try again.",
          );
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setCameraError("No camera was detected on this device.");
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          setCameraError(
            "Your camera is currently in use by another application. Please close other camera apps and try again.",
          );
        } else {
          setCameraError(
            error.message ||
              "Camera access was denied. Please allow camera permission in your browser settings and try again.",
          );
        }

        setIsLoading(false);
        isRequestingRef.current = false;
        return;
      }

      if (activeMediaStream) {
        streamRef.current = activeMediaStream;
        setIsLiveActive(true);
        setStatusMessage("Camera ready");
        setCameraError(null);

        const video = videoElementRef.current;
        if (video) {
          video.srcObject = activeMediaStream;
          video.onloadedmetadata = () => {
            video.play().catch((playErr) => {
              console.warn("Video play interrupted:", playErr);
            });
          };
          video.play().catch(() => {});
        }

        // Check if multiple camera devices exist for flip toggle
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        } catch {
          // ignore enumeration error
        }
      }

      setIsLoading(false);
      isRequestingRef.current = false;
    },
    [facingMode, stopTracks],
  );

  // Initialize camera ONLY after explicit user action when dialog opens; stop tracks on close or unmount
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
      // Prevent background scrolling while camera interface is active
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }
      startWebcam(facingMode);
    } else {
      stopTracks();
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    }

    return () => {
      stopTracks();
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Capture Photo: grab frame from live video using <canvas> and export as blob & dataUrl
  const handleCapturePhoto = () => {
    const video = videoElementRef.current;
    if (!video) return;

    setIsCapturing(true);
    setStatusMessage("Capturing...");

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
        }
        setCapturedImage(dataUrl);
        setIsCapturing(false);
        setStatusMessage("Photo captured");
        // Stop hardware camera stream immediately after capture so indicator turns off
        stopTracks();
      },
      "image/jpeg",
      0.92,
    );
  };

  // Retake: Clear captured photo and re-open live camera stream
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startWebcam(facingMode);
  };

  // Use Photo: Upload to backend API via FormData and confirm
  const handleConfirmUsePhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `civic-evidence-${timestamp}.jpg`;

    try {
      let finalUrl = capturedImage;

      // Multipart FormData upload to existing backend /api/upload
      if (capturedBlob) {
        const formData = new FormData();
        formData.append("image", capturedBlob, fileName);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const uploadData = await res.json();
          if (uploadData.url) {
            finalUrl = uploadData.url;
          }
        }
      }

      onCapture(finalUrl, fileName);
      stopTracks();
      onOpenChange(false);
    } catch (err) {
      console.warn("Backend upload error, using local data URL fallback:", err);
      onCapture(capturedImage, fileName);
      stopTracks();
      onOpenChange(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle front/back camera if device has multiple cameras
  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startWebcam(nextMode);
  };

  // Close Camera: Stop tracks and close dialog
  const handleClose = () => {
    stopTracks();
    setCapturedImage(null);
    setCapturedBlob(null);
    setCameraError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? handleClose() : onOpenChange(true))}>
      <DialogContent className="w-full max-w-xl p-4 sm:p-6 overflow-hidden bg-card text-card-foreground rounded-3xl border border-border shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-teal/15 text-teal">
                <Camera className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight">
                  {capturedImage ? "Review Captured Photo" : "Live Camera"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {capturedImage
                    ? "Verify damage clarity before attaching to municipal report"
                    : "Real-time device camera for municipal AI severity triage"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {hasMultipleCameras && !capturedImage && isLiveActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleCameraFacing}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer border-border"
                >
                  <FlipHorizontal className="size-3.5" /> Flip
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
                <span className="sr-only">Close Camera</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Viewfinder Container: Responsive on mobile & desktop, maintaining aspect ratio without distortion */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black flex items-center justify-center border border-border shadow-inner">
          {/* Live Video Feed - Always present in DOM to prevent ref drops */}
          <video
            ref={videoElementRef}
            autoPlay
            playsInline
            muted
            className={`size-full object-cover transition-opacity duration-200 ${
              isLiveActive && !capturedImage && !cameraError ? "opacity-100" : "opacity-0 absolute"
            }`}
          />

          {/* Captured Image Preview Display */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured evidence preview"
              className="size-full object-contain z-10"
            />
          )}

          {/* Live Stream Overlay Elements */}
          {isLiveActive && !capturedImage && !cameraError && (
            <>
              {/* Camera Status Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white backdrop-blur z-20 border border-white/10">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium tracking-wide uppercase text-[10px]">
                  {statusMessage}
                </span>
              </div>

              {/* Viewfinder Targeting Frame */}
              <div className="pointer-events-none absolute inset-4 sm:inset-6 border border-white/30 rounded-xl flex items-center justify-center z-20">
                <div className="size-7 sm:size-9 border-t-2 border-l-2 border-white/80 absolute top-0 left-0 rounded-tl-sm" />
                <div className="size-7 sm:size-9 border-t-2 border-r-2 border-white/80 absolute top-0 right-0 rounded-tr-sm" />
                <div className="size-7 sm:size-9 border-b-2 border-l-2 border-white/80 absolute bottom-0 left-0 rounded-bl-sm" />
                <div className="size-7 sm:size-9 border-b-2 border-r-2 border-white/80 absolute bottom-0 right-0 rounded-br-sm" />
                <span className="text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur shadow-sm">
                  Center infrastructure issue in frame
                </span>
              </div>
            </>
          )}

          {/* Loading / Starting Camera Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/90 text-white p-6">
              <Loader2 className="size-8 animate-spin text-teal" />
              <p className="text-xs text-white/90 font-medium">Starting camera...</p>
            </div>
          )}

          {/* Capturing Status Overlay */}
          {isCapturing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/80 text-white p-6">
              <Loader2 className="size-8 animate-spin text-teal" />
              <p className="text-xs text-white/90 font-medium">Capturing...</p>
            </div>
          )}

          {/* Error Message Overlay with exact requested wording */}
          {cameraError && !isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center text-white bg-black/95 space-y-3">
              <AlertCircle className="size-9 text-amber-400" />
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-semibold">Camera Access Required</p>
                <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startWebcam(facingMode)}
                  className="rounded-xl text-xs cursor-pointer gap-1.5 font-medium"
                >
                  <RefreshCw className="size-3.5" /> Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Accessible Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl cursor-pointer text-xs w-full sm:w-auto h-10 border-border"
          >
            Close Camera
          </Button>

          {capturedImage ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="flex-1 sm:flex-none rounded-xl cursor-pointer text-xs gap-1.5 h-10"
              >
                <RefreshCw className="size-3.5" /> Retake
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUsePhoto}
                disabled={isUploading}
                className="flex-1 sm:flex-none rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer text-xs font-semibold gap-1.5 h-10 px-4"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" /> Use Photo
                  </>
                )}
              </Button>
            </div>
          ) : (
            !cameraError &&
            !isLoading && (
              <Button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isLiveActive || isCapturing}
                className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer text-xs font-semibold gap-2 shadow-card px-5 h-10"
              >
                <Camera className="size-4" /> Capture Photo
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
