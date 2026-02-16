import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import { postConnections } from "../controllers/connections.controller.js";
import { postMetrics } from "../controllers/metrics.controller.js";
import { getTenants } from "../controllers/tenants.controller.js";
import { createClientToken, getCurrentUser, signIn, signOut, signUp } from "../controllers/auth.controller.js";
import { requireApiAuth } from "../middleware/auth.middleware.js";
import { requireCsrfForCookieAuth } from "../middleware/csrf.middleware.js";

const router = Router();

// Health check endpoint
router.get("/health", healthCheck);

// Authentication
router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.get("/auth/me", requireApiAuth, getCurrentUser);
router.post("/auth/client-token", requireApiAuth, requireCsrfForCookieAuth, createClientToken);
router.post("/auth/logout", signOut);

// Protect API endpoints
router.use("/api", requireApiAuth);
router.use("/api", requireCsrfForCookieAuth);

// Ingest connections (producer -> backend)
router.post("/api/connections", postConnections);

// Ingest metrics (client -> backend)
router.post("/api/metrics", postMetrics);

// Tenant discovery (dashboard)
router.get("/api/tenants", getTenants);

export default router;
