import type { Request, Response } from "express";
import type { Connection } from "@byteroute/shared";
import type { TypedSocketServer } from "../services/connections.js";
import { enrichAndStoreConnections, storeRawConnections } from "../services/ingest.js";

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

  // Immediate response to producer (fire-and-forget)
  res.status(202).json({ received: connections.length, status: "processing" });

  const io = req.app.get("io") as TypedSocketServer | undefined;

  void enrichAndStoreConnections(io, connections).catch((err) => {
    console.error("Enrichment failed:", err);

    void storeRawConnections(connections).catch((fallbackErr) => {
      console.error("Raw insert fallback failed:", fallbackErr);
    });
  });
}
