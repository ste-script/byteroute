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
