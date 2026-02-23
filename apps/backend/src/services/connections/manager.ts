import type { Connection } from "@byteroute/shared";
import {
  generateStatistics,
} from "../../mock/connections.js";
import { deriveTrafficFlows } from "./trafficFlows.js";
import { ensureTenantId } from "../../utils/tenant.js";
import { emitToTenant } from "./emitter.js";
import {
  getAllConnections,
  getKnownTenantIds,
  getTenantConnection,
  getTenantConnections,
  removeTenantConnection,
  setConnection,
  upsertConnection,
} from "./store.js";
import type { TypedSocketServer } from "./types.js";

export function getConnectionsForTenant(tenantId: string): Connection[] {
  return getTenantConnections(ensureTenantId(tenantId));
}

export function getAllConnectionsSnapshot(): Connection[] {
  return getAllConnections();
}

export function getConnectionById(tenantId: string, id: string): Connection | undefined {
  return getTenantConnection(ensureTenantId(tenantId), id);
}

export function upsertConnectionsLocal(
  io: TypedSocketServer,
  tenantId: string,
  batch: Connection[]
): void {
  const resolvedTenantId = ensureTenantId(tenantId);

  for (const connection of batch) {
    const { connection: normalized, existed } = upsertConnection(connection, resolvedTenantId);

    if (existed) {
      emitToTenant(io, normalized.tenantId, "connection:update", normalized);
    } else {
      emitToTenant(io, normalized.tenantId, "connection:new", normalized);
    }
  }

}

export function updateConnection(
  io: TypedSocketServer,
  tenantId: string,
  id: string,
  updates: Partial<Connection>
): Connection | null {
  const resolvedTenantId = ensureTenantId(tenantId);
  const existing = getTenantConnection(resolvedTenantId, id);
  if (!existing) {
    return null;
  }

  const updated = setConnection(
    {
      ...existing,
      ...updates,
      tenantId: resolvedTenantId,
      id,
      lastActivity: new Date().toISOString(),
    },
    resolvedTenantId
  );

  emitToTenant(io, resolvedTenantId, "connection:update", updated);

  if (updates.status && updates.status !== existing.status) {
    emitStatisticsUpdate(io, resolvedTenantId);
  }

  return updated;
}

export function removeConnection(io: TypedSocketServer, tenantId: string, id: string): boolean {
  const resolvedTenantId = ensureTenantId(tenantId);
  const existed = removeTenantConnection(resolvedTenantId, id);

  if (existed) {
    emitToTenant(io, resolvedTenantId, "connection:remove", { id });
    emitStatisticsUpdate(io, resolvedTenantId);
  }

  return existed;
}

export function emitConnectionsBatch(io: TypedSocketServer, tenantId: string): void {
  const resolvedTenantId = ensureTenantId(tenantId);
  emitToTenant(io, resolvedTenantId, "connections:batch", getTenantConnections(resolvedTenantId));
}

export function emitTrafficFlows(io: TypedSocketServer, tenantId: string): void {
  const resolvedTenantId = ensureTenantId(tenantId);
  const flows = deriveTrafficFlows(getTenantConnections(resolvedTenantId));
  emitToTenant(io, resolvedTenantId, "traffic:flows", flows);
}

export function emitTrafficFlowsAllTenants(io: TypedSocketServer): void {
  for (const tenantId of getKnownTenantIds()) {
    emitTrafficFlows(io, tenantId);
  }
}

export function emitStatisticsUpdate(io: TypedSocketServer, tenantId: string): void {
  const resolvedTenantId = ensureTenantId(tenantId);
  const stats = generateStatistics(getTenantConnections(resolvedTenantId), resolvedTenantId);
  emitToTenant(io, resolvedTenantId, "statistics:update", stats);
}

export function emitStatisticsUpdateAllTenants(io: TypedSocketServer): void {
  for (const tenantId of getKnownTenantIds()) {
    emitStatisticsUpdate(io, tenantId);
  }
}

export function emitError(io: TypedSocketServer, message: string, code?: string): void {
  io.emit("error", { message, code });
}
