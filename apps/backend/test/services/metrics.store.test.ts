import { describe, expect, it, beforeEach, vi } from "vitest";
import { metricsStore } from "../../src/services/metrics.js";
import { DEFAULT_TENANT_ID } from "../../src/utils/tenant.js";

const createSnapshot = (overrides: Partial<{ timestamp: string | Date; connections: number; bandwidthIn: number; bandwidthOut: number; inactive: number; }> = {}) => ({
  timestamp: new Date().toISOString(),
  connections: 10,
  bandwidthIn: 1000,
  bandwidthOut: 500,
  inactive: 0,
  ...overrides
});

describe("metricsStore", () => {
  beforeEach(() => {
    metricsStore.clear();
  });

  it("returns empty array when no snapshots", () => {
    expect(metricsStore.getTimeSeries(DEFAULT_TENANT_ID)).toEqual([]);
  });

  it("returns most recent snapshots and enforces retention", () => {
    const snapshots = Array.from({ length: 180 }, (_, i) =>
      createSnapshot({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        connections: i
      })
    );

    metricsStore.addSnapshots(DEFAULT_TENANT_ID, snapshots);

    const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID);
    expect(stored).toHaveLength(168);

    const lastFive = metricsStore.getTimeSeries(DEFAULT_TENANT_ID, 5);
    expect(lastFive).toHaveLength(5);
    expect(lastFive[0]?.connections).toBe(175);
  });

  it("supports explicit tenant overloads", () => {
    const tenantSnapshots = [
      createSnapshot({ timestamp: new Date(Date.now() - 1000).toISOString(), connections: 1 }),
      createSnapshot({ timestamp: new Date().toISOString(), connections: 2 }),
    ];

    metricsStore.addSnapshots("tenant-alpha", tenantSnapshots);

    const tenantData = metricsStore.getTimeSeries("tenant-alpha", 1);
    expect(tenantData).toHaveLength(1);
    expect(tenantData[0]?.connections).toBe(2);

    const tenantAll = metricsStore.getAllSnapshots("tenant-alpha");
    expect(tenantAll).toHaveLength(2);
  });

});
