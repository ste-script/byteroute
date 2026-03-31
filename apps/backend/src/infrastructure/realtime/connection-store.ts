/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module backend/infrastructure/realtime/connection-store
 */

import type { Connection } from "@byteroute/shared";

export type TenantConnection = Connection & { tenantId: string };

/**
 * Represents an in memory connection store.
 */

export class InMemoryConnectionStore {
  private readonly connectionsByTenant: Map<
    string,
    Map<string, TenantConnection>
  > = new Map();

  /**
   * Gets tenant connections map.
   * @param tenantId - The tenant ID input.
   * @returns The tenant connections map.
   */

  private getTenantConnectionsMap(
    tenantId: string,
  ): Map<string, TenantConnection> {
    const existing = this.connectionsByTenant.get(tenantId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, TenantConnection>();
    this.connectionsByTenant.set(tenantId, created);
    return created;
  }

  /**
   * Resets the requested result.
   */

  reset(): void {
    this.connectionsByTenant.clear();
  }

  /**
   * Sets the value.
   * @param connection - The connection input.
   * @returns The operation result.
   */

  set(connection: TenantConnection): TenantConnection {
    const map = this.getTenantConnectionsMap(connection.tenantId);
    if (map.has(connection.id)) {
      map.delete(connection.id);
    }
    map.set(connection.id, connection);
    return connection;
  }

  /**
   * Upserts the requested result.
   * @param connection - The connection input.
   * @returns The operation result.
   */

  upsert(connection: TenantConnection): {
    connection: TenantConnection;
    existed: boolean;
  } {
    const tenantConnections = this.getTenantConnectionsMap(connection.tenantId);
    const existed = tenantConnections.has(connection.id);

    if (existed) {
      tenantConnections.delete(connection.id);
    }
    tenantConnections.set(connection.id, connection);
    return { connection, existed };
  }

  /**
   * Gets by tenant.
   * @param tenantId - The tenant ID input.
   * @returns The by tenant.
   */

  getByTenant(tenantId: string): Connection[] {
    return Array.from(this.getTenantConnectionsMap(tenantId).values());
  }

  /**
   * Gets all.
   * @returns The all.
   */

  getAll(): Connection[] {
    const all: Connection[] = [];
    for (const tenantConnections of this.connectionsByTenant.values()) {
      all.push(...tenantConnections.values());
    }
    return all;
  }

  /**
   * Gets one.
   * @param tenantId - The tenant ID input.
   * @param id - The ID input.
   * @returns The one.
   */

  getOne(tenantId: string, id: string): Connection | undefined {
    return this.getTenantConnectionsMap(tenantId).get(id);
  }

  /**
   * Removes the requested result.
   * @param tenantId - The tenant ID input.
   * @param id - The ID input.
   * @returns The operation result.
   */

  remove(tenantId: string, id: string): boolean {
    return this.getTenantConnectionsMap(tenantId).delete(id);
  }

  /**
   * Gets tenant ids.
   * @returns The tenant ids.
   */

  getTenantIds(): string[] {
    return Array.from(this.connectionsByTenant.keys());
  }
}
