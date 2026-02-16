import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  healthCheck: vi.fn((req, res) => res.status(200).json({ ok: true })),
  signUp: vi.fn((req, res) => res.status(201).json({ user: { id: "u1" } })),
  signIn: vi.fn((req, res) => res.status(200).json({ user: { id: "u1" } })),
  getCurrentUser: vi.fn((req, res) => res.status(200).json({ user: { id: "u1" } })),
  signOut: vi.fn((req, res) => res.status(204).send()),
  postConnections: vi.fn((req, res) => res.status(202).json({ received: 0 })),
  postMetrics: vi.fn((req, res) => res.status(202).json({ received: 0 })),
  getTenants: vi.fn((req, res) => res.status(200).json({ tenants: ["default"] }))
}));

const sharedMocks = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock("@byteroute/shared", () => ({
  UserModel: {
    findById: sharedMocks.findById,
  },
}));

vi.mock("../../src/controllers/health.controller.js", () => ({
  healthCheck: mocks.healthCheck
}));

vi.mock("../../src/controllers/connections.controller.js", () => ({
  postConnections: mocks.postConnections
}));

vi.mock("../../src/controllers/auth.controller.js", () => ({
  signUp: mocks.signUp,
  signIn: mocks.signIn,
  getCurrentUser: mocks.getCurrentUser,
  signOut: mocks.signOut
}));

vi.mock("../../src/controllers/metrics.controller.js", () => ({
  postMetrics: mocks.postMetrics
}));

vi.mock("../../src/controllers/tenants.controller.js", () => ({
  getTenants: mocks.getTenants
}));

import router from "../../src/routes/index.js";
import { signAuthToken } from "../../src/auth/passport.js";

const originalEnv = { ...process.env };

describe("routes", () => {
  const token = () => signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

  beforeEach(() => {
    const lean = vi.fn().mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["default"],
    });
    const select = vi.fn().mockReturnValue({ lean });
    sharedMocks.findById.mockReturnValue({ select });

    process.env = { ...originalEnv, JWT_SECRET: "test-jwt-secret" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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

    await request(app)
      .post("/api/connections")
      .set("Authorization", `Bearer ${token()}`)
      .send({ connections: [] })
      .expect(202);
    expect(mocks.postConnections).toHaveBeenCalled();
  });

  it("wires /api/metrics to postMetrics", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app)
      .post("/api/metrics")
      .set("Authorization", `Bearer ${token()}`)
      .send({ snapshots: [] })
      .expect(202);
    expect(mocks.postMetrics).toHaveBeenCalled();
  });

  it("wires /api/tenants to getTenants", async () => {
    const app = express();
    app.use(router);

    await request(app)
      .get("/api/tenants")
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);
    expect(mocks.getTenants).toHaveBeenCalled();
  });

  it("wires /auth/signup to signUp", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app)
      .post("/auth/signup")
      .send({ email: "user@example.com", name: "User", password: "password123" })
      .expect(201);
    expect(mocks.signUp).toHaveBeenCalled();
  });

  it("wires /auth/signin to signIn", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app)
      .post("/auth/signin")
      .send({ email: "user@example.com", password: "password123" })
      .expect(200);
    expect(mocks.signIn).toHaveBeenCalled();
  });

  it("wires /auth/me to getCurrentUser", async () => {
    const app = express();
    app.use(router);

    await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);
    expect(mocks.getCurrentUser).toHaveBeenCalled();
  });

  it("wires /auth/logout to signOut", async () => {
    const app = express();
    app.use(router);

    await request(app)
      .post("/auth/logout")
      .expect(204);
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
