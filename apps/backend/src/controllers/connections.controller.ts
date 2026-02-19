import type { Request, Response } from "express";
import type { Connection } from "@byteroute/shared";
import type { TypedSocketServer } from "../services/connections.js";
import { enrichAndStoreConnections, storeRawConnections } from "../services/ingest.js";
import { normalizeIp, firstForwardedFor } from "../utils/ip.js";
import { resolveTenantContextFromRequest, userHasTenantAccess } from "../utils/tenant.js";
import { getPrincipal } from "../auth/principal.js";

type ConnectionsBody = {
  connections?: Partial<Connection>[];
};

export async function postConnections(req: Request, res: Response): Promise<void> {
  const body = req.body as ConnectionsBody;
  const connections = body?.connections;

  if (!Array.isArray(connections)) {
    res.status(400).json({ error: "Invalid payload: expected { connections: Connection[] }" });
    return;
  }

  const io = req.app.get("io") as TypedSocketServer | undefined;
  const { tenantId } = resolveTenantContextFromRequest(req);
  const principal = getPrincipal(req);

  if (!principal || !userHasTenantAccess(principal.tenantIds, tenantId)) {
    res.status(403).json({ error: "Forbidden: no access to tenant" });
    return;
  }

  // Immediate response to producer (fire-and-forget)
  res.status(202).json({ received: connections.length, status: "processing" });

  // Detect client IP from request (supports X-Forwarded-For)
  const reporterIp = firstForwardedFor(req.headers["x-forwarded-for"]) ?? normalizeIp(req.ip) ?? normalizeIp(req.socket.remoteAddress);

  void enrichAndStoreConnections(io, connections, { reporterIp, tenantId }).catch((err) => {
    console.error("Enrichment failed:", err);

    const fallbackWrite = storeRawConnections(connections, { tenantId });

    void fallbackWrite.catch((fallbackErr) => {
      console.error("Raw insert fallback failed:", fallbackErr);
    });
  });
}
