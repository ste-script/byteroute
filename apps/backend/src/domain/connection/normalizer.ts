/**
 * @module backend/domain/connection/normalizer
 */

import type { Connection } from "./types.js";

const ALLOWED_PROTOCOLS = new Set<Connection["protocol"]>([
  "TCP",
  "UDP",
  "ICMP",
  "OTHER",
]);
const ALLOWED_STATUSES = new Set<Connection["status"]>(["active", "inactive"]);

let generatedIdCounter = 0;

/**
 * Toes iso now.
 * @returns The iso now result.
 */

function toIsoNow(): string {
  return new Date().toISOString();
}

/**
 * Normalizes connection.
 * @param input - The input input.
 * @param tenantId - The tenant ID input.
 * @returns The connection result.
 */

export function normalizeConnection(
  input: Partial<Connection>,
  tenantId: string,
): Connection {
  const nowIso = toIsoNow();

  const id =
    typeof input.id === "string" && input.id.trim().length > 0
      ? input.id
      : `ingest-${++generatedIdCounter}-${Date.now()}`;

  const protocol: Connection["protocol"] =
    input.protocol && ALLOWED_PROTOCOLS.has(input.protocol)
      ? input.protocol
      : "OTHER";

  const status: Connection["status"] =
    input.status && ALLOWED_STATUSES.has(input.status)
      ? input.status
      : "active";

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
