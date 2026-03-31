/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module backend/controllers/metrics.controller
 */

import type { Request, Response } from "express";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import type { TimeSeriesData } from "@byteroute/shared";
import { z } from "zod";
import {
  tryResolveTenantIdFromRequest,
  userHasTenantAccess,
} from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

interface MetricsRequestBody {
  snapshots: TimeSeriesData[];
}

const metricsRequestBodySchema = z.object({
  snapshots: z.array(z.unknown()),
});

/**
 * Creates metrics controller.
 * @param ctx - The ctx input.
 */

export function createMetricsController(ctx: AppContext) {
  return {
    ingest: async (req: Request, res: Response): Promise<void> => {
      try {
        const parsedBody = metricsRequestBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
          res
            .status(400)
            .json({ error: "Invalid request: snapshots array required" });
          return;
        }
        const body = parsedBody.data as MetricsRequestBody;

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
