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
