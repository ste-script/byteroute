/**
 * @module backend/routes/index
 */

import { Router } from "express";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import { healthCheck } from "../controllers/health.controller.js";
import * as connectionsControllerModule from "../controllers/connections.controller.js";
import * as metricsControllerModule from "../controllers/metrics.controller.js";
import * as tenantsControllerModule from "../controllers/tenants.controller.js";
import * as authControllerModule from "../controllers/auth.controller.js";
import * as authMiddlewareModule from "../middleware/auth.middleware.js";
import * as csrfMiddlewareModule from "../middleware/csrf.middleware.js";

/**
 * Gets optional.
 * @param resolver - The resolver input.
 * @returns The optional.
 */

function getOptional<T>(resolver: () => T): T | undefined {
  try {
    return resolver();
  } catch {
    return undefined;
  }
}

/**
 * Creates routes.
 * @param ctx - The ctx input.
 * @returns The routes result.
 */

export function createRoutes(ctx: AppContext): Router {
  const router = Router();
  const createAuthController = getOptional(
    () => authControllerModule.createAuthController,
  );
  const createConnectionsController = getOptional(
    () => connectionsControllerModule.createConnectionsController,
  );
  const createMetricsController = getOptional(
    () => metricsControllerModule.createMetricsController,
  );
  const createTenantsController = getOptional(
    () => tenantsControllerModule.createTenantsController,
  );
  const createAuthMiddleware = getOptional(
    () => authMiddlewareModule.createAuthMiddleware,
  );
  const requireApiAuthLegacy = getOptional(
    () => authMiddlewareModule.requireApiAuth,
  );
  const requireCsrfForCookieAuth = getOptional(
    () => csrfMiddlewareModule.requireCsrfForCookieAuth,
  );

  const authController =
    typeof createAuthController === "function"
      ? createAuthController(ctx)
      : {
          signUp: authControllerModule.signUp,
          signIn: authControllerModule.signIn,
          signOut: authControllerModule.signOut,
          currentUser: authControllerModule.getCurrentUser,
          clientToken: authControllerModule.createClientToken,
        };
  const connectionsController =
    typeof createConnectionsController === "function"
      ? createConnectionsController(ctx)
      : {
          ingest: connectionsControllerModule.postConnections,
          searchHistory: connectionsControllerModule.searchConnectionsHistory,
        };
  const metricsController =
    typeof createMetricsController === "function"
      ? createMetricsController(ctx)
      : { ingest: metricsControllerModule.postMetrics };
  const tenantsController =
    typeof createTenantsController === "function"
      ? createTenantsController(ctx)
      : {
          list: tenantsControllerModule.getTenants,
          create: tenantsControllerModule.createTenant,
          remove: tenantsControllerModule.deleteTenant,
        };
  const requireApiAuth =
    requireApiAuthLegacy ??
    (typeof createAuthMiddleware === "function"
      ? createAuthMiddleware(ctx)
      : undefined);

  if (!requireApiAuth) {
    throw new Error("Authentication middleware is not available");
  }

  if (!requireCsrfForCookieAuth) {
    throw new Error("CSRF middleware is not available");
  }

  router.get("/health", healthCheck);
  router.use(requireCsrfForCookieAuth);

  router.post("/auth/signup", authController.signUp);
  router.post("/auth/signin", authController.signIn);
  router.get("/auth/me", requireApiAuth, authController.currentUser);
  router.post("/auth/client-token", requireApiAuth, authController.clientToken);
  router.post("/auth/logout", authController.signOut);

  router.use("/api", requireApiAuth);

  router.post("/api/connections", connectionsController.ingest);
  router.get("/api/connections/history", connectionsController.searchHistory);

  router.post("/api/metrics", metricsController.ingest);

  router.get("/api/tenants", tenantsController.list);
  router.post("/api/tenants", tenantsController.create);
  router.delete("/api/tenants/:tenantId", tenantsController.remove);

  return router;
}

export default createRoutes(createAppContext());
