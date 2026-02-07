import type { GeoIpEnrichment, GeoIpLookup } from "../../src/services/geoip.js";

export type InMemoryGeoIpLookupData = Record<string, GeoIpEnrichment>;

export class InMemoryGeoIpLookup implements GeoIpLookup {
  private readonly data: ReadonlyMap<string, GeoIpEnrichment>;

  constructor(data: InMemoryGeoIpLookupData = {}) {
    this.data = new Map(Object.entries(data));
  }

  async lookup(ip: string): Promise<GeoIpEnrichment> {
    const hit = this.data.get(ip);
    if (!hit) {
      return {};
    }

    // Return a shallow clone so callers can't mutate our stored fixtures.
    return { ...hit };
  }
}
