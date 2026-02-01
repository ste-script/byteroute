import { Reader, type ReaderModel } from "@maxmind/geoip2-node";
import { fileURLToPath } from "node:url";
import type { Connection } from "@byteroute/shared";

export type GeoIpEnrichment = {
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  asOrganization?: string;
};

function cityDbPath(): string {
  return fileURLToPath(new URL("../../databases/GeoLite2-City.mmdb", import.meta.url));
}

function asnDbPath(): string {
  return fileURLToPath(new URL("../../databases/GeoLite2-ASN.mmdb", import.meta.url));
}

let readersPromise:
  | Promise<{
      city: ReaderModel;
      asn: ReaderModel;
    }>
  | undefined;

async function getReaders(): Promise<{ city: ReaderModel; asn: ReaderModel }> {
  if (!readersPromise) {
    readersPromise = Promise.all([Reader.open(cityDbPath()), Reader.open(asnDbPath())])
      .then(([city, asn]) => ({ city, asn }))
      .catch((err) => {
        readersPromise = undefined;
        throw err;
      });
  }

  return readersPromise;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function lookupIp(ip: string): Promise<GeoIpEnrichment> {
  const trimmedIp = safeString(ip);
  if (!trimmedIp) {
    return {};
  }

  const { city, asn } = await getReaders();

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

export async function enrichConnection(connection: Connection): Promise<Connection> {
  const enrichment = await lookupIp(connection.sourceIp);

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
    enriched: Boolean(
      enrichment.countryCode || enrichment.city || enrichment.latitude || enrichment.longitude || enrichment.asn
    ),
  };

  return enriched;
}

export async function enrichBatch(connections: Connection[]): Promise<Connection[]> {
  const concurrency = 20;
  const results = new Array<Connection>(connections.length);

  let index = 0;
  const workerCount = Math.min(concurrency, connections.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const current = index++;
      if (current >= connections.length) {
        return;
      }
      results[current] = await enrichConnection(connections[current]!);
    }
  });

  await Promise.all(workers);
  return results;
}
