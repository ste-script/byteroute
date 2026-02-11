import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkWrite: vi.fn(),
  enrichBatch: vi.fn(),
  upsertConnectionsLocal: vi.fn(),
  emitStatisticsUpdate: vi.fn(),
  emitTrafficFlows: vi.fn()
}));

vi.mock("@byteroute/shared", () => ({
  ConnectionModel: {
    bulkWrite: mocks.bulkWrite
  }
}));

vi.mock("../../src/services/geoip.js", () => ({
  enrichBatch: mocks.enrichBatch
}));

vi.mock("../../src/services/connections.js", () => ({
  upsertConnectionsLocal: mocks.upsertConnectionsLocal,
  emitStatisticsUpdate: mocks.emitStatisticsUpdate,
  emitTrafficFlows: mocks.emitTrafficFlows
}));

import type { Connection } from "@byteroute/shared";
import { enrichAndStoreConnections, storeRawConnections } from "../../src/services/ingest.js";

const baseConnection = (overrides: Partial<Connection> = {}): Partial<Connection> => ({
  sourceIp: "1.2.3.4",
  destIp: "5.6.7.8",
  sourcePort: 1111,
  destPort: 2222,
  protocol: "TCP",
  status: "active",
  ...overrides
});

describe("ingest service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-07T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enriches, stores, and emits when io is provided", async () => {
    mocks.enrichBatch.mockImplementation(async (connections: Connection[]) =>
      connections.map((connection, index: number) => ({
        ...connection,
        enriched: index === 0
      }))
    );

    mocks.bulkWrite.mockResolvedValue({
      upsertedCount: 1,
      modifiedCount: 1,
      insertedCount: 0,
      matchedCount: 0
    });

    const io = { emit: vi.fn() } as any;

    const result = await enrichAndStoreConnections(
      io,
      [
        baseConnection({
          id: "",
          protocol: "NOPE" as unknown as Connection["protocol"],
          status: "NOPE" as unknown as Connection["status"],
          startTime: "invalid",
          lastActivity: "2026-02-06T00:00:00Z"
        }),
        baseConnection({
          id: "custom-id",
          protocol: "UDP",
          status: "inactive",
          startTime: "2026-02-05T00:00:00Z"
        })
      ],
      { reporterIp: "9.9.9.9" }
    );

    const ops = mocks.bulkWrite.mock.calls[0]?.[0] as any[];
    const firstUpdate = ops[0]?.updateOne?.update?.$set;
    const secondUpdate = ops[1]?.updateOne?.update?.$set;

    expect(firstUpdate.protocol).toBe("OTHER");
    expect(firstUpdate.status).toBe("active");
    expect(firstUpdate.id).toMatch(/^ingest-\d+-/);
    expect(firstUpdate.startTime).toBeInstanceOf(Date);
    expect(firstUpdate.lastActivity).toBeInstanceOf(Date);
    expect(secondUpdate.protocol).toBe("UDP");
    expect(secondUpdate.status).toBe("inactive");

    expect(mocks.upsertConnectionsLocal).toHaveBeenCalled();
    expect(mocks.emitStatisticsUpdate).toHaveBeenCalled();
    expect(mocks.emitTrafficFlows).toHaveBeenCalled();

    expect(result).toEqual({
      received: 2,
      stored: 2,
      enriched: 1
    });
  });

  it("stores without emitting when io is missing", async () => {
    mocks.enrichBatch.mockImplementation(async (connections) => connections);
    mocks.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0, insertedCount: 0, matchedCount: 0 });

    const result = await enrichAndStoreConnections(undefined, [baseConnection()], {});

    expect(result.stored).toBe(1);
    expect(mocks.upsertConnectionsLocal).not.toHaveBeenCalled();
  });

  it("returns 0 when storing empty batches", async () => {
    const stored = await storeRawConnections([]);
    expect(stored).toBe(0);
    expect(mocks.bulkWrite).not.toHaveBeenCalled();
  });

  it("stores raw connections with enriched=false", async () => {
    mocks.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0, insertedCount: 0, matchedCount: 0 });

    await storeRawConnections([
      baseConnection({ enriched: true })
    ]);

    const ops = mocks.bulkWrite.mock.calls[0]?.[0] as any[];
    const update = ops[0]?.updateOne?.update?.$set;

    expect(update.enriched).toBe(false);
  });

  it("coerces invalid dates to fallback", async () => {
    mocks.enrichBatch.mockImplementation(async (connections) => connections);
    mocks.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0, insertedCount: 0, matchedCount: 0 });

    const invalidDate = new Date("invalid");

    await enrichAndStoreConnections(undefined, [
      baseConnection({
        startTime: invalidDate as unknown as string,
        lastActivity: { nope: true } as unknown as string
      })
    ], {});

    const ops = mocks.bulkWrite.mock.calls[0]?.[0] as any[];
    const update = ops[0]?.updateOne?.update?.$set;
    const expected = new Date("2026-02-07T10:00:00Z");

    expect(update.startTime.getTime()).toBe(expected.getTime());
    expect(update.lastActivity.getTime()).toBe(expected.getTime());
  });

  it("normalizes missing protocol/status and keeps valid dates", async () => {
    mocks.enrichBatch.mockImplementation(async (connections) => connections);
    mocks.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0, insertedCount: 0, matchedCount: 0 });

    const startTime = new Date("2026-02-06T00:00:00Z");
    const lastActivity = Date.parse("2026-02-06T01:00:00Z");

    await enrichAndStoreConnections(undefined, [
      baseConnection({
        protocol: undefined,
        status: undefined,
        startTime,
        lastActivity: lastActivity as unknown as string
      })
    ], {});

    const ops = mocks.bulkWrite.mock.calls[0]?.[0] as any[];
    const update = ops[0]?.updateOne?.update?.$set;

    expect(update.protocol).toBe("OTHER");
    expect(update.status).toBe("active");
    expect(update.startTime.getTime()).toBe(startTime.getTime());
    expect(update.lastActivity.getTime()).toBe(lastActivity);
  });

  it("fills defaults for missing network fields", async () => {
    mocks.enrichBatch.mockImplementation(async (connections) => connections);
    mocks.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0, insertedCount: 0, matchedCount: 0 });

    await storeRawConnections([
      {} as Connection
    ]);

    const ops = mocks.bulkWrite.mock.calls[0]?.[0] as any[];
    const update = ops[0]?.updateOne?.update?.$set;

    expect(update.sourceIp).toBe("0.0.0.0");
    expect(update.destIp).toBe("0.0.0.0");
    expect(update.sourcePort).toBe(0);
    expect(update.destPort).toBe(0);
  });

  it("handles missing bulkWrite counts", async () => {
    mocks.enrichBatch.mockImplementation(async (connections) => connections);
    mocks.bulkWrite.mockResolvedValue({});

    const stored = await storeRawConnections([
      baseConnection()
    ]);

    expect(stored).toBe(0);
  });
});
