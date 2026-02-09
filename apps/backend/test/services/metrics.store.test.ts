import { describe, expect, it, beforeEach, vi } from "vitest";
import { metricsStore } from "../../src/services/metrics.js";

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

  it("stores snapshots and defaults inactive", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    metricsStore.addSnapshots([
      createSnapshot({ inactive: undefined })
    ]);

    const stored = metricsStore.getAllSnapshots();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.inactive).toBe(0);
    expect(consoleLog).toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("returns empty array when no snapshots", () => {
    expect(metricsStore.getTimeSeries()).toEqual([]);
  });

  it("returns most recent snapshots and enforces retention", () => {
    const snapshots = Array.from({ length: 180 }, (_, i) =>
      createSnapshot({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        connections: i
      })
    );

    metricsStore.addSnapshots(snapshots);

    const stored = metricsStore.getAllSnapshots();
    expect(stored).toHaveLength(168);

    const lastFive = metricsStore.getTimeSeries(5);
    expect(lastFive).toHaveLength(5);
    expect(lastFive[0]?.connections).toBe(175);
  });

  it("clears snapshots", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    metricsStore.addSnapshots([createSnapshot()]);
    metricsStore.clear();

    expect(metricsStore.getAllSnapshots()).toEqual([]);
    expect(consoleLog).toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("handles Date timestamps and mixed sorting", () => {
    const now = new Date("2026-02-07T10:00:00Z");
    const later = new Date("2026-02-07T11:00:00Z");

    metricsStore.addSnapshots([
      createSnapshot({ timestamp: later }),
      createSnapshot({ timestamp: now.toISOString() })
    ]);

    const stored = metricsStore.getAllSnapshots();
    const firstTimestamp = stored[0]!.timestamp;
    const normalized = firstTimestamp instanceof Date ? firstTimestamp : new Date(firstTimestamp);

    expect(normalized.toISOString()).toBe(now.toISOString());
  });

  it("handles mixed sorting with string first", () => {
    const now = new Date("2026-02-07T09:00:00Z");
    const later = new Date("2026-02-07T12:00:00Z");

    metricsStore.addSnapshots([
      createSnapshot({ timestamp: now.toISOString() }),
      createSnapshot({ timestamp: later })
    ]);

    const stored = metricsStore.getAllSnapshots();
    const firstTimestamp = stored[0]!.timestamp;
    const normalized = firstTimestamp instanceof Date ? firstTimestamp : new Date(firstTimestamp);

    expect(normalized.toISOString()).toBe(now.toISOString());
  });
});
