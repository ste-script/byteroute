/**
 * @module backend/services/connections/store
 */

import type { Connection } from "@byteroute/shared";
import { ensureTenantId } from "../../utils/tenant.js";

export type TenantConnection = Connection & { tenantId: string };

const connectionsByTenant: Map<
  string,
  Map<string, TenantConnection>
> = new Map();

/**
 * Gets tenant connections map.
 * @param tenantId - The tenant ID input.
 * @returns The tenant connections map.
 */

function getTenantConnectionsMap(
  tenantId: string,
): Map<string, TenantConnection> {
  const existing = connectionsByTenant.get(tenantId);
  if (existing) {
    return existing;
  }

  const created = new Map<string, TenantConnection>();
  connectionsByTenant.set(tenantId, created);
  return created;
}

/**
 * Normalizes tenant connection.
 * @param connection - The connection input.
 * @param fallbackTenantId - The fallback tenant ID input.
 * @returns The tenant connection result.
 */

export function normalizeTenantConnection(
  connection: Connection,
  fallbackTenantId?: string,
): TenantConnection {
  const tenantId = ensureTenantId(connection.tenantId ?? fallbackTenantId);
  return {
    ...connection,
    tenantId,
  } as TenantConnection;
}

/**
 * Resets connection store.
 */

export function resetConnectionStore(): void {
  connectionsByTenant.clear();
}

/**
 * Sets connection.
 * @param connection - The connection input.
 * @param fallbackTenantId - The fallback tenant ID input.
 * @returns The connection result.
 */

export function setConnection(
  connection: Connection,
  fallbackTenantId?: string,
): TenantConnection {
  const normalized = normalizeTenantConnection(connection, fallbackTenantId);
  const map = getTenantConnectionsMap(normalized.tenantId);
  if (map.has(normalized.id)) {
    // Refresh insertion order so iteration reflects recency.
    map.delete(normalized.id);
  }
  map.set(normalized.id, normalized);
  return normalized;
}

/**
 * Upserts connection.
 * @param connection - The connection input.
 * @param fallbackTenantId - The fallback tenant ID input.
 * @returns The connection result.
 */

export function upsertConnection(
  connection: Connection,
  fallbackTenantId?: string,
): { connection: TenantConnection; existed: boolean } {
  const normalized = normalizeTenantConnection(connection, fallbackTenantId);
  const tenantConnections = getTenantConnectionsMap(normalized.tenantId);
  const existed = tenantConnections.has(normalized.id);

  if (existed) {
    // Refresh insertion order so iteration reflects recency.
    tenantConnections.delete(normalized.id);
  }
  tenantConnections.set(normalized.id, normalized);
  return { connection: normalized, existed };
}

/**
 * Gets tenant connections.
 * @param tenantId - The tenant ID input.
 * @returns The tenant connections.
 */

export function getTenantConnections(tenantId: string): Connection[] {
  return Array.from(getTenantConnectionsMap(tenantId).values());
}

/**
 * Gets all connections.
 * @returns The all connections.
 */

export function getAllConnections(): Connection[] {
  const all: Connection[] = [];
  for (const tenantConnections of connectionsByTenant.values()) {
    all.push(...tenantConnections.values());
  }
  return all;
}

/**
 * Gets tenant connection.
 * @param tenantId - The tenant ID input.
 * @param id - The ID input.
 * @returns The tenant connection.
 */

export function getTenantConnection(
  tenantId: string,
  id: string,
): Connection | undefined {
  return getTenantConnectionsMap(tenantId).get(id);
}

/**
 * Removes tenant connection.
 * @param tenantId - The tenant ID input.
 * @param id - The ID input.
 * @returns The tenant connection result.
 */

export function removeTenantConnection(tenantId: string, id: string): boolean {
  return getTenantConnectionsMap(tenantId).delete(id);
}

/**
 * Gets known tenant ids.
 * @returns The known tenant ids.
 */

export function getKnownTenantIds(): string[] {
  return Array.from(connectionsByTenant.keys());
}
