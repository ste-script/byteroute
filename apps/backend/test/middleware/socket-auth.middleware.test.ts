import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractBearerTokenFromSocketHandshake,
  socketAuthMiddleware,
} from "../../src/middleware/socket-auth.middleware.js";
import { signAuthToken } from "../../src/auth/passport.js";

type MockSocket = {
  handshake?: {
    auth?: {
      token?: unknown;
      bearerToken?: unknown;
      authorization?: unknown;
    };
    headers?: Record<string, string | string[] | undefined>;
  };
};

const originalEnv = { ...process.env };

function createSocket(handshake?: MockSocket["handshake"]): MockSocket {
  return { handshake };
}

describe("socketAuthMiddleware", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: "test-jwt-secret" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects connection when token is invalid", () => {
    const next = vi.fn();

    socketAuthMiddleware(
      createSocket({ auth: { token: "wrong-token" } }) as never,
      next
    );

    const err = next.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Unauthorized");
  });

  it("allows connection when token is valid", () => {
    const next = vi.fn();
    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User" });

    socketAuthMiddleware(
      createSocket({ auth: { token } }) as never,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("accepts bearer token from authorization header", () => {
    const next = vi.fn();
    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User" });

    socketAuthMiddleware(
      createSocket({ headers: { authorization: `Bearer ${token}` } }) as never,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("returns misconfigured error when token is required but missing in env", () => {
    delete process.env.JWT_SECRET;
    const next = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    socketAuthMiddleware(
      createSocket({ auth: { token: "any-token" } }) as never,
      next
    );

    const err = next.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Authentication misconfigured");
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("extractBearerTokenFromSocketHandshake", () => {
  it("extracts from auth.token first", () => {
    const token = extractBearerTokenFromSocketHandshake({
      auth: { token: "token-1" },
      headers: { authorization: "Bearer token-2" },
    });

    expect(token).toBe("token-1");
  });

  it("extracts from auth.authorization bearer format", () => {
    const token = extractBearerTokenFromSocketHandshake({
      auth: { authorization: "Bearer token-3" },
    });

    expect(token).toBe("token-3");
  });
});
