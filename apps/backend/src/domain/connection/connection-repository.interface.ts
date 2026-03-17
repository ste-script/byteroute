/**
 * @module backend/domain/connection/connection-repository.interface
 */

import type { Connection } from "./types.js";

export type ConnectionHistoryFilters = {
  q?: string;
  status?: Connection["status"];
  protocol?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
};

export type ConnectionHistoryResult = {
  items: Connection[];
  total: number;
};

export interface IConnectionRepository {
  bulkUpsert(tenantId: string, connections: Connection[]): Promise<void>;
  loadByTenant(tenantId: string): Promise<Connection[]>;
  loadAllGroupedByTenant(): Promise<Map<string, Connection[]>>;
  loadHistory(
    tenantId: string,
    filters: ConnectionHistoryFilters,
  ): Promise<ConnectionHistoryResult>;
}
