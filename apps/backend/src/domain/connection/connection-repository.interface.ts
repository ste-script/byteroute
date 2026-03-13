/**
 * @module backend/domain/connection/connection-repository.interface
 */

import type { Connection } from "./types.js";

export interface IConnectionRepository {
  bulkUpsert(tenantId: string, connections: Connection[]): Promise<void>;
  loadByTenant(tenantId: string): Promise<Connection[]>;
  loadAllGroupedByTenant(): Promise<Map<string, Connection[]>>;
}
