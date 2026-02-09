import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

const find = vi.fn();

vi.mock("@byteroute/shared", () => ({
  ConnectionModel: {
    find
  }
}));

const generateConnection = vi.fn();
const generateTrafficFlows = vi.fn();
const generateStatistics = vi.fn();

vi.mock("../../src/mock/connections.js", () => ({
  generateConnection,
  generateTrafficFlows,
  generateStatistics
}));

const createFindChain = (docs: any[]) => ({
  sort: vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(docs)
    })
  })
});

const createIo = () => ({
  emit: vi.fn()
});

describe("connections service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads connections from db", async () => {
    const docs = [
      { id: "a", sourceIp: "1.1.1.1" },
      { id: "b", sourceIp: "2.2.2.2" }
    ];

    find.mockReturnValue(createFindChain(docs));

    const service = await import("../../src/services/connections.js");

    const count = await service.loadConnectionsFromDb(10);
    expect(count).toBe(2);
    expect(service.getConnections().map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("adds and updates connections with events", async () => {
    generateConnection.mockReturnValue({ id: "conn-1", status: "active" });
    generateStatistics.mockReturnValue({ totalConnections: 1 });
    generateTrafficFlows.mockReturnValue([{ id: "flow-1" }]);

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    const created = service.addConnection(io as any);
    expect(created.id).toBe("conn-1");
    expect(io.emit).toHaveBeenCalledWith("connection:new", created);
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 1 });

    const fetched = service.getConnection("conn-1");
    expect(fetched?.id).toBe("conn-1");
    expect(service.getConnection("missing")).toBeUndefined();

    const updated = service.updateConnection(io as any, "conn-1", { status: "inactive" });
    expect(updated?.status).toBe("inactive");
    expect(updated?.id).toBe("conn-1");
    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "conn-1" }));
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 1 });
  });

  it("handles upserts, removals, and batches", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, [
      { id: "a" } as any,
      { id: "b" } as any
    ]);

    expect(io.emit).toHaveBeenCalledWith("connection:new", expect.objectContaining({ id: "a" }));
    expect(io.emit).toHaveBeenCalledWith("connection:new", expect.objectContaining({ id: "b" }));

    service.upsertConnectionsLocal(io as any, [
      { id: "a" } as any
    ]);

    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "a" }));

    const removed = service.removeConnection(io as any, "a");
    expect(removed).toBe(true);
    expect(io.emit).toHaveBeenCalledWith("connection:remove", { id: "a" });

    const missing = service.removeConnection(io as any, "missing");
    expect(missing).toBe(false);

    service.emitConnectionsBatch(io as any);
    expect(io.emit).toHaveBeenCalledWith("connections:batch", service.getConnections());
  });

  it("emits traffic flows and errors", async () => {
    generateTrafficFlows.mockReturnValue([{ id: "flow-1" }]);
    generateStatistics.mockReturnValue({ totalConnections: 0 });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.emitTrafficFlows(io as any);
    expect(io.emit).toHaveBeenCalledWith("traffic:flows", [{ id: "flow-1" }]);

    service.emitStatisticsUpdate(io as any);
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 0 });

    service.emitError(io as any, "nope", "E_TEST");
    expect(io.emit).toHaveBeenCalledWith("error", { message: "nope", code: "E_TEST" });
  });

  it("handles missing connection updates", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    const missing = service.updateConnection(io as any, "missing", { status: "inactive" });
    expect(missing).toBeNull();
  });

  it("does not emit stats when status unchanged", async () => {
    generateConnection.mockReturnValue({ id: "conn-2", status: "active" });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.addConnection(io as any);
    io.emit.mockClear();

    const updated = service.updateConnection(io as any, "conn-2", { bandwidth: 1000 });
    expect(updated?.bandwidth).toBe(1000);

    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "conn-2" }));
    expect(io.emit).not.toHaveBeenCalledWith("statistics:update", expect.anything());
  });

  it("runs demo mode branches", async () => {
    let counter = 0;
    generateConnection.mockImplementation((overrides) => ({
      id: `demo-${++counter}`,
      status: "active",
      bytesIn: 0,
      bytesOut: 0,
      ...overrides
    }));

    generateTrafficFlows.mockReturnValue([{ id: "flow-1" }]);
    generateStatistics.mockReturnValue({ totalConnections: 1 });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, Array.from({ length: 11 }, (_, i) => ({ id: `seed-${i}` } as any)));

    const randomValues = [
      0.1,
      0.5,
      0.0,
      0.7,
      0.2,
      0.3,
      0.4,
      0.8,
      0.1,
      0.95
    ];

    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => randomValues.shift() ?? 0.99);

    vi.useFakeTimers();
    const timer = service.startDemoMode(io as any, 1000);

    vi.advanceTimersByTime(4000);

    service.stopDemoMode(timer);
    randomSpy.mockRestore();

    expect(service.getConnections().length).toBeGreaterThanOrEqual(10);
  });

  it("skips demo updates when no connections", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.useFakeTimers();

    const timer = service.startDemoMode(io as any, 1000);
    vi.advanceTimersByTime(1000);
    service.stopDemoMode(timer);

    randomSpy.mockRestore();
    expect(service.getConnections()).toHaveLength(0);
  });

  it("skips demo removal when under threshold", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, Array.from({ length: 5 }, (_, i) => ({ id: `seed-${i}` } as any)));

    const removeSpy = vi.spyOn(service, "removeConnection");
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.8);
    vi.useFakeTimers();

    const timer = service.startDemoMode(io as any, 1000);
    vi.advanceTimersByTime(1000);
    service.stopDemoMode(timer);

    randomSpy.mockRestore();
    removeSpy.mockRestore();

    expect(removeSpy).not.toHaveBeenCalled();
  });
});
