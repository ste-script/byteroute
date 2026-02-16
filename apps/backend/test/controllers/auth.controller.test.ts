import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  signAuthToken: vi.fn(() => "jwt-token"),
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
}));

vi.mock("../../src/services/password.js", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

import { signIn, signUp } from "../../src/controllers/auth.controller.js";

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
});
