import type { Request, Response } from "express";
import { metricsStore } from "../services/metrics.js";
import type { TimeSeriesData } from "@byteroute/shared";

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

    // Store the metrics
    metricsStore.addSnapshots(body.snapshots);

    res.status(202).json({
      received: body.snapshots.length,
      status: "processing",
    });
  } catch (error) {
    console.error("[Metrics] Error processing metrics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
