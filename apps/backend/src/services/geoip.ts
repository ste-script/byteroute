/**
 * @module backend/services/geoip
 */

import type { Connection } from "@byteroute/shared";
import { isPrivateIp, normalizeIp } from "../utils/ip.js";
import type { IGeoIpLookup } from "../domain/connection/geoip-service.interface.js";
import type { GeoIpEnrichment } from "../domain/connection/types.js";
import { MaxmindGeoIpLookup } from "../infrastructure/geoip/maxmind-geoip.service.js";

export type GeoIpLookup = IGeoIpLookup;
export type { GeoIpEnrichment };
export { MaxmindGeoIpLookup };

export type GeoIpContext = {
  reporterIp?: string;
};

function hasAnyEnrichment(enrichment: GeoIpEnrichment): boolean {
  return Boolean(
    enrichment.countryCode || enrichment.city || enrichment.latitude || enrichment.longitude || enrichment.asn
  );
}

export class GeoIpService {
  constructor(private readonly geoIpLookup: IGeoIpLookup) {}

  lookupIp(ip: string): Promise<GeoIpEnrichment> {
    return this.geoIpLookup.lookup(ip);
  }

  async enrichConnection(connection: Connection, context: GeoIpContext = {}): Promise<Connection> {
    const sourceIp = normalizeIp(connection.sourceIp) ?? connection.sourceIp;
    const destIp = normalizeIp(connection.destIp) ?? connection.destIp;
    const reporterIp = normalizeIp(context.reporterIp);

    // Goal: establish the location of the *source network*.
    // - If sourceIp is public, geo-locate sourceIp.
    // - If sourceIp is private, use reporterIp (public WAN IP) when available.
    // - Otherwise fall back to destIp as a best-effort.

    let enrichment: GeoIpEnrichment = {};
    let destEnrichment: GeoIpEnrichment = {};

    if (sourceIp && !isPrivateIp(sourceIp)) {
      enrichment = await this.lookupIp(sourceIp);
    }

    if (!hasAnyEnrichment(enrichment) && reporterIp && !isPrivateIp(reporterIp)) {
      enrichment = await this.lookupIp(reporterIp);
    }

    if (!hasAnyEnrichment(enrichment) && destIp && !isPrivateIp(destIp)) {
      enrichment = await this.lookupIp(destIp);
    }

    // Enrich destination IP independently for traffic flow targets
    if (destIp && !isPrivateIp(destIp)) {
      destEnrichment = await this.lookupIp(destIp);
    }

    const enriched: Connection = {
      ...connection,
      // Fill missing source geo fields (don't override if producer already provided values)
      country: connection.country ?? enrichment.country,
      countryCode: connection.countryCode ?? enrichment.countryCode,
      city: connection.city ?? enrichment.city,
      latitude: connection.latitude ?? enrichment.latitude,
      longitude: connection.longitude ?? enrichment.longitude,
      asn: connection.asn ?? enrichment.asn,
      asOrganization: connection.asOrganization ?? enrichment.asOrganization,
      // Fill missing destination geo fields
      destCountry: connection.destCountry ?? destEnrichment.country,
      destCountryCode: connection.destCountryCode ?? destEnrichment.countryCode,
      destCity: connection.destCity ?? destEnrichment.city,
      destLatitude: connection.destLatitude ?? destEnrichment.latitude,
      destLongitude: connection.destLongitude ?? destEnrichment.longitude,
      enriched: hasAnyEnrichment(enrichment),
    };

    return enriched;
  }

  enrichBatch(connections: Connection[], context: GeoIpContext = {}): Promise<Connection[]> {
    return Promise.all(connections.map((connection) => this.enrichConnection(connection, context)));
  }
}

const defaultGeoIpService = new GeoIpService(new MaxmindGeoIpLookup());

export async function lookupIp(ip: string): Promise<GeoIpEnrichment> {
  return defaultGeoIpService.lookupIp(ip);
}

export async function enrichConnection(connection: Connection, context: GeoIpContext = {}): Promise<Connection> {
  return defaultGeoIpService.enrichConnection(connection, context);
}

export async function enrichBatch(connections: Connection[], context: GeoIpContext = {}): Promise<Connection[]> {
  return defaultGeoIpService.enrichBatch(connections, context);
}
