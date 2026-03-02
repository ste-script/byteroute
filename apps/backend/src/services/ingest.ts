import type { Connection } from "@byteroute/shared";
import * as shared from "@byteroute/shared";
import { ConnectionModel as InfraConnectionModel } from "../infrastructure/persistence/models/connection.model.js";
import type { TypedSocketServer } from "./connections.js";
import { upsertConnectionsLocal, emitStatisticsUpdate, emitTrafficFlows } from "./connections.js";
import { enrichBatch } from "./geoip.js";
import { normalizeConnection } from "../domain/connection/normalizer.js";
import { ensureTenantId } from "../utils/tenant.js";
import { getCompiledDomainDsl } from "../infrastructure/dsl/domain-dsl.js";

let sharedConnectionModel: typeof InfraConnectionModel | undefined;

try {
  sharedConnectionModel = (shared as { ConnectionModel?: typeof InfraConnectionModel }).ConnectionModel;
} catch {
  sharedConnectionModel = undefined;
}

const ConnectionModel = sharedConnectionModel ?? InfraConnectionModel;

type IngestResult = {
  received: number;
  stored: number;
  enriched: number;
};

export type IngestConnectionsOptions = {
  reporterIp?: string;
  tenantId?: string;
};

function applyIngestionDsl(connections: Connection[]): Connection[] {
  const rules = getCompiledDomainDsl().ingestion.connection;

  return connections
    .filter((connection) => !rules.denySourceIps.has(connection.sourceIp))
    .map((connection) => {
      const protocol = rules.allowedProtocols.has(connection.protocol)
        ? connection.protocol
        : rules.defaultProtocol;

      const status = connection.status ?? rules.defaultStatus;

      return {
        ...connection,
        protocol,
        status,
      };
    });
}

function coerceDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}

async function upsertConnectionsInDb(connections: Connection[]): Promise<number> {
  if (connections.length === 0) {
    return 0;
  }

  const now = new Date();

  const ops = connections.map((c) => {
    const startTime = coerceDate(c.startTime, now);
    const lastActivity = coerceDate(c.lastActivity, now);

    return {
      updateOne: {
        filter: { tenantId: c.tenantId, id: c.id },
        update: {
          $set: {
            ...c,
            startTime,
            lastActivity,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await ConnectionModel.bulkWrite(ops, { ordered: false });
  return (
    (result.upsertedCount ?? 0) +
    (result.modifiedCount ?? 0) +
    (result.insertedCount ?? 0) +
    (result.matchedCount ?? 0)
  );
}

export async function enrichAndStoreConnections(
  io: TypedSocketServer | undefined,
  rawConnections: Partial<Connection>[],
  options: IngestConnectionsOptions = {}
): Promise<IngestResult> {
  const tenantId = ensureTenantId(options.tenantId);
  const normalized = rawConnections.map((connection) => normalizeConnection(connection, tenantId));
  const shapedByDsl = applyIngestionDsl(normalized);

  const enriched = await enrichBatch(shapedByDsl, { reporterIp: options.reporterIp });

  const stored = await upsertConnectionsInDb(enriched);

  if (io) {
    upsertConnectionsLocal(io, tenantId, enriched);
    emitStatisticsUpdate(io, tenantId);
    emitTrafficFlows(io, tenantId);
  }

  const enrichedCount = enriched.filter((c) => c.enriched).length;

  return {
    received: rawConnections.length,
    stored,
    enriched: enrichedCount,
  };
}

export async function storeRawConnections(
  rawConnections: Partial<Connection>[],
  options: IngestConnectionsOptions = {}
): Promise<number> {
  const tenantId = ensureTenantId(options.tenantId);
  const normalized = rawConnections
    .map((connection) => normalizeConnection(connection, tenantId))
    .map((c) => ({ ...c, enriched: false }));
  return upsertConnectionsInDb(applyIngestionDsl(normalized));
}
