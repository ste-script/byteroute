import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import { postConnections } from "../controllers/connections.controller.js";
import { postMetrics } from "../controllers/metrics.controller.js";
import { getTenants } from "../controllers/tenants.controller.js";
import { signIn, signUp } from "../controllers/auth.controller.js";
import { requireApiAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Health check endpoint
router.get("/health", healthCheck);

// Authentication
router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);

// Protect API endpoints
router.use("/api", requireApiAuth);

// Ingest connections (producer -> backend)
router.post("/api/connections", postConnections);

// Ingest metrics (client -> backend)
router.post("/api/metrics", postMetrics);

// Tenant discovery (dashboard)
router.get("/api/tenants", getTenants);

export default router;
