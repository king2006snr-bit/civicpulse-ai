import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";

const UPLOADS_DIR = path.resolve(process.cwd(), "data/uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `camera-capture-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});
import {
  getAllComplaints,
  getComplaintById,
  createComplaint,
  updateComplaintStatus,
  getAllInfrastructure,
  getInfrastructureById,
  updateInfrastructureStatus,
  getDatabaseStats,
  type DbComplaint,
} from "./db";
import { registerSseClient, broadcastRealtimeEvent } from "./sse";
import { predictionsRouter, resolveAssetId, scheduleRecalculation } from "./predictions";

export const apiRouter = Router();

// Health check
apiRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "CivicPulse AI Municipal Backend",
    timestamp: new Date().toISOString(),
  });
});

// ML risk predictions (Authority Portal "Predictions" page)
apiRouter.use("/predictions", predictionsRouter);

// Real-time synchronization SSE stream
apiRouter.get("/realtime/events", (req: Request, res: Response) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  registerSseClient(clientId, res);
});

// Authentication endpoint
apiRouter.post("/auth/login", (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body || {};

    if (role === "authority" || email === "authority@civicpulse.ai") {
      if (password === "civicpulse123" || email === "authority@civicpulse.ai") {
        return res.json({
          success: true,
          user: {
            id: "auth_1",
            email: "authority@civicpulse.ai",
            name: "A. Kulkarni",
            role: "authority",
            department: "Public Works & Engineering",
          },
          token: "auth_token_authority_session",
        });
      }
      return res.status(401).json({ error: "Invalid authority credentials" });
    }

    // Citizen login
    const citizenEmail = email || "citizen@civicpulse.ai";
    return res.json({
      success: true,
      user: {
        id: "cit_1",
        email: citizenEmail,
        name: "P. Sharma",
        role: "citizen",
        department: "Ward 12 Resident",
      },
      token: "auth_token_citizen_session",
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

// Dashboard & municipal statistics
apiRouter.get("/stats", (_req: Request, res: Response) => {
  try {
    const stats = getDatabaseStats();
    res.json(stats);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch stats" });
  }
});

// Get all complaints
apiRouter.get("/complaints", (req: Request, res: Response) => {
  try {
    const citizenId = req.query.citizenId as string | undefined;
    let list = getAllComplaints();

    if (citizenId) {
      list = list.filter((c) => c.citizen_id === citizenId);
    }

    res.json(list);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch complaints" });
  }
});

// Get single complaint by ID
apiRouter.get("/complaints/:id", (req: Request, res: Response) => {
  try {
    const complaint = getComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json(complaint);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch complaint" });
  }
});

// Create new citizen complaint
apiRouter.post("/complaints", (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.title) {
      return res.status(400).json({ error: "Problem title is required." });
    }

    // The citizen portal sends coordinates but no asset id; link the complaint to the infrastructure
    // it concerns so it feeds that asset's risk prediction.
    const linkedAssetId = resolveAssetId({
      asset_id: body.assetId || body.asset_id,
      latitude: typeof body.latitude === "number" ? body.latitude : 16.5062,
      longitude: typeof body.longitude === "number" ? body.longitude : 80.648,
      category: body.category || "Road damage",
    });

    const created = createComplaint({
      title: body.title,
      category: body.category || "Road damage",
      ward: body.ward || "Ward 12",
      citizen: body.citizen || "Verified Citizen",
      citizen_id: body.citizen_id || "cit_1",
      severity: body.severity || "medium",
      status: body.status || "New",
      description: body.description || body.title,
      location: body.location || body.ward || "Municipal Zone",
      latitude: typeof body.latitude === "number" ? body.latitude : 16.5062,
      longitude: typeof body.longitude === "number" ? body.longitude : 80.648,
      image_url: body.imageUrl || body.image_url,
      image_description: body.imageDescription || body.image_description,
      ai_confidence: body.aiConfidence || body.ai_confidence || 90,
      asset_id: linkedAssetId || undefined,
    });

    // Broadcast realtime event to all listening clients (Authority Dashboard, Map, etc.)
    broadcastRealtimeEvent("complaint_created", created);
    // Re-score the affected infrastructure with the new complaint included (async, never blocks the response)
    scheduleRecalculation(resolveAssetId(created));

    res.status(201).json(created);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to create complaint" });
  }
});

// Update complaint status (Authority action)
apiRouter.patch("/complaints/:id/status", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const updated = updateComplaintStatus(id, status, resolutionNote);
    if (!updated) {
      return res.status(404).json({ error: `Complaint ${id} not found.` });
    }

    // Broadcast realtime event so Citizen Portal & Authority Dashboard update immediately
    broadcastRealtimeEvent("complaint_updated", updated);
    scheduleRecalculation(resolveAssetId(updated));

    res.json(updated);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to update complaint status" });
  }
});

// Get all infrastructure assets
apiRouter.get("/infrastructure", (_req: Request, res: Response) => {
  try {
    const list = getAllInfrastructure();
    res.json(list);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch infrastructure" });
  }
});

// Get single infrastructure asset
apiRouter.get("/infrastructure/:id", (req: Request, res: Response) => {
  try {
    const asset = getInfrastructureById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: "Infrastructure asset not found" });
    }
    res.json(asset);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to fetch asset" });
  }
});

// Update infrastructure asset status
apiRouter.patch("/infrastructure/:id/status", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const updated = updateInfrastructureStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json({ error: `Infrastructure ${id} not found.` });
    }

    broadcastRealtimeEvent("infrastructure_updated", updated);
    scheduleRecalculation(updated.id);
    res.json(updated);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to update infrastructure status" });
  }
});

// Image upload endpoint for camera captures and file uploads
apiRouter.post("/upload", upload.single("image"), (req: Request, res: Response) => {
  try {
    // If multipart file uploaded
    if (req.file) {
      const fileUrl = `/api/uploads/${req.file.filename}`;
      return res.status(201).json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    }

    // If base64 payload in JSON
    const { image, filename } = req.body || {};
    if (typeof image === "string" && image.startsWith("data:") && image.includes(";base64,")) {
      const [header, base64Data] = image.split(";base64,");
      if (base64Data) {
        const ext = header.includes("png") ? ".png" : ".jpg";
        const savedName =
          filename ||
          `camera-capture-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(path.join(UPLOADS_DIR, savedName), buffer);
        return res.status(201).json({
          success: true,
          url: `/api/uploads/${savedName}`,
          filename: savedName,
        });
      }
    }

    return res.status(400).json({ error: "No image provided in request." });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || "Failed to upload image" });
  }
});
