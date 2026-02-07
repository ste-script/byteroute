import type { TimeSeriesData } from "@byteroute/shared";

/**
 * Service for managing time-series metrics received from clients
 */
class MetricsStore {
  private snapshots: TimeSeriesData[] = [];
  private readonly maxSnapshots = 168; // Keep 7 days of hourly data

  /**
   * Add metrics snapshots from client
   */
  addSnapshots(newSnapshots: TimeSeriesData[]): void {
    for (const snapshot of newSnapshots) {
      // Ensure timestamp is a Date object
      const timestamp = snapshot.timestamp instanceof Date
        ? snapshot.timestamp
        : new Date(snapshot.timestamp);

      this.snapshots.push({
        timestamp,
        connections: snapshot.connections,
        bandwidthIn: snapshot.bandwidthIn,
        bandwidthOut: snapshot.bandwidthOut,
        inactive: snapshot.inactive ?? 0,
      });
    }

    // Sort by timestamp (oldest first)
    this.snapshots.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    // Trim old snapshots to maintain max limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    console.log(`[Metrics] Stored ${newSnapshots.length} snapshot(s), total: ${this.snapshots.length}`);
  }

  /**
   * Get time-series data for a specific time range
   * @param hours - Number of hours to retrieve (default: 24)
   */
  getTimeSeries(hours: number = 24): TimeSeriesData[] {
    // If no snapshots, return empty array
    if (this.snapshots.length === 0) {
      return [];
    }

    // Calculate how many snapshots to return
    const snapshotsToReturn = Math.min(hours,this.snapshots.length);

    // Get the most recent snapshots
    return this.snapshots.slice(-snapshotsToReturn);
  }

  /**
   * Get all snapshots (for debugging)
   */
  getAllSnapshots(): TimeSeriesData[] {
    return [...this.snapshots];
  }

  /**
   * Clear all stored metrics
   */
  clear(): void {
    this.snapshots = [];
    console.log('[Metrics] Cleared all snapshots');
  }
}

// Export singleton instance
export const metricsStore = new MetricsStore();
