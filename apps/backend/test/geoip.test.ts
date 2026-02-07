import { describe, expect, it } from "vitest";
import { GeoIpService } from "../src/services/geoip.js";
import type { Connection } from "@byteroute/shared";
import { InMemoryGeoIpLookup } from "./mocks/geoip.js";

function baseConnection(overrides?: Partial<Connection>): Connection {
  const now = new Date().toISOString();
  return {
    id: "conn-test",
    sourceIp: "8.8.8.8",
    destIp: "1.1.1.1",
    sourcePort: 12345,
    destPort: 443,
    protocol: "TCP",
    status: "active",
    startTime: now,
    lastActivity: now,
    ...overrides,
  };
}

describe("geoip enrichment", () => {
  const geoip = new GeoIpService(
    new InMemoryGeoIpLookup({
      "8.8.8.8": {
        country: "United States",
        countryCode: "US",
        city: "Mountain View",
        latitude: 37.386,
        longitude: -122.0838,
        asn: 15169,
        asOrganization: "Google LLC",
      },
      "1.1.1.1": {
        country: "Australia",
        countryCode: "AU",
        city: "Sydney",
        latitude: -33.8688,
        longitude: 151.2093,
        asn: 13335,
        asOrganization: "Cloudflare, Inc.",
      },
    })
  );

  it("lookupIp returns empty object for invalid IP", async () => {
    const result = await geoip.lookupIp("not-an-ip");
    expect(result).toEqual({});
  });

  it("enrichConnection adds geo fields for a known public IP", async () => {
    const enriched = await geoip.enrichConnection(baseConnection({ sourceIp: "8.8.8.8" }));

    // Mocked enrichment should be stable.
    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("US");
    expect(enriched.asn).toBe(15169);
  });

  it("falls back to destIp when sourceIp is not enrichable", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "10.0.0.1",
        destIp: "8.8.8.8",
      })
    );

    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("US");
  });

  it("uses reporterIp when sourceIp is private", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "192.168.1.10",
        destIp: "not-an-ip",
      }),
      { reporterIp: "8.8.8.8" }
    );

    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("US");
  });

  it("does not override producer-provided geo fields", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "1.1.1.1",
        countryCode: "ZZ",
        country: "ProducerLand",
        city: "ProducerCity",
      })
    );

    expect(enriched.countryCode).toBe("ZZ");
    expect(enriched.country).toBe("ProducerLand");
    expect(enriched.city).toBe("ProducerCity");
  });

  it("enrichBatch preserves ordering and ids", async () => {
    const batch: Connection[] = [
      baseConnection({ id: "a", sourceIp: "8.8.8.8" }),
      baseConnection({ id: "b", sourceIp: "1.1.1.1" }),
      baseConnection({ id: "c", sourceIp: "not-an-ip", destIp: "not-an-ip" }),
    ];

    const enriched = await geoip.enrichBatch(batch);

    expect(enriched).toHaveLength(3);
    expect(enriched.map((c) => c.id)).toEqual(["a", "b", "c"]);

    expect(enriched[0]?.enriched).toBe(true);
    expect(enriched[1]?.enriched).toBe(true);
    expect(enriched[2]?.enriched).toBe(false);
  });
});
