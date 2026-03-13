/**
 * @module backend/controllers/connections.controller
 */

import type { Request, Response } from "express";
import type { Connection } from "@byteroute/shared";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import type { TypedSocketServer } from "../services/connections.js";
import {
  enrichAndStoreConnections,
  storeRawConnections,
} from "../services/ingest.js";
import { normalizeIp, firstForwardedFor } from "../utils/ip.js";
import {
  tryResolveTenantIdFromRequest,
  userHasTenantAccess,
} from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

type ConnectionsBody = {
  connections?: Partial<Connection>[];
};

/**
 * Creates connections controller.
 * @param ctx - The ctx input.
 */

export function createConnectionsController(ctx: AppContext) {
  void ctx;
  return {
    ingest: async (req: Request, res: Response): Promise<void> => {
      const body = req.body as ConnectionsBody;
      const connections = body?.connections;

      if (!Array.isArray(connections)) {
        res.status(400).json({
          error: "Invalid payload: expected { connections: Connection[] }",
        });
        return;
      }

      const io = req.app.get("io") as TypedSocketServer | undefined;
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

      res
        .status(202)
        .json({ received: connections.length, status: "processing" });

      const reporterIp =
        firstForwardedFor(req.headers["x-forwarded-for"]) ??
        normalizeIp(req.ip) ??
        normalizeIp(req.socket.remoteAddress);

      void enrichAndStoreConnections(io, connections, {
        reporterIp,
        tenantId,
      }).catch((err) => {
        console.error("Enrichment failed:", err);

        const fallbackWrite = storeRawConnections(connections, { tenantId });

        void fallbackWrite.catch((fallbackErr) => {
          console.error("Raw insert fallback failed:", fallbackErr);
        });
      });
    },
  };
}

const defaultController = createConnectionsController(createAppContext());
export const postConnections = defaultController.ingest;
