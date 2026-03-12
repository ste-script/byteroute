import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
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
      .set("X-Tenant-Id", "default")
      .send({ snapshots: [] })
      .expect(202);

    expect(response.body).toEqual({
      received: 0,
      status: "processing",
    });
  });

  it("allows /auth/me requests with a valid auth cookie", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    const response = await request(app)
      .get("/auth/me")
      .set("cookie", `byteroute_auth=${token}`)
      .expect(200);

    expect(response.body).toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: ["default"],
      },
    });
  });

  it("rejects cookie-authenticated unsafe requests without a matching csrf header", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    const response = await request(app)
      .post("/auth/client-token")
      .set("Cookie", `byteroute_auth=${token}; byteroute_csrf=csrf-token`)
      .expect(403);

    expect(response.body).toEqual({ error: "CSRF token validation failed" });
  });

  it("allows cookie-authenticated unsafe requests with a matching csrf header", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    const response = await request(app)
      .post("/auth/client-token")
      .set("Cookie", `byteroute_auth=${token}; byteroute_csrf=csrf-token`)
      .set("x-csrf-token", "csrf-token")
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({ token: expect.any(String), expiresIn: expect.any(String) }));
  });

  it("creates a client token scoped to the requested tenant", async () => {
    const app = express();
    app.use(express.json());
    app.use(router);

    const tenantLean = vi.fn().mockResolvedValue([{ tenantId: "default" }, { tenantId: "tenant-b" }]);
    const tenantSelect = vi.fn().mockReturnValue({ lean: tenantLean });
    sharedMocks.findTenants.mockReturnValue({ select: tenantSelect });

    const token = signAuthToken({
      sub: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["default", "tenant-b"],
    });

    const response = await request(app)
      .post("/auth/client-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ tenantId: "tenant-b" })
      .expect(200);

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(payload.tenantId).toBe("tenant-b");
    expect(payload.tenantIds).toEqual(["tenant-b", "default"]);
  });
});
