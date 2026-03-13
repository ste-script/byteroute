/**
 * @module backend/domain/connection/geoip-service.interface
 */

import type { GeoIpEnrichment } from "./types.js";

export interface IGeoIpLookup {
  lookup(ip: string): Promise<GeoIpEnrichment>;
}
