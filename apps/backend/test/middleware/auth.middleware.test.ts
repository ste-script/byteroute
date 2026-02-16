import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  ensurePassportAuthInitialized: vi.fn(),
  getCookieValue: vi.fn(),
  hydratePrincipalFromDatabase: vi.fn(),
  passportAuthenticate: vi.fn(),
}));

vi.mock("../../src/auth/passport.js", () => ({
  ensurePassportAuthInitialized: mocks.ensurePassportAuthInitialized,
}));

vi.mock("../../src/utils/cookie.js", () => ({
  AUTH_COOKIE_NAME: "byteroute_auth",
  getCookieValue: mocks.getCookieValue,
}));

vi.mock("../../src/auth/principal.js", () => ({
  hydratePrincipalFromDatabase: mocks.hydratePrincipalFromDatabase,
}));

vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn((strategy: string, options: unknown, callback: (error: unknown, user: unknown) => void) => {
      return (req: Request, res: Response, next: NextFunction) => {
        mocks.passportAuthenticate(strategy, options, callback, req, res, next);
      };
    }),
  },
}));

import { requireApiAuth } from "../../src/middleware/auth.middleware.js";

function createRes(): Response {
  const res: Partial<Response> = {};
  (res.status as unknown) = vi.fn(() => res);
  (res.json as unknown) = vi.fn(() => res);
  return res as Response;
}

describe("auth.middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensurePassportAuthInitialized.mockImplementation(() => undefined);
    mocks.getCookieValue.mockReturnValue(undefined);
  });

  it("returns 500 when auth initialization fails", () => {
    mocks.ensurePassportAuthInitialized.mockImplementation(() => {
      throw new Error("missing secret");
    });

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication misconfigured" });
    expect(next).not.toHaveBeenCalled();
  });

  it("injects bearer token from cookie when authorization header missing", () => {
    mocks.getCookieValue.mockReturnValue("cookie-token");
    mocks.hydratePrincipalFromDatabase.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      tenantIds: ["tenant-a"],
      scopes: ["api"],
    });
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, { id: "user-1" });
      }
    );

    const req = { headers: { cookie: "byteroute_auth=cookie-token" } } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);

    expect(req.headers.authorization).toBe("Bearer cookie-token");
  });

  it("uses first authorization header value when header is an array", async () => {
    const hydratedUser = {
      id: "user-1",
      email: "user@example.com",
      tenantIds: ["tenant-a"],
      scopes: ["api"],
    };

    mocks.hydratePrincipalFromDatabase.mockResolvedValue(hydratedUser);
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, { id: "user-1" });
      }
    );

    const req = {
      headers: {
        authorization: ["Bearer from-array", "Bearer ignored"],
      },
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.getCookieValue).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when passport returns error", () => {
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(new Error("passport failed"), false);
      }
    );

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication failed" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when passport provides no user", () => {
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, false);
      }
    );

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when hydrated user is missing", async () => {
    mocks.hydratePrincipalFromDatabase.mockResolvedValue(undefined);
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, { id: "user-1" });
      }
    );

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when db hydration throws", async () => {
    mocks.hydratePrincipalFromDatabase.mockRejectedValue(new Error("db down"));
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, { id: "user-1" });
      }
    );

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication failed" });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next when authentication succeeds", async () => {
    const hydratedUser = {
      id: "user-1",
      email: "user@example.com",
      tenantIds: ["tenant-a"],
      scopes: ["api"],
    };

    mocks.hydratePrincipalFromDatabase.mockResolvedValue(hydratedUser);
    mocks.passportAuthenticate.mockImplementation(
      (_strategy, _options, callback: (error: unknown, user: unknown) => void) => {
        callback(null, { id: "user-1" });
      }
    );

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requireApiAuth(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(req.user).toEqual(hydratedUser);
    expect(next).toHaveBeenCalled();
  });
});
