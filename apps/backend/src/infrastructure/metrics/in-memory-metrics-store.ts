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
 * @module backend/infrastructure/metrics/in-memory-metrics-store
 */

import type { TimeSeriesData } from "@byteroute/shared";
import type { IMetricsStore } from "../../domain/metrics/metrics-store.interface.js";
import { ensureTenantId } from "../../utils/tenant.js";

/**
 * Represents an in memory metrics store.
 */

export class InMemoryMetricsStore implements IMetricsStore {
  private snapshotsByTenant: Map<string, TimeSeriesData[]> = new Map();
  private readonly maxSnapshots = 168;

  /**
   * Gets tenant snapshots.
   * @param tenantId - The tenant ID input.
   * @returns The tenant snapshots.
   */

  private getTenantSnapshots(tenantId: string): TimeSeriesData[] {
    const existing = this.snapshotsByTenant.get(tenantId);
    if (existing) {
      return existing;
    }

    const created: TimeSeriesData[] = [];
    this.snapshotsByTenant.set(tenantId, created);
    return created;
  }

  /**
   * Adds snapshots.
   * @param tenantId - The tenant ID input.
   * @param newSnapshots - The new snapshots input.
   */

  addSnapshots(tenantId: string, newSnapshots: TimeSeriesData[]): void {
    const normalizedTenantId = ensureTenantId(tenantId);
    const snapshots = this.getTenantSnapshots(normalizedTenantId);

    for (const snapshot of newSnapshots) {
      const timestamp = new Date(snapshot.timestamp);

      snapshots.push({
        timestamp,
        connections: snapshot.connections,
        bandwidthIn: snapshot.bandwidthIn,
        bandwidthOut: snapshot.bandwidthOut,
        inactive: snapshot.inactive ?? 0,
      });
    }

    snapshots.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    if (snapshots.length > this.maxSnapshots) {
      this.snapshotsByTenant.set(
        normalizedTenantId,
        snapshots.slice(-this.maxSnapshots),
      );
    }
  }

  /**
   * Gets time series.
   * @param tenantId - The tenant ID input.
   * @param hours - The hours input.
   * @returns The time series.
   */

  getTimeSeries(tenantId: string, hours: number = 24): TimeSeriesData[] {
    const normalizedTenantId = ensureTenantId(tenantId);
    const snapshots = this.getTenantSnapshots(normalizedTenantId);

    if (snapshots.length === 0) {
      return [];
    }

    const snapshotsToReturn = Math.min(hours, snapshots.length);
    return snapshots.slice(-snapshotsToReturn);
  }

  /**
   * Gets all snapshots.
   * @param tenantId - The tenant ID input.
   * @returns The all snapshots.
   */

  getAllSnapshots(tenantId: string): TimeSeriesData[] {
    return [...this.getTenantSnapshots(ensureTenantId(tenantId))];
  }

  /**
   * Gets tenant ids.
   * @returns The tenant ids.
   */

  getTenantIds(): string[] {
    return Array.from(this.snapshotsByTenant.keys());
  }

  /**
   * Clears the requested result.
   */

  clear(): void {
    this.snapshotsByTenant.clear();
  }
}
