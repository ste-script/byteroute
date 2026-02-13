import type { Request } from "express";

export const DEFAULT_TENANT_ID = "default";

export type TenantContext = {
  tenantId: string;
  tenantRoom: string;
};

function takeFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function sanitizeTenantId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

export function ensureTenantId(value: unknown): string {
  return sanitizeTenantId(value) ?? DEFAULT_TENANT_ID;
}

export function getTenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function createTenantContext(tenantIdLike: unknown): TenantContext {
  const tenantId = ensureTenantId(tenantIdLike);
  return {
    tenantId,
    tenantRoom: getTenantRoom(tenantId),
  };
}

export function resolveTenantIdFromRequest(req: Request): string {
  const headerTenant = sanitizeTenantId(takeFirstHeaderValue(req.headers["x-tenant-id"]));
  const queryTenant = sanitizeTenantId(req.query?.tenantId);
  return headerTenant ?? queryTenant ?? DEFAULT_TENANT_ID;
}

export function resolveTenantContextFromRequest(req: Request): TenantContext {
  return createTenantContext(resolveTenantIdFromRequest(req));
}

type SocketHandshakeLike = {
  auth?: { tenantId?: unknown };
  query?: { tenantId?: unknown };
  headers?: Record<string, string | string[] | undefined>;
};

export function resolveTenantContextFromSocketHandshake(
  handshake?: SocketHandshakeLike
): TenantContext {
  const tenantId =
    sanitizeTenantId(handshake?.auth?.tenantId) ??
    sanitizeTenantId(handshake?.query?.tenantId) ??
    sanitizeTenantId(takeFirstHeaderValue(handshake?.headers?.["x-tenant-id"])) ??
    DEFAULT_TENANT_ID;

  return createTenantContext(tenantId);
}
