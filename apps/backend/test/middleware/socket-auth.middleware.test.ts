import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
}));

import {
  extractBearerTokenFromSocketHandshake,
  socketAuthMiddleware,
} from "../../src/middleware/socket-auth.middleware.js";
import { signAuthToken } from "../../src/auth/passport.js";

type MockSocket = {
  data?: Record<string, unknown>;
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
  return { handshake, data: {} };
}

function mockUserLookup(tenantIds: string[] = ["default"]): void {
  const lean = vi.fn().mockResolvedValue({
    _id: "user-1",
    email: "user@example.com",
    name: "User",
  });
  const select = vi.fn().mockReturnValue({ lean });
  sharedMocks.findById.mockReturnValue({ select });

  const tenantLean = vi.fn().mockResolvedValue(tenantIds.map((t) => ({ tenantId: t })));
  const tenantSelect = vi.fn().mockReturnValue({ lean: tenantLean });
  sharedMocks.findTenants.mockReturnValue({ select: tenantSelect });
}

describe("socketAuthMiddleware", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: "test-jwt-secret" };
    vi.clearAllMocks();
    mockUserLookup();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects connection when token is invalid", async () => {
    const next = vi.fn();

    socketAuthMiddleware(
      createSocket({ auth: { token: "wrong-token" } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const err = next.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Unauthorized");
  });

  it("allows connection when token is valid", async () => {
    const next = vi.fn();
    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    socketAuthMiddleware(
      createSocket({ auth: { token } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledWith();
  });

  it("accepts bearer token from authorization header", async () => {
    const next = vi.fn();
    const token = signAuthToken({ sub: "user-1", email: "user@example.com", name: "User", tenantIds: ["default"] });

    socketAuthMiddleware(
      createSocket({ headers: { authorization: `Bearer ${token}` } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledWith();
  });

  it("returns misconfigured error when token is required but missing in env", async () => {
    delete process.env.JWT_SECRET;
    const next = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    socketAuthMiddleware(
      createSocket({ auth: { token: "any-token" } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

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

  it("extracts from auth.bearerToken field", () => {
    const token = extractBearerTokenFromSocketHandshake({
      auth: { bearerToken: "  token-4  " },
    });

    expect(token).toBe("token-4");
  });

  it("returns undefined when handshake is undefined", () => {
    expect(extractBearerTokenFromSocketHandshake(undefined)).toBeUndefined();
  });
});

describe("socketAuthMiddleware – additional branches", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: "test-jwt-secret" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects when user is not found in the database", async () => {
    // Valid JWT but hydration returns null (user deleted from DB)
    const token = signAuthToken({ sub: "ghost-user", email: "ghost@example.com", name: "Ghost", tenantIds: ["default"] });
    const next = vi.fn();

    // Override: DB returns no user
    const lean = vi.fn().mockResolvedValue(null);
    const select = vi.fn().mockReturnValue({ lean });
    sharedMocks.findById.mockReturnValue({ select });

    socketAuthMiddleware(
      createSocket({ auth: { token } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const err = next.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Unauthorized");
  });

  it("rejects when principal lacks access to the requested tenant", async () => {
    const token = signAuthToken({ sub: "user-1", email: "u@example.com", name: "U", tenantIds: ["default"] });
    const next = vi.fn();

    // User only has 'default' tenant
    const lean = vi.fn().mockResolvedValue({ _id: "user-1", email: "u@example.com", name: "U" });
    const select = vi.fn().mockReturnValue({ lean });
    sharedMocks.findById.mockReturnValue({ select });

    const tenantLean = vi.fn().mockResolvedValue([{ tenantId: "default" }]);
    const tenantSelect = vi.fn().mockReturnValue({ lean: tenantLean });
    sharedMocks.findTenants.mockReturnValue({ select: tenantSelect });

    // Socket requests a tenant the user doesn't have
    socketAuthMiddleware(
      createSocket({ auth: { token, tenantId: "other-tenant" } }) as never,
      next
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const err = next.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Forbidden: no access to tenant");
  });
});
