import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

const find = vi.fn();

vi.mock("@byteroute/shared", () => ({
  ConnectionModel: {
    find
  }
}));

const generateTrafficFlows = vi.fn();
const generateStatistics = vi.fn();

vi.mock("../../src/mock/connections.js", () => ({
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

const createRoomedIo = () => {
  const roomEmit = vi.fn();
  return {
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: roomEmit })),
    roomEmit,
  };
};

describe("connections service", () => {
  const TENANT = "default";

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
    expect(service.getAllConnectionsSnapshot().map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("upserts and updates connections with events", async () => {
    generateStatistics.mockReturnValue({ totalConnections: 1 });
    generateTrafficFlows.mockReturnValue([{ id: "flow-1" }]);

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, TENANT, [{ id: "conn-1", status: "active" } as any]);
    expect(io.emit).toHaveBeenCalledWith("connection:new", expect.objectContaining({ id: "conn-1" }));

    const fetched = service.getConnectionById(TENANT, "conn-1");
    expect(fetched?.id).toBe("conn-1");
    expect(service.getConnectionById(TENANT, "missing")).toBeUndefined();

    const updated = service.updateConnection(io as any, TENANT, "conn-1", { status: "inactive" });
    expect(updated?.status).toBe("inactive");
    expect(updated?.id).toBe("conn-1");
    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "conn-1" }));
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 1 });
  });

  it("handles upserts, removals, and batches", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, TENANT, [
      { id: "a" } as any,
      { id: "b" } as any
    ]);

    expect(io.emit).toHaveBeenCalledWith("connection:new", expect.objectContaining({ id: "a" }));
    expect(io.emit).toHaveBeenCalledWith("connection:new", expect.objectContaining({ id: "b" }));

    service.upsertConnectionsLocal(io as any, TENANT, [
      { id: "a" } as any
    ]);

    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "a" }));

    const removed = service.removeConnection(io as any, TENANT, "a");
    expect(removed).toBe(true);
    expect(io.emit).toHaveBeenCalledWith("connection:remove", { id: "a" });

    const missing = service.removeConnection(io as any, TENANT, "missing");
    expect(missing).toBe(false);

    service.emitConnectionsBatch(io as any, TENANT);
    expect(io.emit).toHaveBeenCalledWith("connections:batch", service.getConnectionsForTenant(TENANT));
  });

  it("emits traffic flows and errors", async () => {
    generateTrafficFlows.mockReturnValue([{ id: "flow-1" }]);
    generateStatistics.mockReturnValue({ totalConnections: 0 });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.emitTrafficFlows(io as any, TENANT);
    expect(io.emit).toHaveBeenCalledWith("traffic:flows", [{ id: "flow-1" }]);

    service.emitStatisticsUpdate(io as any, TENANT);
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 0 });

    service.emitError(io as any, "nope", "E_TEST");
    expect(io.emit).toHaveBeenCalledWith("error", { message: "nope", code: "E_TEST" });
  });

  it("emits to tenant room when io.to exists", async () => {
    generateStatistics.mockReturnValue({ totalConnections: 1 });

    const service = await import("../../src/services/connections.js");
    const io = createRoomedIo();

    service.upsertConnectionsLocal(io as any, "tenant-room", [{ id: "conn-room", tenantId: "tenant-room", status: "active" } as any]);

    expect(io.to).toHaveBeenCalledWith("tenant:tenant-room");
    expect(io.roomEmit).toHaveBeenCalledWith(
      "connection:new",
      expect.objectContaining({ id: "conn-room", tenantId: "tenant-room" })
    );
    expect(io.emit).not.toHaveBeenCalledWith("connection:new", expect.anything());
  });

  it("emits statistics and flows for all known tenants", async () => {
    generateTrafficFlows.mockReturnValue([{ id: "flow-multi" }]);
    generateStatistics.mockReturnValue({ totalConnections: 1 });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, "tenant-a", [{ id: "t1-a", tenantId: "tenant-a" } as any]);
    service.upsertConnectionsLocal(io as any, "tenant-b", [{ id: "t2-a", tenantId: "tenant-b" } as any]);

    io.emit.mockClear();
    service.emitTrafficFlowsAllTenants(io as any);
    service.emitStatisticsUpdateAllTenants(io as any);

    expect(io.emit).toHaveBeenCalledWith("traffic:flows", [{ id: "flow-multi" }]);
    expect(io.emit).toHaveBeenCalledWith("statistics:update", { totalConnections: 1 });

    const flowCalls = io.emit.mock.calls.filter(([event]) => event === "traffic:flows");
    const statsCalls = io.emit.mock.calls.filter(([event]) => event === "statistics:update");
    expect(flowCalls.length).toBeGreaterThanOrEqual(2);
    expect(statsCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("handles missing connection updates", async () => {
    const service = await import("../../src/services/connections.js");
    const io = createIo();

    const missing = service.updateConnection(io as any, TENANT, "missing", { status: "inactive" });
    expect(missing).toBeNull();
  });

  it("does not emit stats when status unchanged", async () => {
    generateStatistics.mockReturnValue({ totalConnections: 1 });

    const service = await import("../../src/services/connections.js");
    const io = createIo();

    service.upsertConnectionsLocal(io as any, TENANT, [{ id: "conn-2", status: "active" } as any]);
    io.emit.mockClear();

    const updated = service.updateConnection(io as any, TENANT, "conn-2", { bandwidth: 1000 });
    expect(updated?.bandwidth).toBe(1000);

    expect(io.emit).toHaveBeenCalledWith("connection:update", expect.objectContaining({ id: "conn-2" }));
    expect(io.emit).not.toHaveBeenCalledWith("statistics:update", expect.anything());
  });

});
