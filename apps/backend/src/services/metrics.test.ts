import { describe, it, expect, beforeEach } from 'vitest'
import type { TimeSeriesData } from '@byteroute/shared'

/**
 * MetricsStore implementation for testing
 * Using dependency injection pattern for easier testing
 */
class MetricsStore {
  private snapshots: TimeSeriesData[] = []
  private readonly maxSnapshots: number

  constructor(maxSnapshots = 168) {
    this.maxSnapshots = maxSnapshots
  }

  addSnapshots(newSnapshots: TimeSeriesData[]): void {
    for (const snapshot of newSnapshots) {
      // Ensure timestamp is a Date object
      const timestamp = snapshot.timestamp instanceof Date
        ? snapshot.timestamp
        : new Date(snapshot.timestamp)

      this.snapshots.push({
        timestamp,
        connections: snapshot.connections,
        bandwidthIn: snapshot.bandwidthIn,
        bandwidthOut: snapshot.bandwidthOut,
        inactive: snapshot.inactive ?? 0,
      })
    }

    // Sort by timestamp (oldest first)
    this.snapshots.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return timeA - timeB
    })

    // Trim old snapshots to maintain max limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots)
    }
  }

  getTimeSeries(hours: number = 24): TimeSeriesData[] {
    if (this.snapshots.length === 0) {
      return []
    }

    const snapshotsToReturn = Math.min(hours, this.snapshots.length)
    return this.snapshots.slice(-snapshotsToReturn)
  }

  getAllSnapshots(): TimeSeriesData[] {
    return [...this.snapshots]
  }

  clear(): void {
    this.snapshots = []
  }
}

// Factory function for creating test instances
const createMetricsStore = (maxSnapshots?: number) => new MetricsStore(maxSnapshots)

// Test data generators (functional approach)
const createSnapshot = (overrides?: Partial<TimeSeriesData>): TimeSeriesData => ({
  timestamp: new Date(),
  connections: 100,
  bandwidthIn: 50000,
  bandwidthOut: 30000,
  inactive: 0,
  ...overrides
})

const createSnapshots = (count: number, generator: (i: number) => Partial<TimeSeriesData> = () => ({})): TimeSeriesData[] =>
  Array.from({ length: count }, (_, i) => createSnapshot(generator(i)))

describe('MetricsStore', () => {
  let store: MetricsStore

  beforeEach(() => {
    store = createMetricsStore()
  })

  describe('addSnapshots', () => {
    it('should add single snapshot', () => {
      const snapshot = createSnapshot()
      store.addSnapshots([snapshot])

      const snapshots = store.getAllSnapshots()
      expect(snapshots).toHaveLength(1)
      expect(snapshots[0].connections).toBe(100)
    })

    it('should add multiple snapshots', () => {
      const snapshots = createSnapshots(5, (i) => ({ connections: i * 10 }))
      store.addSnapshots(snapshots)

      const result = store.getAllSnapshots()
      expect(result).toHaveLength(5)
      expect(result.map(s => s.connections)).toEqual([0, 10, 20, 30, 40])
    })

    it('should handle string timestamps', () => {
      const snapshot = createSnapshot({ timestamp: '2026-02-07T10:00:00Z' as any })
      store.addSnapshots([snapshot])

      const result = store.getAllSnapshots()
      expect(result[0].timestamp).toBeInstanceOf(Date)
    })

    it('should handle Date timestamps', () => {
      const now = new Date()
      const snapshot = createSnapshot({ timestamp: now })
      store.addSnapshots([snapshot])

      const result = store.getAllSnapshots()
      expect(result[0].timestamp).toBe(now)
    })

    it('should default inactive to 0 when missing', () => {
      const snapshot = { ...createSnapshot(), inactive: undefined }
      store.addSnapshots([snapshot])

      const result = store.getAllSnapshots()
      expect(result[0].inactive).toBe(0)
    })

    it('should preserve inactive count when provided', () => {
      const snapshot = createSnapshot({ inactive: 5 })
      store.addSnapshots([snapshot])

      const result = store.getAllSnapshots()
      expect(result[0].inactive).toBe(5)
    })
  })

  describe('sorting', () => {
    it('should sort snapshots by timestamp (oldest first)', () => {
      const now = Date.now()
      const snapshots = [
        createSnapshot({ timestamp: new Date(now - 2000), connections: 30 }),
        createSnapshot({ timestamp: new Date(now), connections: 10 }),
        createSnapshot({ timestamp: new Date(now - 1000), connections: 20 }),
      ]

      store.addSnapshots(snapshots)
      const result = store.getAllSnapshots()

      expect(result.map(s => s.connections)).toEqual([30, 20, 10])
    })

    it('should maintain sort order across multiple additions', () => {
      const now = Date.now()

      store.addSnapshots([
        createSnapshot({ timestamp: new Date(now), connections: 20 })
      ])

      store.addSnapshots([
        createSnapshot({ timestamp: new Date(now - 1000), connections: 10 })
      ])

      store.addSnapshots([
        createSnapshot({ timestamp: new Date(now + 1000), connections: 30 })
      ])

      const result = store.getAllSnapshots()
      expect(result.map(s => s.connections)).toEqual([10, 20, 30])
    })
  })

  describe('retention limit', () => {
    it('should respect max snapshots limit', () => {
      const store = createMetricsStore(3)
      const snapshots = createSnapshots(5, (i) => ({ connections: i }))

      store.addSnapshots(snapshots)
      const result = store.getAllSnapshots()

      expect(result).toHaveLength(3)
      expect(result.map(s => s.connections)).toEqual([2, 3, 4])
    })

    it('should keep most recent snapshots when exceeding limit', () => {
      const store = createMetricsStore(2)
      const now = Date.now()

      const snapshots = [
        createSnapshot({ timestamp: new Date(now - 3000), connections: 1 }),
        createSnapshot({ timestamp: new Date(now - 2000), connections: 2 }),
        createSnapshot({ timestamp: new Date(now - 1000), connections: 3 }),
        createSnapshot({ timestamp: new Date(now), connections: 4 }),
      ]

      store.addSnapshots(snapshots)
      const result = store.getAllSnapshots()

      expect(result).toHaveLength(2)
      expect(result.map(s => s.connections)).toEqual([3, 4])
    })

    it('should handle incremental additions with retention', () => {
      const store = createMetricsStore(3)

      store.addSnapshots([createSnapshot({ connections: 1 })])
      store.addSnapshots([createSnapshot({ connections: 2 })])
      store.addSnapshots([createSnapshot({ connections: 3 })])
      store.addSnapshots([createSnapshot({ connections: 4 })])

      const result = store.getAllSnapshots()
      expect(result).toHaveLength(3)
      expect(result.map(s => s.connections)).toEqual([2, 3, 4])
    })
  })

  describe('getTimeSeries', () => {
    beforeEach(() => {
      const snapshots = createSnapshots(24, (i) => ({ connections: i }))
      store.addSnapshots(snapshots)
    })

    it('should return requested number of hours', () => {
      const result = store.getTimeSeries(12)
      expect(result).toHaveLength(12)
    })

    it('should return most recent snapshots', () => {
      const result = store.getTimeSeries(3)
      expect(result.map(s => s.connections)).toEqual([21, 22, 23])
    })

    it('should default to 24 hours', () => {
      const result = store.getTimeSeries()
      expect(result).toHaveLength(24)
    })

    it('should limit to available snapshots when requesting more', () => {
      const result = store.getTimeSeries(100)
      expect(result).toHaveLength(24)
    })

    it('should return empty array when no snapshots', () => {
      const emptyStore = createMetricsStore()
      const result = emptyStore.getTimeSeries()
      expect(result).toEqual([])
    })
  })

  describe('clear', () => {
    it('should remove all snapshots', () => {
      store.addSnapshots(createSnapshots(5))
      expect(store.getAllSnapshots()).toHaveLength(5)

      store.clear()
      expect(store.getAllSnapshots()).toEqual([])
    })

    it('should allow adding snapshots after clear', () => {
      store.addSnapshots(createSnapshots(3))
      store.clear()
      store.addSnapshots(createSnapshots(2))

      expect(store.getAllSnapshots()).toHaveLength(2)
    })
  })

  describe('data integrity', () => {
    it('should preserve all snapshot fields', () => {
      const snapshot = createSnapshot({
        connections: 123,
        bandwidthIn: 456789,
        bandwidthOut: 987654,
        inactive: 5
      })

      store.addSnapshots([snapshot])
      const result = store.getAllSnapshots()[0]

      expect(result.connections).toBe(123)
      expect(result.bandwidthIn).toBe(456789)
      expect(result.bandwidthOut).toBe(987654)
      expect(result.inactive).toBe(5)
    })

    it('should not mutate input snapshots', () => {
      const original = createSnapshot({ connections: 42 })
      const originalTimestamp = original.timestamp

      store.addSnapshots([original])

      expect(original.timestamp).toBe(originalTimestamp)
      expect(original.connections).toBe(42)
    })
  })
})

describe('MetricsStore edge cases', () => {
  it('should handle empty snapshot array', () => {
    const store = createMetricsStore()
    store.addSnapshots([])
    expect(store.getAllSnapshots()).toEqual([])
  })

  it('should handle max snapshots of 1', () => {
    const store = createMetricsStore(1)
    store.addSnapshots(createSnapshots(3, (i) => ({ connections: i })))

    const result = store.getAllSnapshots()
    expect(result).toHaveLength(1)
    expect(result[0].connections).toBe(2)
  })

  it('should handle very large retention limits', () => {
    const store = createMetricsStore(10000)
    const snapshots = createSnapshots(100)
    store.addSnapshots(snapshots)

    expect(store.getAllSnapshots()).toHaveLength(100)
  })

  it('should handle timestamps with millisecond precision', () => {
    const now = new Date('2026-02-07T10:30:45.123Z')
    const snapshot = createSnapshot({ timestamp: now })

    const store = createMetricsStore()
    store.addSnapshots([snapshot])

    const result = store.getAllSnapshots()[0]
    expect(result.timestamp.getTime()).toBe(now.getTime())
  })
})
