import type { Connection } from "@byteroute/shared";
import { ensureTenantId } from "../../utils/tenant.js";

export type TenantConnection = Connection & { tenantId: string };

const connectionsByTenant: Map<string, Map<string, TenantConnection>> = new Map();

function getTenantConnectionsMap(tenantId: string): Map<string, TenantConnection> {
  const existing = connectionsByTenant.get(tenantId);
  if (existing) {
    return existing;
  }

  const created = new Map<string, TenantConnection>();
  connectionsByTenant.set(tenantId, created);
  return created;
}

export function normalizeTenantConnection(connection: Connection, fallbackTenantId?: string): TenantConnection {
  const tenantId = ensureTenantId(connection.tenantId ?? fallbackTenantId);
  return {
    ...connection,
    tenantId,
  } as TenantConnection;
}

export function resetConnectionStore(): void {
  connectionsByTenant.clear();
}

export function setConnection(connection: Connection, fallbackTenantId?: string): TenantConnection {
  const normalized = normalizeTenantConnection(connection, fallbackTenantId);
  getTenantConnectionsMap(normalized.tenantId).set(normalized.id, normalized);
  return normalized;
}

export function upsertConnection(
  connection: Connection,
  fallbackTenantId?: string
): { connection: TenantConnection; existed: boolean } {
  const normalized = normalizeTenantConnection(connection, fallbackTenantId);
  const tenantConnections = getTenantConnectionsMap(normalized.tenantId);
  const existed = tenantConnections.has(normalized.id);
  tenantConnections.set(normalized.id, normalized);
  return { connection: normalized, existed };
}

export function getTenantConnections(tenantId: string): Connection[] {
  return Array.from(getTenantConnectionsMap(tenantId).values());
}

export function getAllConnections(): Connection[] {
  const all: Connection[] = [];
  for (const tenantConnections of connectionsByTenant.values()) {
    all.push(...tenantConnections.values());
  }
  return all;
}

export function getTenantConnection(tenantId: string, id: string): Connection | undefined {
  return getTenantConnectionsMap(tenantId).get(id);
}

export function removeTenantConnection(tenantId: string, id: string): boolean {
  return getTenantConnectionsMap(tenantId).delete(id);
}

export function getKnownTenantIds(): string[] {
  return Array.from(connectionsByTenant.keys());
}
