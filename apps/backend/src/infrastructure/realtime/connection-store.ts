/**
 * @module backend/infrastructure/realtime/connection-store
 */

import type { Connection } from "@byteroute/shared";

export type TenantConnection = Connection & { tenantId: string };

export class InMemoryConnectionStore {
  private readonly connectionsByTenant: Map<string, Map<string, TenantConnection>> = new Map();

  private getTenantConnectionsMap(tenantId: string): Map<string, TenantConnection> {
    const existing = this.connectionsByTenant.get(tenantId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, TenantConnection>();
    this.connectionsByTenant.set(tenantId, created);
    return created;
  }

  reset(): void {
    this.connectionsByTenant.clear();
  }

  set(connection: TenantConnection): TenantConnection {
    const map = this.getTenantConnectionsMap(connection.tenantId);
    if (map.has(connection.id)) {
      map.delete(connection.id);
    }
    map.set(connection.id, connection);
    return connection;
  }

  upsert(connection: TenantConnection): { connection: TenantConnection; existed: boolean } {
    const tenantConnections = this.getTenantConnectionsMap(connection.tenantId);
    const existed = tenantConnections.has(connection.id);

    if (existed) {
      tenantConnections.delete(connection.id);
    }
    tenantConnections.set(connection.id, connection);
    return { connection, existed };
  }

  getByTenant(tenantId: string): Connection[] {
    return Array.from(this.getTenantConnectionsMap(tenantId).values());
  }

  getAll(): Connection[] {
    const all: Connection[] = [];
    for (const tenantConnections of this.connectionsByTenant.values()) {
      all.push(...tenantConnections.values());
    }
    return all;
  }

  getOne(tenantId: string, id: string): Connection | undefined {
    return this.getTenantConnectionsMap(tenantId).get(id);
  }

  remove(tenantId: string, id: string): boolean {
    return this.getTenantConnectionsMap(tenantId).delete(id);
  }

  getTenantIds(): string[] {
    return Array.from(this.connectionsByTenant.keys());
  }
}
