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

/**
 * Checks whether any enrichment is satisfied.
 * @param enrichment - The enrichment input.
 * @returns True when any enrichment is satisfied.
 */

function hasAnyEnrichment(enrichment: GeoIpEnrichment): boolean {
  return Boolean(
    enrichment.countryCode ||
    enrichment.city ||
    enrichment.latitude ||
    enrichment.longitude ||
    enrichment.asn,
  );
}

/**
 * Represents a geo IP service.
 */

export class GeoIpService {
  /**
   * Creates a geo IP service.
   * @param geoIpLookup - The geo IP lookup input.
   */

  constructor(private readonly geoIpLookup: IGeoIpLookup) {}

  /**
   * Lookups IP.
   * @param ip - The IP input.
   * @returns The IP result.
   */

  lookupIp(ip: string): Promise<GeoIpEnrichment> {
    return this.geoIpLookup.lookup(ip);
  }

  /**
   * Enriches connection.
   * @param connection - The connection input.
   * @param context - The context input.
   * @returns The connection result.
   */

  async enrichConnection(
    connection: Connection,
    context: GeoIpContext = {},
  ): Promise<Connection> {
    const sourceIp = normalizeIp(connection.sourceIp) ?? connection.sourceIp;
    const destIp = normalizeIp(connection.destIp) ?? connection.destIp;
    const reporterIp = normalizeIp(context.reporterIp);

    let effectiveSourceIp = connection.sourceIp;
    if (
      sourceIp &&
      isPrivateIp(sourceIp) &&
      reporterIp &&
      !isPrivateIp(reporterIp)
    ) {
      effectiveSourceIp = reporterIp;
    }

    // Goal: establish the location of the *source network*.
    // - If sourceIp is public, geo-locate sourceIp.
    // - If sourceIp is private, use reporterIp (public WAN IP) when available.
    // - Otherwise fall back to destIp as a best-effort.

    let enrichment: GeoIpEnrichment = {};
    let destEnrichment: GeoIpEnrichment = {};

    if (sourceIp && !isPrivateIp(sourceIp)) {
      enrichment = await this.lookupIp(sourceIp);
    }

    if (
      !hasAnyEnrichment(enrichment) &&
      reporterIp &&
      !isPrivateIp(reporterIp)
    ) {
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
      sourceIp: effectiveSourceIp,
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

  /**
   * Enriches batch.
   * @param connections - The connections input.
   * @param context - The context input.
   * @returns The batch result.
   */

  enrichBatch(
    connections: Connection[],
    context: GeoIpContext = {},
  ): Promise<Connection[]> {
    return Promise.all(
      connections.map((connection) =>
        this.enrichConnection(connection, context),
      ),
    );
  }
}

const defaultGeoIpService = new GeoIpService(new MaxmindGeoIpLookup());

/**
 * Lookups IP.
 * @param ip - The IP input.
 * @returns The IP result.
 */

export async function lookupIp(ip: string): Promise<GeoIpEnrichment> {
  return defaultGeoIpService.lookupIp(ip);
}

/**
 * Enriches connection.
 * @param connection - The connection input.
 * @param context - The context input.
 * @returns The connection result.
 */

export async function enrichConnection(
  connection: Connection,
  context: GeoIpContext = {},
): Promise<Connection> {
  return defaultGeoIpService.enrichConnection(connection, context);
}

/**
 * Enriches batch.
 * @param connections - The connections input.
 * @param context - The context input.
 * @returns The batch result.
 */

export async function enrichBatch(
  connections: Connection[],
  context: GeoIpContext = {},
): Promise<Connection[]> {
  return defaultGeoIpService.enrichBatch(connections, context);
}
