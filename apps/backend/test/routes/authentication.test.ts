import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import router from "../../src/routes/index.js";
import { signAuthToken } from "../../src/auth/passport.js";

const sharedMocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findTenants: vi.fn(),
}));

vi.mock("@byteroute/shared", () => ({
  UserModel: {
    findById: sharedMocks.findById,
  },
  TenantModel: {
    find: sharedMocks.findTenants,
  },
  mongoReadyState: vi.fn(() => 0),
}));

const originalEnv = { ...process.env };

describe("api authentication", () => {
  beforeEach(() => {
    const lean = vi.fn().mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
      name: "User",
    });
    const select = vi.fn().mockReturnValue({ lean });
    sharedMocks.findById.mockReturnValue({ select });

    const tenantLean = vi.fn().mockResolvedValue([{ tenantId: "default" }]);
    const tenantSelect = vi.fn().mockReturnValue({ lean: tenantLean });
    sharedMocks.findTenants.mockReturnValue({ select: tenantSelect });

    process.env = { ...originalEnv, JWT_SECRET: "test-jwt-secret" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("keeps /health public", async () => {

    const app = express();
    app.use(express.json());
    app.use(router);

    await request(app).get("/health").expect(200);
  });

  it("returns 401 for /api requests without a bearer token", async () => {

    const app = express();
    app.use(express.json());
    app.use(router);

    const response = await request(app)
      .post("/api/metrics")
      .send({ snapshots: [] })
      .expect(401);

    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("allows /api requests with a valid bearer token", async () => {

    const app = express();
    app.use(express.json());
    app.use(router);

    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    const response = await request(app)
      .post("/api/metrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ snapshots: [] })
      .expect(202);

    expect(response.body).toEqual({
      received: 0,
      status: "processing",
    });
  });
});
