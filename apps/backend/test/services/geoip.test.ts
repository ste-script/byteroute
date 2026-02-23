import { describe, expect, it } from "vitest";
import { GeoIpService } from "../../src/services/geoip.js";
import type { Connection } from "@byteroute/shared";
import { InMemoryGeoIpLookup } from "../mocks/geoip.js";

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

  it("handles empty string IPs gracefully", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "",
        destIp: "",
      })
    );

    expect(enriched.enriched).toBe(false);
  });

  it("handles connections with all geo fields already populated", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "8.8.8.8",
        country: "France",
        countryCode: "FR",
        city: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        asn: 12345,
        asOrganization: "Custom Org"
      })
    );

    // Should not override any existing fields
    expect(enriched.country).toBe("France");
    expect(enriched.countryCode).toBe("FR");
    expect(enriched.city).toBe("Paris");
    expect(enriched.latitude).toBe(48.8566);
    expect(enriched.longitude).toBe(2.3522);
    expect(enriched.asn).toBe(12345);
    expect(enriched.asOrganization).toBe("Custom Org");
  });

  it("handles reporterIp that is private", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "192.168.1.1",
        destIp: "8.8.8.8",
      }),
      { reporterIp: "10.0.0.1" } // Private IP
    );

    // Should fall back to destIp
    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("US");
  });

  it("handles undefined reporterIp", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "192.168.1.1",
        destIp: "8.8.8.8",
      }),
      { reporterIp: undefined }
    );

    // Should fall back to destIp
    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("US");
  });

  it("handles all private IPs", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "192.168.1.1",
        destIp: "10.0.0.1",
      }),
      { reporterIp: "172.16.0.1" }
    );

    // No enrichment possible
    expect(enriched.enriched).toBe(false);
  });

  it("enrichBatch handles large batches", async () => {
    const batch = Array.from({ length: 100 }, (_, i) =>
      baseConnection({
        id: `conn-${i}`,
        sourceIp: i % 2 === 0 ? "8.8.8.8" : "1.1.1.1"
      })
    );

    const enriched = await geoip.enrichBatch(batch);

    expect(enriched).toHaveLength(100);
    expect(enriched.every(c => c.enriched)).toBe(true);

    // Check alternating enrichments
    expect(enriched[0]?.countryCode).toBe("US");
    expect(enriched[1]?.countryCode).toBe("AU");
    expect(enriched[2]?.countryCode).toBe("US");
  });

  it("enrichBatch handles empty array", async () => {
    const enriched = await geoip.enrichBatch([]);

    expect(enriched).toEqual([]);
  });

  it("enrichBatch handles single connection", async () => {
    const batch = [baseConnection({ sourceIp: "8.8.8.8" })];
    const enriched = await geoip.enrichBatch(batch);

    expect(enriched).toHaveLength(1);
    expect(enriched[0]?.enriched).toBe(true);
  });

  it("preserves all original connection fields", async () => {
    const original = baseConnection({
      sourceIp: "8.8.8.8",
      bytesIn: 1024,
      bytesOut: 2048,
      packetsIn: 10,
      packetsOut: 20
    });

    const enriched = await geoip.enrichConnection(original);

    expect(enriched.id).toBe(original.id);
    expect(enriched.sourceIp).toBe(original.sourceIp);
    expect(enriched.destIp).toBe(original.destIp);
    expect(enriched.sourcePort).toBe(original.sourcePort);
    expect(enriched.destPort).toBe(original.destPort);
    expect(enriched.protocol).toBe(original.protocol);
    expect(enriched.status).toBe(original.status);
    expect(enriched.bytesIn).toBe(1024);
    expect(enriched.bytesOut).toBe(2048);
    expect(enriched.packetsIn).toBe(10);
    expect(enriched.packetsOut).toBe(20);
  });

  it("handles partial geo data from lookup", async () => {
    // Create a lookup that returns partial data
    const partialGeoip = new GeoIpService(
      new InMemoryGeoIpLookup({
        "9.9.9.9": {
          countryCode: "XX",
          // No other fields
        }
      })
    );

    const enriched = await partialGeoip.enrichConnection(
      baseConnection({ sourceIp: "9.9.9.9" })
    );

    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBe("XX");
    expect(enriched.country).toBeUndefined();
    expect(enriched.city).toBeUndefined();
  });

  it("lookupIp returns empty object for empty string", async () => {
    const result = await geoip.lookupIp("");
    expect(result).toEqual({});
  });

  it("populates dest geo fields from destIp when it is public", async () => {
    // sourceIp: 8.8.8.8 (US), destIp: 1.1.1.1 (AU)
    const enriched = await geoip.enrichConnection(
      baseConnection({ sourceIp: "8.8.8.8", destIp: "1.1.1.1" })
    );

    expect(enriched.destCountry).toBe("Australia");
    expect(enriched.destCountryCode).toBe("AU");
    expect(enriched.destCity).toBe("Sydney");
    expect(enriched.destLatitude).toBeCloseTo(-33.8688);
    expect(enriched.destLongitude).toBeCloseTo(151.2093);
  });

  it("does not populate dest geo fields when destIp is private", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({ sourceIp: "8.8.8.8", destIp: "192.168.1.1" })
    );

    expect(enriched.destCountry).toBeUndefined();
    expect(enriched.destLatitude).toBeUndefined();
    expect(enriched.destLongitude).toBeUndefined();
  });

  it("does not override producer-provided dest geo fields", async () => {
    const enriched = await geoip.enrichConnection(
      baseConnection({
        sourceIp: "8.8.8.8",
        destIp: "1.1.1.1",
        destCountry: "ProducerDest",
        destCountryCode: "ZZ",
        destCity: "ProducerDestCity",
        destLatitude: 10,
        destLongitude: 20,
      })
    );

    expect(enriched.destCountry).toBe("ProducerDest");
    expect(enriched.destCountryCode).toBe("ZZ");
    expect(enriched.destCity).toBe("ProducerDestCity");
    expect(enriched.destLatitude).toBe(10);
    expect(enriched.destLongitude).toBe(20);
  });

  it("enrichBatch with context", async () => {
    const batch = [
      baseConnection({
        id: "a",
        sourceIp: "192.168.1.1",
        destIp: "not-an-ip"
      })
    ];

    const enriched = await geoip.enrichBatch(batch, { reporterIp: "8.8.8.8" });

    expect(enriched[0]?.enriched).toBe(true);
    expect(enriched[0]?.countryCode).toBe("US");
  });
});
