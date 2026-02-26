import type { Connection } from "@byteroute/shared";
import { ConnectionModel } from "@byteroute/shared";
import type { TypedSocketServer } from "./connections.js";
import { upsertConnectionsLocal, emitStatisticsUpdate, emitTrafficFlows } from "./connections.js";
import { enrichBatch } from "./geoip.js";
import { ensureTenantId } from "../utils/tenant.js";

type IngestResult = {
  received: number;
  stored: number;
  enriched: number;
};

export type IngestConnectionsOptions = {
  reporterIp?: string;
  tenantId?: string;
};

const ALLOWED_PROTOCOLS = new Set<Connection["protocol"]>(["TCP", "UDP", "ICMP", "OTHER"]);
const ALLOWED_STATUSES = new Set<Connection["status"]>(["active", "inactive"]);

let generatedIdCounter = 0;

function toIsoNow(): string {
  return new Date().toISOString();
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

function normalizeConnection(input: Partial<Connection>, tenantId: string): Connection {
  const nowIso = toIsoNow();

  const id =
    typeof input.id === "string" && input.id.trim().length > 0
      ? input.id
      : `ingest-${++generatedIdCounter}-${Date.now()}`;

  const protocol: Connection["protocol"] =
    input.protocol && ALLOWED_PROTOCOLS.has(input.protocol) ? input.protocol : "OTHER";

  const status: Connection["status"] =
    input.status && ALLOWED_STATUSES.has(input.status) ? input.status : "active";

  return {
    id,
    tenantId,
    sourceIp: input.sourceIp ?? "0.0.0.0",
    destIp: input.destIp ?? "0.0.0.0",
    sourcePort: input.sourcePort ?? 0,
    destPort: input.destPort ?? 0,
    protocol,
    status,
    startTime: input.startTime ?? nowIso,
    lastActivity: input.lastActivity ?? nowIso,
    duration: input.duration,

    enriched: input.enriched,
    country: input.country,
    countryCode: input.countryCode,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    asn: input.asn,
    asOrganization: input.asOrganization,
    destCountry: input.destCountry,
    destCountryCode: input.destCountryCode,
    destCity: input.destCity,
    destLatitude: input.destLatitude,
    destLongitude: input.destLongitude,
    bandwidth: input.bandwidth,
    bytesIn: input.bytesIn,
    bytesOut: input.bytesOut,
    packetsIn: input.packetsIn,
    packetsOut: input.packetsOut,
  };
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

  const enriched = await enrichBatch(normalized, { reporterIp: options.reporterIp });

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
  return upsertConnectionsInDb(normalized);
}
