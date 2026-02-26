import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Connection } from "@byteroute/shared";

const { mockGetTimeSeries } = vi.hoisted(() => ({
  mockGetTimeSeries: vi.fn(),
}));

vi.mock("../../src/services/metrics.js", () => ({
  metricsStore: {
    getTimeSeries: mockGetTimeSeries,
  },
}));

import { generateStatistics } from "../../src/utils/statistics.js";

function makeConn(overrides: Partial<Connection> = {}): Connection {
  return {
    id: "c1",
    tenantId: "default",
    sourceIp: "1.1.1.1",
    destIp: "2.2.2.2",
    sourcePort: 1000,
    destPort: 80,
    protocol: "TCP",
    status: "active",
    bandwidth: 1000,
    bytesIn: 500,
    bytesOut: 300,
    packetsIn: 10,
    packetsOut: 10,
    startTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    duration: 1000,
    ...overrides,
  } as Connection;
}

describe("generateStatistics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTimeSeries.mockReturnValue([]);
  });

  // ── Empty connections ───────────────────────────────────────────────────

  it("returns zeroes for empty connections array", () => {
    const stats = generateStatistics([], "default");

    expect(stats.totalConnections).toBe(0);
    expect(stats.activeConnections).toBe(0);
    expect(stats.totalBandwidth).toBe(0);
    expect(stats.bandwidthIn).toBe(0);
    expect(stats.bandwidthOut).toBe(0);
    expect(stats.byCountry).toEqual([]);
    expect(stats.byAsn).toEqual([]);
    expect(stats.byProtocol).toEqual([]);
  });

  it("generates fallback timeSeries of 24 entries when metricsStore is empty", () => {
    const stats = generateStatistics([], "default");

    expect(stats.timeSeries).toHaveLength(24);
    expect(mockGetTimeSeries).toHaveBeenCalledWith("default", 24);

    const entry = stats.timeSeries[0]!;
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("connections");
    expect(entry).toHaveProperty("bandwidthIn");
    expect(entry).toHaveProperty("bandwidthOut");
  });

  it("uses real timeSeries from metricsStore when available", () => {
    const realSeries = [
      { timestamp: "2026-01-01T00:00:00.000Z", connections: 42, bandwidthIn: 1000, bandwidthOut: 500 },
    ];
    mockGetTimeSeries.mockReturnValue(realSeries);

    const stats = generateStatistics([], "default");

    expect(stats.timeSeries).toBe(realSeries);
  });

  // ── Active / inactive counts ────────────────────────────────────────────

  it("correctly counts active vs inactive connections", () => {
    const connections = [
      makeConn({ status: "active" }),
      makeConn({ status: "active" }),
      makeConn({ status: "inactive" }),
    ];

    const stats = generateStatistics(connections, "default");

    expect(stats.totalConnections).toBe(3);
    expect(stats.activeConnections).toBe(2);
  });

  // ── Bandwidth aggregation ───────────────────────────────────────────────

  it("sums totalBandwidth, bandwidthIn, and bandwidthOut", () => {
    const connections = [
      makeConn({ bandwidth: 100, bytesIn: 200, bytesOut: 50 }),
      makeConn({ bandwidth: 400, bytesIn: 800, bytesOut: 150 }),
    ];

    const stats = generateStatistics(connections, "default");

    expect(stats.totalBandwidth).toBe(500);
    expect(stats.bandwidthIn).toBe(1000);
    expect(stats.bandwidthOut).toBe(200);
  });

  it("treats undefined bandwidth/bytes fields as 0", () => {
    const connections = [
      makeConn({ bandwidth: undefined, bytesIn: undefined, bytesOut: undefined }),
    ];

    const stats = generateStatistics(connections, "default");

    expect(stats.totalBandwidth).toBe(0);
    expect(stats.bandwidthIn).toBe(0);
    expect(stats.bandwidthOut).toBe(0);
  });

  // ── byCountry ───────────────────────────────────────────────────────────

  it("groups connections by country with correct percentages", () => {
    const connections = [
      makeConn({ country: "United States", countryCode: "US", bandwidth: 100 }),
      makeConn({ country: "United States", countryCode: "US", bandwidth: 200 }),
      makeConn({ country: "Germany", countryCode: "DE", bandwidth: 50 }),
    ];

    const stats = generateStatistics(connections, "default");

    const us = stats.byCountry.find(c => c.country === "United States")!;
    const de = stats.byCountry.find(c => c.country === "Germany")!;

    expect(us.connections).toBe(2);
    expect(us.bandwidth).toBe(300);
    expect(us.countryCode).toBe("US");
    expect(us.percentage).toBeCloseTo(66.67, 1);

    expect(de.connections).toBe(1);
    expect(de.percentage).toBeCloseTo(33.33, 1);
  });

  it("skips connections without country or countryCode", () => {
    const connections = [
      makeConn({ country: undefined, countryCode: undefined }),
      makeConn({ country: "Japan", countryCode: "JP" }),
    ];

    const stats = generateStatistics(connections, "default");

    expect(stats.byCountry).toHaveLength(1);
    expect(stats.byCountry[0]!.country).toBe("Japan");
  });

  // ── byAsn ──────────────────────────────────────────────────────────────

  it("groups connections by ASN", () => {
    const connections = [
      makeConn({ asn: 13335, asOrganization: "Cloudflare, Inc." }),
      makeConn({ asn: 13335, asOrganization: "Cloudflare, Inc." }),
      makeConn({ asn: 15169, asOrganization: "Google LLC" }),
    ];

    const stats = generateStatistics(connections, "default");

    const cloudflare = stats.byAsn.find(c => c.asn === 13335)!;
    const google = stats.byAsn.find(c => c.asn === 15169)!;

    expect(cloudflare.connections).toBe(2);
    expect(cloudflare.asOrganization).toBe("Cloudflare, Inc.");
    expect(cloudflare.percentage).toBeCloseTo(66.67, 1);

    expect(google.connections).toBe(1);
    expect(google.asOrganization).toBe("Google LLC");
  });

  it("skips connections without an ASN", () => {
    const connections = [
      makeConn({ asn: undefined }),
      makeConn({ asn: 8075, asOrganization: "Microsoft Corporation" }),
    ];

    const stats = generateStatistics(connections, "default");

    expect(stats.byAsn).toHaveLength(1);
    expect(stats.byAsn[0]!.asn).toBe(8075);
  });

  // ── byProtocol ──────────────────────────────────────────────────────────

  it("groups connections by protocol", () => {
    const connections = [
      makeConn({ protocol: "TCP" }),
      makeConn({ protocol: "TCP" }),
      makeConn({ protocol: "UDP" }),
    ];

    const stats = generateStatistics(connections, "default");

    const tcp = stats.byProtocol.find(p => p.protocol === "TCP")!;
    const udp = stats.byProtocol.find(p => p.protocol === "UDP")!;

    expect(tcp.connections).toBe(2);
    expect(tcp.percentage).toBeCloseTo(66.67, 1);
    expect(udp.connections).toBe(1);
  });

  // ── Percentage edge case: empty array → 0% ──────────────────────────────

  it("byCountry percentage is 0 when connections is empty", () => {
    mockGetTimeSeries.mockReturnValue([{ timestamp: "t", connections: 0, bandwidthIn: 0, bandwidthOut: 0 }]);
    const stats = generateStatistics([], "t1");
    expect(stats.byCountry).toEqual([]);
  });
});
