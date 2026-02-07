import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import { postConnections } from "../controllers/connections.controller.js";
import { postMetrics } from "../controllers/metrics.controller.js";

const router = Router();

// Health check endpoint
router.get("/health", healthCheck);

// Ingest connections (producer -> backend)
router.post("/api/connections", postConnections);

// Ingest metrics (client -> backend)
router.post("/api/metrics", postMetrics);

export default router;
