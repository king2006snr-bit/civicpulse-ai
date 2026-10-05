import express from "express";
import cors from "cors";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/server/api";
import { getDb } from "./src/server/db";
import { startMlService } from "./src/server/ml-client";

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);
const isProd = process.env.NODE_ENV === "production";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize SQLite Database schema & seeds
getDb();

// Start the local ML prediction service (Python / scikit-learn) used by /api/predictions
startMlService();

// Mount API routes under /api
app.use("/api/uploads", express.static(path.resolve(process.cwd(), "data/uploads")));
app.use("/api", apiRouter);

// Frontend SPA delivery
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`CivicPulse AI Full-Stack Server running on http://0.0.0.0:${port}`);
});
