import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectMongo: vi.fn(),
  disconnectMongo: vi.fn(),
  mongoReadyState: vi.fn(),
  mongoose: { connection: "mock-connection" }
}));

vi.mock("@byteroute/shared", () => ({
  connectMongo: mocks.connectMongo,
  disconnectMongo: mocks.disconnectMongo,
  mongoReadyState: mocks.mongoReadyState,
  mongoose: mocks.mongoose
}));

describe("db/mongoose re-exports", () => {
  it("re-exports shared mongo helpers", async () => {
    const mod = await import("../../src/db/mongoose.js");

    expect(mod.connectMongo).toBe(mocks.connectMongo);
    expect(mod.disconnectMongo).toBe(mocks.disconnectMongo);
    expect(mod.mongoReadyState).toBe(mocks.mongoReadyState);
    expect(mod.mongoose).toBe(mocks.mongoose);
  });

  it("creates bindings with overrides", async () => {
    const mod = await import("../../src/db/mongoose.js");

    const custom = { connectMongo: vi.fn() };
    const bindings = mod.createMongoBindings(custom);

    expect(bindings.connectMongo).toBe(custom.connectMongo);
    expect(bindings.disconnectMongo).toBe(mocks.disconnectMongo);
    expect(bindings.mongoReadyState).toBe(mocks.mongoReadyState);
    expect(bindings.mongoose).toBe(mocks.mongoose);
  });
});
