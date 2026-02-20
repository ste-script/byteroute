import type { Request, Response } from "express";
import { metricsStore } from "../services/metrics.js";
import type { TimeSeriesData } from "@byteroute/shared";
import { resolveTenantIdFromRequest, userHasTenantAccess } from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

interface MetricsRequestBody {
  snapshots: TimeSeriesData[];
}

export async function postMetrics(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as MetricsRequestBody;

    if (!body.snapshots || !Array.isArray(body.snapshots)) {
      res.status(400).json({ error: "Invalid request: snapshots array required" });
      return;
    }

    const tenantId = resolveTenantIdFromRequest(req);
    const principal = getPrincipal(req);

    if (!principal || !userHasTenantAccess(principal.tenantIds, tenantId)) {
      res.status(403).json({ error: "Forbidden: no access to tenant" });
      return;
    }

    // Store the metrics
    metricsStore.addSnapshots(tenantId, body.snapshots);

    res.status(202).json({
      received: body.snapshots.length,
      status: "processing",
    });
  } catch (error) {
    console.error("[Metrics] Error processing metrics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
