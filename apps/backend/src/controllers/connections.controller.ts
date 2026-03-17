/**
 * @module backend/controllers/connections.controller
 */

import type { Request, Response } from "express";
import type { Connection } from "@byteroute/shared";
import { z } from "zod";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import type { ConnectionHistoryFilters } from "../domain/connection/connection-repository.interface.js";
import type { TypedSocketServer } from "../services/connections.js";
import {
  enrichAndStoreConnections,
  storeRawConnections,
} from "../services/ingest.js";
import { resolveReporterIp } from "../utils/ip.js";
import {
  tryResolveTenantIdFromRequest,
  userHasTenantAccess,
} from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

type ConnectionsBody = {
  connections?: Partial<Connection>[];
};

function normalizeQueryString(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") {
    return undefined;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const connectionsBodySchema = z.object({
  connections: z.array(z.unknown()),
});

const historyFiltersSchema = z.object({
  q: z.preprocess(
    normalizeQueryString,
    z.string().optional(),
  ),
  status: z.preprocess((value) => {
    const raw = normalizeQueryString(value);
    return raw === "active" || raw === "inactive" ? raw : undefined;
  }, z.enum(["active", "inactive"]).optional()),
  protocol: z.preprocess(
    normalizeQueryString,
    z.string().optional(),
  ),
  from: z.preprocess((value) => {
    const raw = normalizeQueryString(value);
    if (!raw) {
      return undefined;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, z.date().optional()),
  to: z.preprocess((value) => {
    const raw = normalizeQueryString(value);
    if (!raw) {
      return undefined;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, z.date().optional()),
  limit: z.preprocess((value) => {
    const raw = normalizeQueryString(value);
    if (!raw) {
      return undefined;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return parsed;
  }, z.number().int().nonnegative().optional()),
  offset: z.preprocess((value) => {
    const raw = normalizeQueryString(value);
    if (!raw) {
      return undefined;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return parsed;
  }, z.number().int().nonnegative().optional()),
});

function parseHistoryFilters(req: Request): ConnectionHistoryFilters {
  const parsed = historyFiltersSchema.parse(req.query);
  const limit = Math.min(parsed.limit ?? 100, 500);

  return {
    q: parsed.q,
    status: parsed.status,
    protocol: parsed.protocol,
    from: parsed.from,
    to: parsed.to,
    limit,
    offset: parsed.offset ?? 0,
  };
}

/**
 * Creates connections controller.
 * @param ctx - The ctx input.
 */

export function createConnectionsController(ctx: AppContext) {
  return {
    ingest: async (req: Request, res: Response): Promise<void> => {
      const parsedBody = connectionsBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          error: "Invalid payload: expected { connections: Connection[] }",
        });
        return;
      }

      const body = parsedBody.data as ConnectionsBody;
      const connections = body.connections ?? [];

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

      const reporterIp = resolveReporterIp({
        reqIp: req.ip,
        reqIps: req.ips,
        xForwardedFor: req.headers["x-forwarded-for"],
        xRealIp: req.headers["x-real-ip"],
        remoteAddress: req.socket.remoteAddress,
      });

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

    searchHistory: async (req: Request, res: Response): Promise<void> => {
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

      const tenant = await ctx.tenantRepository.findByTenantId(tenantId);
      if (!tenant || tenant.ownerId !== principal.id) {
        res.status(403).json({ error: "Forbidden: no access to tenant" });
        return;
      }

      const result = await ctx.connectionRepository.loadHistory(
        tenantId,
        parseHistoryFilters(req),
      );

      res.status(200).json(result);
    },
  };
}

const defaultController = createConnectionsController(createAppContext());
export const postConnections = defaultController.ingest;
export const searchConnectionsHistory = defaultController.searchHistory;
