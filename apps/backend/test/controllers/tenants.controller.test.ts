import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@byteroute/shared", () => ({
  TenantModel: {
    findOne: mocks.findOne,
    find: mocks.find,
    create: mocks.create,
    deleteOne: mocks.deleteOne,
  },
}));

import {
  getTenants,
  createTenant,
  deleteTenant,
} from "../../src/controllers/tenants.controller.js";

function createRes(): Response {
  const res: Partial<Response> = {};
  (res.status as unknown) = vi.fn(() => res);
  (res.json as unknown) = vi.fn(() => res);
  (res.send as unknown) = vi.fn(() => res);
  return res as Response;
}

describe("tenants.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getTenants ──────────────────────────────────────────────────────────────

  describe("getTenants", () => {
    it("returns sorted tenant IDs for the authenticated user", async () => {
      mocks.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { tenantId: "zebra", name: "Zebra" },
            { tenantId: "alpha", name: "Alpha" },
          ]),
        }),
      });

      const req = { user: { id: "user-1" } } as unknown as Request;
      const res = createRes();

      await getTenants(req, res);

      expect(res.json).toHaveBeenCalledWith({ tenants: ["alpha", "zebra"] });
    });

    it("returns 401 when principal is missing", async () => {
      const req = {} as Request;
      const res = createRes();

      await getTenants(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ── createTenant ────────────────────────────────────────────────────────────

  describe("createTenant", () => {
    it("creates a tenant with an auto-generated tenantId from name", async () => {
      mocks.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
      mocks.create.mockResolvedValue({ tenantId: "my-project", name: "My Project" });

      const req = {
        user: { id: "user-1" },
        body: { name: "My Project" },
      } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "my-project", ownerId: "user-1", name: "My Project" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        tenant: { tenantId: "my-project", name: "My Project" },
      });
    });

    it("creates a tenant with an explicit tenantId", async () => {
      mocks.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
      mocks.create.mockResolvedValue({ tenantId: "custom-id", name: "Custom" });

      const req = {
        user: { id: "user-1" },
        body: { name: "Custom", tenantId: "custom-id" },
      } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "custom-id" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 409 when tenantId already exists", async () => {
      mocks.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({ tenantId: "existing" }),
      });

      const req = {
        user: { id: "user-1" },
        body: { name: "existing" },
      } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: "Tenant ID already exists" });
    });

    it("returns 400 when name is missing", async () => {
      const req = {
        user: { id: "user-1" },
        body: {},
      } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when tenantId contains invalid characters", async () => {
      const req = {
        user: { id: "user-1" },
        body: { name: "Ok Name", tenantId: "INVALID CHARS!" },
      } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid tenantId") })
      );
    });

    it("returns 401 when principal is missing", async () => {
      const req = { body: { name: "Test" } } as unknown as Request;
      const res = createRes();

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ── deleteTenant ────────────────────────────────────────────────────────────

  describe("deleteTenant", () => {
    it("deletes an owned tenant and returns 204", async () => {
      mocks.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = {
        user: { id: "user-1" },
        params: { tenantId: "my-project" },
      } as unknown as Request;
      const res = createRes();

      await deleteTenant(req, res);

      expect(mocks.deleteOne).toHaveBeenCalledWith({ tenantId: "my-project", ownerId: "user-1" });
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when tenant not found or not owned", async () => {
      mocks.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const req = {
        user: { id: "user-1" },
        params: { tenantId: "not-mine" },
      } as unknown as Request;
      const res = createRes();

      await deleteTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 401 when principal is missing", async () => {
      const req = { params: { tenantId: "some-tenant" } } as unknown as Request;
      const res = createRes();

      await deleteTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
