import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  healthCheck: vi.fn((req, res) => res.status(200).json({ ok: true })),
  postConnections: vi.fn((req, res) => res.status(202).json({ received: 0 })),
  postMetrics: vi.fn((req, res) => res.status(202).json({ received: 0 }))
}));

vi.mock("../../src/controllers/health.controller.js", () => ({
  healthCheck: mocks.healthCheck
}));

vi.mock("../../src/controllers/connections.controller.js", () => ({
  postConnections: mocks.postConnections
}));

vi.mock("../../src/controllers/metrics.controller.js", () => ({
  postMetrics: mocks.postMetrics
}));

import router from "../../src/routes/index.js";

describe("routes", () => {
  it("wires /health to healthCheck", async () => {
    const app = express();
    app.use(router);

    await request(app).get("/health").expect(200);
    expect(mocks.healthCheck).toHaveBeenCalled();
  });

  it("wires /api/connections to postConnections", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app).post("/api/connections").send({ connections: [] }).expect(202);
    expect(mocks.postConnections).toHaveBeenCalled();
  });

  it("wires /api/metrics to postMetrics", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app).post("/api/metrics").send({ snapshots: [] }).expect(202);
    expect(mocks.postMetrics).toHaveBeenCalled();
  });
});
