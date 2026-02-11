import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn()
}));

vi.mock("@maxmind/geoip2-node", () => ({
  Reader: {
    open: mocks.open
  }
}));

import { Reader } from "@maxmind/geoip2-node";
import type { Connection } from "@byteroute/shared";

const baseConnection = (overrides?: Partial<Connection>): Connection => {
  const now = new Date().toISOString();
  return {
    id: "conn-1",
    sourceIp: "8.8.8.8",
    destIp: "1.1.1.1",
    sourcePort: 1234,
    destPort: 443,
    protocol: "TCP",
    status: "active",
    startTime: now,
    lastActivity: now,
    ...overrides
  };
};

describe("MaxmindGeoIpLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns enrichment from readers", async () => {
    const cityReader = {
      city: vi.fn(() => ({
        country: { names: { en: "United States" }, isoCode: "US" },
        city: { names: { en: "Mountain View" } },
        location: { latitude: 37.386, longitude: -122.0838 }
      }))
    };

    const asnReader = {
      asn: vi.fn(() => ({
        autonomousSystemNumber: 15169,
        autonomousSystemOrganization: "Google LLC"
      }))
    };

    vi.mocked(Reader.open)
      .mockResolvedValueOnce(cityReader as any)
      .mockResolvedValueOnce(asnReader as any);

    const { MaxmindGeoIpLookup } = await import("../../src/services/geoip.js");
    const lookup = new MaxmindGeoIpLookup();
    const result = await lookup.lookup("8.8.8.8");

    expect(result).toEqual({
      country: "United States",
      countryCode: "US",
      city: "Mountain View",
      latitude: 37.386,
      longitude: -122.0838,
      asn: 15169,
      asOrganization: "Google LLC"
    });
  });

  it("returns empty object for empty or invalid IPs", async () => {
    const cityReader = { city: vi.fn(() => { throw new Error("nope"); }) };
    const asnReader = { asn: vi.fn(() => { throw new Error("nope"); }) };

    vi.mocked(Reader.open)
      .mockResolvedValueOnce(cityReader as any)
      .mockResolvedValueOnce(asnReader as any);

    const { MaxmindGeoIpLookup } = await import("../../src/services/geoip.js");
    const lookup = new MaxmindGeoIpLookup();

    await expect(lookup.lookup("")).resolves.toEqual({});
    await expect(lookup.lookup("not-an-ip")).resolves.toEqual({});
  });

  it("caches readers and retries after failure", async () => {
    vi.mocked(Reader.open)
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ city: vi.fn(() => ({})) } as any)
      .mockResolvedValueOnce({ asn: vi.fn(() => ({})) } as any);

    const { MaxmindGeoIpLookup } = await import("../../src/services/geoip.js");
    const lookup = new MaxmindGeoIpLookup();

    await expect(lookup.lookup("1.2.3.4")).rejects.toThrow("fail");
    await lookup.lookup("1.2.3.4");

    expect(vi.mocked(Reader.open)).toHaveBeenCalledTimes(4);
  });
});

describe("default geoip helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("lookupIp uses the default service", async () => {
    const cityReader = {
      city: vi.fn(() => ({
        country: { names: { en: "United States" }, isoCode: "US" }
      }))
    };

    const asnReader = {
      asn: vi.fn(() => ({
        autonomousSystemNumber: 12345,
        autonomousSystemOrganization: "Test Org"
      }))
    };

    vi.mocked(Reader.open)
      .mockResolvedValueOnce(cityReader as any)
      .mockResolvedValueOnce(asnReader as any);

    const { lookupIp } = await import("../../src/services/geoip.js");
    const result = await lookupIp("8.8.8.8");
    expect(result.countryCode).toBe("US");
    expect(result.asn).toBe(12345);
  });

  it("enrichConnection uses default service and preserves fields", async () => {
    const cityReader = {
      city: vi.fn(() => ({
        country: { names: { en: "United States" }, isoCode: "US" }
      }))
    };

    const asnReader = {
      asn: vi.fn(() => ({
        autonomousSystemNumber: 12345,
        autonomousSystemOrganization: "Test Org"
      }))
    };

    vi.mocked(Reader.open)
      .mockResolvedValueOnce(cityReader as any)
      .mockResolvedValueOnce(asnReader as any);

    const { enrichConnection } = await import("../../src/services/geoip.js");
    const enriched = await enrichConnection(baseConnection());

    expect(enriched.countryCode).toBe("US");
    expect(enriched.asn).toBe(12345);
    expect(enriched.id).toBe("conn-1");
  });

  it("enrichBatch works with default service", async () => {
    const cityReader = {
      city: vi.fn(() => ({
        country: { names: { en: "United States" }, isoCode: "US" }
      }))
    };

    const asnReader = {
      asn: vi.fn(() => ({
        autonomousSystemNumber: 12345,
        autonomousSystemOrganization: "Test Org"
      }))
    };

    vi.mocked(Reader.open)
      .mockResolvedValueOnce(cityReader as any)
      .mockResolvedValueOnce(asnReader as any);

    const batch = [baseConnection({ id: "a" }), baseConnection({ id: "b" })];
    const { enrichBatch } = await import("../../src/services/geoip.js");
    const enriched = await enrichBatch(batch);

    expect(enriched).toHaveLength(2);
    expect(enriched.every((conn) => conn.enriched)).toBe(true);
  });

  it("GeoIpService supports custom lookup", async () => {
    const lookup = {
      lookup: vi.fn(async () => ({ countryCode: "ZZ" }))
    };

    const { GeoIpService } = await import("../../src/services/geoip.js");
    const service = new GeoIpService(lookup);
    const result = await service.lookupIp("8.8.8.8");

    expect(result.countryCode).toBe("ZZ");
  });
});
