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
 * @module backend/domain/metrics/metrics-store.interface
 */

import type { TimeSeriesData } from "./types.js";

export interface IMetricsStore {
  addSnapshots(tenantId: string, snapshots: TimeSeriesData[]): void;
  getTimeSeries(tenantId: string, hours?: number): TimeSeriesData[];
  getAllSnapshots(tenantId: string): TimeSeriesData[];
  getTenantIds(): string[];
  clear(): void;
}
