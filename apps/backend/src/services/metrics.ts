import type { TimeSeriesData } from "@byteroute/shared";
import { ensureTenantId } from "../utils/tenant.js";

/**
 * Service for managing time-series metrics received from clients
 */
class MetricsStore {
  private snapshotsByTenant: Map<string, TimeSeriesData[]> = new Map();
  private readonly maxSnapshots = 168; // Keep 7 days of hourly data

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
   * Add metrics snapshots from client
   */
  addSnapshots(tenantId: string, newSnapshots: TimeSeriesData[]): void {
    const normalizedTenantId = ensureTenantId(tenantId);

    const snapshots = this.getTenantSnapshots(normalizedTenantId);

    for (const snapshot of newSnapshots) {
      // Ensure timestamp is a Date object
      const timestamp = new Date(snapshot.timestamp);

      snapshots.push({
        timestamp,
        connections: snapshot.connections,
        bandwidthIn: snapshot.bandwidthIn,
        bandwidthOut: snapshot.bandwidthOut,
        inactive: snapshot.inactive ?? 0,
      });
    }

    // Sort by timestamp (oldest first)
    snapshots.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    // Trim old snapshots to maintain max limit
    if (snapshots.length > this.maxSnapshots) {
      this.snapshotsByTenant.set(normalizedTenantId, snapshots.slice(-this.maxSnapshots));
    }

    console.log(`[Metrics] Stored ${newSnapshots.length} snapshot(s) for tenant=${normalizedTenantId}`);
  }

  /**
   * Get time-series data for a specific time range
   * @param hours - Number of hours to retrieve (default: 24)
   */
  getTimeSeries(tenantId: string, hours: number = 24): TimeSeriesData[] {
    const normalizedTenantId = ensureTenantId(tenantId);
    const snapshots = this.getTenantSnapshots(normalizedTenantId);

    // If no snapshots, return empty array
    if (snapshots.length === 0) {
      return [];
    }

    // Calculate how many snapshots to return
    const snapshotsToReturn = Math.min(hours, snapshots.length);

    // Get the most recent snapshots
    return snapshots.slice(-snapshotsToReturn);
  }

  /**
   * Get all snapshots (for debugging)
   */
  getAllSnapshots(tenantId: string): TimeSeriesData[] {
    return [...this.getTenantSnapshots(ensureTenantId(tenantId))];
  }

  /**
   * Clear all stored metrics
   */
  clear(): void {
    this.snapshotsByTenant.clear();
    console.log('[Metrics] Cleared all snapshots');
  }
}

// Export singleton instance
export const metricsStore = new MetricsStore();
