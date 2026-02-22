import { describe, expect, it } from "vitest";
import type { Request } from "express";
import {
  DEFAULT_TENANT_ID,
  ensureTenantId,
  getTenantRoom,
  resolveTenantIdFromRequest,
  sanitizeTenantId,
} from "../../src/utils/tenant.js";

describe("tenant utils", () => {
  it("sanitizes tenant IDs and rejects invalid values", () => {
    expect(sanitizeTenantId(" tenant-a ")).toBe("tenant-a");
    expect(sanitizeTenantId("   ")).toBeUndefined();
    expect(sanitizeTenantId(123)).toBeUndefined();
  });

  it("ensures tenant defaults", () => {
    expect(ensureTenantId("tenant-b")).toBe("tenant-b");
    expect(ensureTenantId("")).toBe(DEFAULT_TENANT_ID);
    expect(ensureTenantId(undefined)).toBe(DEFAULT_TENANT_ID);
  });

  it("builds tenant room names", () => {
    expect(getTenantRoom("tenant-z")).toBe("tenant:tenant-z");
  });

  it("resolves tenant from header array and falls back to query/default", () => {
    const reqFromHeader = {
      headers: { "x-tenant-id": ["tenant-header", "tenant-ignored"] },
      query: {},
    } as unknown as Request;
    expect(resolveTenantIdFromRequest(reqFromHeader)).toBe("tenant-header");

    const reqFromQuery = {
      headers: {},
      query: { tenantId: "tenant-query" },
    } as unknown as Request;
    expect(resolveTenantIdFromRequest(reqFromQuery)).toBe("tenant-query");

    const reqDefault = {
      headers: {},
      query: {},
    } as unknown as Request;
    expect(resolveTenantIdFromRequest(reqDefault)).toBe(DEFAULT_TENANT_ID);
  });

  it("uses explicit fallback (principal tenantId) when no header or query is present", () => {
    const req = { headers: {}, query: {} } as unknown as Request;

    expect(resolveTenantIdFromRequest(req, "principal-tenant")).toBe("principal-tenant");

    // header takes priority over fallback
    const reqWithHeader = {
      headers: { "x-tenant-id": "header-tenant" },
      query: {},
    } as unknown as Request;
    expect(resolveTenantIdFromRequest(reqWithHeader, "principal-tenant")).toBe("header-tenant");

    // blank fallback still resolves to default
    expect(resolveTenantIdFromRequest(req, "  ")).toBe(DEFAULT_TENANT_ID);
  });
});
