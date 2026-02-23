import { Reader, type ReaderModel } from "@maxmind/geoip2-node";
import { fileURLToPath } from "node:url";
import type { Connection } from "@byteroute/shared";
import { isPrivateIp, normalizeIp } from "../utils/ip.js";

export type GeoIpEnrichment = {
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  asOrganization?: string;
};

export type GeoIpLookup = {
  lookup(ip: string): Promise<GeoIpEnrichment>;
};

function cityDbPath(): string {
  return fileURLToPath(new URL("../../databases/GeoLite2-City.mmdb", import.meta.url));
}

function asnDbPath(): string {
  return fileURLToPath(new URL("../../databases/GeoLite2-ASN.mmdb", import.meta.url));
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export class MaxmindGeoIpLookup implements GeoIpLookup {
  private readersPromise:
    | Promise<{
        city: ReaderModel;
        asn: ReaderModel;
      }>
    | undefined;

  async lookup(ip: string): Promise<GeoIpEnrichment> {
    const trimmedIp = safeString(ip);
    if (!trimmedIp) {
      return {};
    }

    const { city, asn } = await this.getReaders();

    let cityResult: ReturnType<ReaderModel["city"]> | undefined;
    let asnResult: ReturnType<ReaderModel["asn"]> | undefined;

    try {
      cityResult = city.city(trimmedIp);
    } catch {
      // Not found / invalid IP
    }

    try {
      asnResult = asn.asn(trimmedIp);
    } catch {
      // Not found / invalid IP
    }

    return {
      country: safeString(cityResult?.country?.names?.en),
      countryCode: safeString(cityResult?.country?.isoCode),
      city: safeString(cityResult?.city?.names?.en),
      latitude: safeNumber(cityResult?.location?.latitude),
      longitude: safeNumber(cityResult?.location?.longitude),
      asn: safeNumber(asnResult?.autonomousSystemNumber),
      asOrganization: safeString(asnResult?.autonomousSystemOrganization),
    };
  }

  private async getReaders(): Promise<{ city: ReaderModel; asn: ReaderModel }> {
    if (!this.readersPromise) {
      this.readersPromise = Promise.all([Reader.open(cityDbPath()), Reader.open(asnDbPath())])
        .then(([city, asn]) => ({ city, asn }))
        .catch((err) => {
          this.readersPromise = undefined;
          throw err;
        });
    }

    return this.readersPromise;
  }
}

export type GeoIpContext = {
  reporterIp?: string;
};

function hasAnyEnrichment(enrichment: GeoIpEnrichment): boolean {
  return Boolean(
    enrichment.countryCode || enrichment.city || enrichment.latitude || enrichment.longitude || enrichment.asn
  );
}

export class GeoIpService {
  constructor(private readonly geoIpLookup: GeoIpLookup) {}

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

    if (sourceIp && !isPrivateIp(sourceIp)) {
      enrichment = await this.lookupIp(sourceIp);
    }

    if (!hasAnyEnrichment(enrichment) && reporterIp && !isPrivateIp(reporterIp)) {
      enrichment = await this.lookupIp(reporterIp);
    }

    if (!hasAnyEnrichment(enrichment) && destIp && !isPrivateIp(destIp)) {
      enrichment = await this.lookupIp(destIp);
    }

    const enriched: Connection = {
      ...connection,
      // Fill missing geo fields (don’t override if producer already provided values)
      country: connection.country ?? enrichment.country,
      countryCode: connection.countryCode ?? enrichment.countryCode,
      city: connection.city ?? enrichment.city,
      latitude: connection.latitude ?? enrichment.latitude,
      longitude: connection.longitude ?? enrichment.longitude,
      asn: connection.asn ?? enrichment.asn,
      asOrganization: connection.asOrganization ?? enrichment.asOrganization,
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
