import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findTenants: vi.fn(),
}));

vi.mock("@byteroute/shared", () => ({
  UserModel: {
    findById: mocks.findById,
  },
  TenantModel: {
    find: mocks.findTenants,
  },
}));

import { hydratePrincipalFromDatabase } from "../../src/auth/principal.js";

function mockTenants(tenantIds: string[]): void {
  const lean = vi.fn().mockResolvedValue(tenantIds.map((t) => ({ tenantId: t })));
  const select = vi.fn().mockReturnValue({ lean });
  mocks.findTenants.mockReturnValue({ select });
}

describe("auth/principal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenants([]);
  });

  it("returns undefined for missing principal id", async () => {
    await expect(hydratePrincipalFromDatabase(undefined)).resolves.toBeUndefined();
    await expect(hydratePrincipalFromDatabase({})).resolves.toBeUndefined();
  });

  it("returns undefined when user is not found", async () => {
    const lean = vi.fn().mockResolvedValue(null);
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });

    await expect(hydratePrincipalFromDatabase({ id: "user-1" })).resolves.toBeUndefined();
  });

  it("returns undefined when user has no email", async () => {
    const lean = vi.fn().mockResolvedValue({ _id: "user-1", tenantIds: ["tenant-a"] });
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });

    await expect(hydratePrincipalFromDatabase({ id: "user-1" })).resolves.toBeUndefined();
  });

  it("returns undefined when user has no tenant access", async () => {
    const lean = vi.fn().mockResolvedValue({ _id: "user-1", email: "user@example.com", tenantIds: [] });
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });
    mockTenants([]);

    await expect(hydratePrincipalFromDatabase({ id: "user-1" })).resolves.toBeUndefined();
  });

  it("hydrates principal with normalized scopes and tenant ids", async () => {
    const lean = vi.fn().mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
      name: "User",
    });
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });
    mockTenants(["tenant-a", "tenant-a", "", " tenant-b "]);

    await expect(
      hydratePrincipalFromDatabase({ id: "user-1", scopes: ["api", 123, "ws"] })
    ).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantIds: ["tenant-a", "tenant-b"],
      scopes: ["api", "ws"],
    });
  });

  it("defaults scopes to api when none provided", async () => {
    const lean = vi.fn().mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
    });
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });
    mockTenants(["tenant-a"]);

    await expect(hydratePrincipalFromDatabase({ id: "user-1", scopes: [] })).resolves.toEqual(
      expect.objectContaining({ scopes: ["api"] })
    );
  });

  it("defaults scopes to api when scopes is not an array", async () => {
    const lean = vi.fn().mockResolvedValue({
      _id: "user-1",
      email: "user@example.com",
    });
    const select = vi.fn().mockReturnValue({ lean });
    mocks.findById.mockReturnValue({ select });
    mockTenants(["tenant-a"]);

    await expect(hydratePrincipalFromDatabase({ id: "user-1", scopes: "api" })).resolves.toEqual(
      expect.objectContaining({ scopes: ["api"] })
    );
  });
});
