import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  signAuthToken: vi.fn(() => "jwt-token"),
  signAuthTokenWithTtl: vi.fn(() => "client-token"),
  hashPassword: vi.fn(() => "salt:hash"),
  verifyPassword: vi.fn(() => true),
}));

vi.mock("@byteroute/shared", () => ({
  UserModel: {
    findOne: mocks.findOne,
    create: mocks.create,
  },
}));

vi.mock("../../src/auth/passport.js", () => ({
  signAuthToken: mocks.signAuthToken,
  signAuthTokenWithTtl: mocks.signAuthTokenWithTtl,
}));

vi.mock("../../src/services/password.js", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

import {
  createClientToken,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from "../../src/controllers/auth.controller.js";

function createRes(): Response {
  const res: Partial<Response> = {};
  (res.status as unknown) = vi.fn(() => res);
  (res.json as unknown) = vi.fn(() => res);
  (res.cookie as unknown) = vi.fn(() => res);
  (res.clearCookie as unknown) = vi.fn(() => res);
  (res.send as unknown) = vi.fn(() => res);
  return res as Response;
}

describe("auth.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signUp creates user, sets cookie and returns user", async () => {
    mocks.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    mocks.create.mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: [],
      save: vi.fn().mockResolvedValue(undefined),
    });

    const req = {
      body: { email: "user@example.com", name: "User", password: "password123" },
    } as Request;
    const res = createRes();

    await signUp(req, res);

    expect(mocks.hashPassword).toHaveBeenCalledWith("password123");
    expect(mocks.create).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object) })
    );
  });

  it("signUp rejects duplicate users", async () => {
    mocks.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "existing" }) });

    const req = {
      body: { email: "user@example.com", name: "User", password: "password123" },
    } as Request;
    const res = createRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "User already exists" });
  });

  it("signUp rejects invalid payload", async () => {
    const req = {
      body: { email: "user@example.com", password: "short" },
    } as Request;
    const res = createRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signIn sets cookie for valid credentials", async () => {
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-1",
        email: "user@example.com",
        name: "User",
        passwordHash: "salt:hash",
        tenantIds: ["owned:user-1"],
        save: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const req = {
      body: { email: "user@example.com", password: "password123" },
    } as Request;
    const res = createRes();

    await signIn(req, res);

    expect(mocks.verifyPassword).toHaveBeenCalledWith("password123", "salt:hash");
    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object) })
    );
  });

  it("signIn backfills tenant when user has none", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-1",
        email: "user@example.com",
        name: "User",
        passwordHash: "salt:hash",
        tenantIds: [],
        save,
      }),
    });

    const req = {
      body: { email: "user@example.com", password: "password123" },
    } as Request;
    const res = createRes();

    await signIn(req, res);

    expect(save).toHaveBeenCalled();
    expect(mocks.signAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({ tenantIds: expect.any(Array) })
    );
  });

  it("signIn rejects invalid credentials", async () => {
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-1",
        email: "user@example.com",
        name: "User",
        passwordHash: "salt:hash",
        tenantIds: ["owned:user-1"],
        save: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mocks.verifyPassword.mockReturnValue(false);

    const req = {
      body: { email: "user@example.com", password: "wrong" },
    } as Request;
    const res = createRes();

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
  });

  it("signIn rejects invalid payload", async () => {
    const req = {
      body: { email: "", password: "" },
    } as Request;
    const res = createRes();

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getCurrentUser returns unauthorized when principal missing", () => {
    const req = {} as Request;
    const res = createRes();

    getCurrentUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("getCurrentUser returns principal data", () => {
    const req = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: ["tenant-a"],
      },
    } as unknown as Request;
    const res = createRes();

    getCurrentUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
          email: "user@example.com",
          tenantIds: ["tenant-a"],
        }),
      })
    );
  });

  it("getCurrentUser defaults tenantIds to empty array", () => {
    const req = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
    } as unknown as Request;
    const res = createRes();

    getCurrentUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          tenantIds: [],
        }),
      })
    );
  });

  it("signOut clears cookies and returns 204", () => {
    const req = {} as Request;
    const res = createRes();

    signOut(req, res);

    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it("createClientToken returns unauthorized without principal", () => {
    const req = {} as Request;
    const res = createRes();

    createClientToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("createClientToken returns forbidden without tenants", () => {
    const req = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: [],
      },
    } as unknown as Request;
    const res = createRes();

    createClientToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: no authorized tenants" });
  });

  it("createClientToken returns a token for authenticated user", () => {
    const req = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: ["tenant-a"],
      },
    } as unknown as Request;
    const res = createRes();

    createClientToken(req, res);

    expect(mocks.signAuthTokenWithTtl).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: expect.any(String), expiresIn: expect.any(String) })
    );
  });
});
