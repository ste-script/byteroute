import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import passport from "passport";
import {
  ensurePassportAuthInitialized,
  extractBearerTokenFromAuthorization,
  signAuthToken,
  signAuthTokenWithTtl,
  verifyAuthToken,
  verifyBearerToken,
} from "../../src/auth/passport.js";

const originalEnv = { ...process.env };

describe("auth/passport", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "test-jwt-secret",
      AUTH_TOKEN_TTL: "1d",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("extracts bearer token from authorization header", () => {
    expect(extractBearerTokenFromAuthorization("Bearer token-value")).toBe("token-value");
    expect(extractBearerTokenFromAuthorization("bearer token-value")).toBe("token-value");
  });

  it("returns undefined for invalid authorization headers", () => {
    expect(extractBearerTokenFromAuthorization(undefined)).toBeUndefined();
    expect(extractBearerTokenFromAuthorization("Basic abc")).toBeUndefined();
    expect(extractBearerTokenFromAuthorization("Bearer")).toBeUndefined();
  });

  it("signs and verifies auth token", () => {
    const token = signAuthToken({
      sub: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["tenant-a"],
    });

    const principal = verifyAuthToken(token);
    expect(principal).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: ["tenant-a"],
        scopes: ["api"],
      })
    );
  });

  it("returns undefined for invalid token payload", () => {
    expect(verifyAuthToken("not-a-token")).toBeUndefined();
    expect(verifyAuthToken(undefined)).toBeUndefined();
  });

  it("accepts tokens with an empty tenantIds array (new user with no tenants yet)", () => {
    const noTenantsToken = signAuthTokenWithTtl(
      {
        sub: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: [],
      },
      "1d"
    );

    const principal = verifyAuthToken(noTenantsToken);
    expect(principal).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "user@example.com",
        tenantIds: [],
      })
    );
  });

  it("returns a principal with empty tenantIds when the claim is missing", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "user@example.com", name: "User" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    const principal = verifyAuthToken(token);
    expect(principal).toEqual(
      expect.objectContaining({ id: "user-1", tenantIds: [] })
    );
  });

  it("returns undefined when sub claim is missing", () => {
    const token = jwt.sign(
      { email: "user@example.com", name: "User", tenantIds: ["tenant-a"] },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    expect(verifyAuthToken(token)).toBeUndefined();
  });

  it("returns undefined when email claim is missing", () => {
    const token = jwt.sign(
      { sub: "user-1", name: "User", tenantIds: ["tenant-a"] },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    expect(verifyAuthToken(token)).toBeUndefined();
  });

  it("filters non-string tenantIds from claims", () => {
    const token = jwt.sign(
      {
        sub: "user-1",
        email: "user@example.com",
        name: "User",
        tenantIds: ["tenant-a", 123],
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    const principal = verifyAuthToken(token);
    expect(principal).toEqual(
      expect.objectContaining({
        tenantIds: ["tenant-a"],
      })
    );
  });

  it("sets name as undefined when name claim is not a string", () => {
    const token = jwt.sign(
      {
        sub: "user-1",
        email: "user@example.com",
        name: 123,
        tenantIds: ["tenant-a"],
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    const principal = verifyAuthToken(token);
    expect(principal).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "user@example.com",
        name: undefined,
      })
    );
  });

  it("returns undefined when jwt payload is a string", () => {
    const token = jwt.sign("plain-string-payload", process.env.JWT_SECRET as string);
    expect(verifyAuthToken(token)).toBeUndefined();
  });

  it("verifyBearerToken delegates to verifyAuthToken", () => {
    const token = signAuthToken({
      sub: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["tenant-a"],
    });

    expect(verifyBearerToken(token)).toBe(true);
    expect(verifyBearerToken("invalid")).toBe(false);
  });

  it("initializes passport bearer strategy when configured", () => {
    expect(() => ensurePassportAuthInitialized()).not.toThrow();
  });

  it("strategy callback rejects invalid token and accepts valid token", () => {
    const useSpy = vi.spyOn(passport, "use");

    ensurePassportAuthInitialized();
    const strategy = useSpy.mock.calls[0]?.[1] as unknown as { _verify: (token: string, done: (...args: unknown[]) => void) => void };

    const invalidDone = vi.fn();
    strategy._verify("invalid-token", invalidDone);
    expect(invalidDone).toHaveBeenCalledWith(null, false);

    const validToken = signAuthToken({
      sub: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["tenant-a"],
    });
    const validDone = vi.fn();
    strategy._verify(validToken, validDone);
    expect(validDone).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ id: "user-1", tenantIds: ["tenant-a"] })
    );

    useSpy.mockRestore();
  });

  it("throws when jwt secret is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => ensurePassportAuthInitialized()).toThrow("JWT_SECRET is required");
  });
});
