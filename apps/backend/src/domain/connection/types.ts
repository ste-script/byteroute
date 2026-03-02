import type { Connection, TrafficFlow } from "@byteroute/shared";

export type { Connection, TrafficFlow };

export type GeoIpEnrichment = {
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  asOrganization?: string;
};

export type IngestResult = {
  received: number;
  stored: number;
  enriched: number;
};
