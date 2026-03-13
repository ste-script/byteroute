/**
 * @module backend/controllers/metrics.controller
 */

import type { Request, Response } from "express";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import type { TimeSeriesData } from "@byteroute/shared";
import {
  tryResolveTenantIdFromRequest,
  userHasTenantAccess,
} from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

interface MetricsRequestBody {
  snapshots: TimeSeriesData[];
}

/**
 * Creates metrics controller.
 * @param ctx - The ctx input.
 */

export function createMetricsController(ctx: AppContext) {
  return {
    ingest: async (req: Request, res: Response): Promise<void> => {
      try {
        const body = req.body as MetricsRequestBody;

        if (!body.snapshots || !Array.isArray(body.snapshots)) {
          res
            .status(400)
            .json({ error: "Invalid request: snapshots array required" });
          return;
        }

        const principal = getPrincipal(req);
        const tenantId = tryResolveTenantIdFromRequest(req);

        if (!tenantId) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        if (!principal || !userHasTenantAccess(principal.tenantIds, tenantId)) {
          res.status(403).json({ error: "Forbidden: no access to tenant" });
          return;
        }

        ctx.metricsStore.addSnapshots(tenantId, body.snapshots);

        res.status(202).json({
          received: body.snapshots.length,
          status: "processing",
        });
      } catch (error) {
        console.error("[Metrics] Error processing metrics:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  };
}

const defaultController = createMetricsController(createAppContext());
export const postMetrics = defaultController.ingest;
