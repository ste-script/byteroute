/**
 * @module backend/infrastructure/geoip/maxmind-geoip.service
 */

import { Reader, type ReaderModel } from "@maxmind/geoip2-node";
import { fileURLToPath } from "node:url";
import type { IGeoIpLookup } from "../../domain/connection/geoip-service.interface.js";
import type { GeoIpEnrichment } from "../../domain/connection/types.js";

function cityDbPath(): string {
  return fileURLToPath(new URL("../../../databases/GeoLite2-City.mmdb", import.meta.url));
}

function asnDbPath(): string {
  return fileURLToPath(new URL("../../../databases/GeoLite2-ASN.mmdb", import.meta.url));
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export class MaxmindGeoIpLookup implements IGeoIpLookup {
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
