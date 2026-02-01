import { describe, expect, it } from "vitest";
import { enrichBatch, enrichConnection, lookupIp } from "../src/services/geoip.js";
import type { Connection } from "@byteroute/shared";

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
  it("lookupIp returns empty object for invalid IP", async () => {
    const result = await lookupIp("not-an-ip");
    expect(result).toEqual({});
  });

  it("enrichConnection adds geo fields for a known public IP", async () => {
    const enriched = await enrichConnection(baseConnection({ sourceIp: "8.8.8.8" }));

    // GeoLite2 content can change over time; keep assertions resilient.
    expect(enriched.enriched).toBe(true);
    expect(enriched.countryCode).toBeTypeOf("string");
    expect(enriched.countryCode?.length).toBeGreaterThanOrEqual(2);

    // ASN for 8.8.8.8 is typically Google; allow for DB drift but require a number.
    expect(enriched.asn === undefined || Number.isFinite(enriched.asn)).toBe(true);
  });

  it("does not override producer-provided geo fields", async () => {
    const enriched = await enrichConnection(
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
      baseConnection({ id: "c", sourceIp: "not-an-ip" }),
    ];

    const enriched = await enrichBatch(batch);

    expect(enriched).toHaveLength(3);
    expect(enriched.map((c) => c.id)).toEqual(["a", "b", "c"]);

    expect(enriched[0]?.enriched).toBe(true);
    expect(enriched[1]?.enriched).toBe(true);
    expect(enriched[2]?.enriched).toBe(false);
  });
});
