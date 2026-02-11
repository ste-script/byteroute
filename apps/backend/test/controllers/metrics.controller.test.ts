import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import type { TimeSeriesData } from '@byteroute/shared'

/**
 * Mock MetricsStore for testing
 * Using dependency injection to make controller testable
 */
interface IMetricsStore {
  addSnapshots(snapshots: TimeSeriesData[]): void
  getTimeSeries(hours?: number): TimeSeriesData[]
  clear(): void
}

class MockMetricsStore implements IMetricsStore {
  private snapshots: TimeSeriesData[] = []

  addSnapshots(snapshots: TimeSeriesData[]): void {
    this.snapshots.push(...snapshots)
  }

  getTimeSeries(hours = 24): TimeSeriesData[] {
    return this.snapshots.slice(-hours)
  }

  clear(): void {
    this.snapshots = []
  }

  // Test helper
  getAll(): TimeSeriesData[] {
    return this.snapshots
  }
}

/**
 * Metrics controller factory with dependency injection
 */
const createMetricsController = (store: IMetricsStore) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { snapshots?: TimeSeriesData[] }

      if (!body.snapshots || !Array.isArray(body.snapshots)) {
        res.status(400).json({ error: 'Invalid request: snapshots array required' })
        return
      }

      store.addSnapshots(body.snapshots)

      res.status(202).json({
        received: body.snapshots.length,
        status: 'processing',
      })
    } catch (error) {
      console.error('[Metrics] Error processing metrics:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Test helpers
const createMockRequest = (body?: any): Partial<Request> => ({
  body: body ?? {}
})

const createMockResponse = (): Partial<Response> & {
  statusCode?: number
  jsonData?: any
} => {
  const res: any = {
    statusCode: 200,
    jsonData: null
  }

  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })

  res.json = vi.fn((data: any) => {
    res.jsonData = data
    return res
  })

  return res
}

const createSnapshot = (overrides?: Partial<TimeSeriesData>): TimeSeriesData => ({
  timestamp: new Date().toISOString(),
  connections: 100,
  bandwidthIn: 50000,
  bandwidthOut: 30000,
  inactive: 0,
  ...overrides
})

describe('Metrics Controller', () => {
  let store: MockMetricsStore
  let controller: (req: Request, res: Response) => Promise<void>

  beforeEach(() => {
    store = new MockMetricsStore()
    controller = createMetricsController(store)
  })

  describe('POST /api/metrics', () => {
    it('should accept valid snapshots', async () => {
      const snapshots = [createSnapshot()]
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.jsonData).toEqual({
        received: 1,
        status: 'processing'
      })
    })

    it('should store snapshots in the store', async () => {
      const snapshots = [
        createSnapshot({ connections: 10 }),
        createSnapshot({ connections: 20 })
      ]
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      const stored = store.getAll()
      expect(stored).toHaveLength(2)
      expect(stored[0]!.connections).toBe(10)
      expect(stored[1]!.connections).toBe(20)
    })

    it('should return received count', async () => {
      const snapshots = Array.from({ length: 5 }, () => createSnapshot())
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.jsonData.received).toBe(5)
    })

    it('should reject missing snapshots field', async () => {
      const req = createMockRequest({})
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.jsonData.error).toContain('snapshots array required')
    })

    it('should reject non-array snapshots', async () => {
      const req = createMockRequest({ snapshots: 'not-an-array' })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.jsonData.error).toContain('snapshots array required')
    })

    it('should reject null snapshots', async () => {
      const req = createMockRequest({ snapshots: null })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should accept empty snapshots array', async () => {
      const req = createMockRequest({ snapshots: [] })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.jsonData.received).toBe(0)
    })

    it('should handle multiple snapshots with different data', async () => {
      const snapshots = [
        createSnapshot({
          connections: 100,
          bandwidthIn: 50000,
          bandwidthOut: 30000,
          inactive: 5
        }),
        createSnapshot({
          connections: 200,
          bandwidthIn: 75000,
          bandwidthOut: 45000,
          inactive: 10
        })
      ]
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      const stored = store.getAll()
      expect(stored[0]!.connections).toBe(100)
      expect(stored[0]!.inactive).toBe(5)
      expect(stored[1]!.connections).toBe(200)
      expect(stored[1]!.inactive).toBe(10)
    })

    it('should handle snapshots with string timestamps', async () => {
      const snapshots = [
        createSnapshot({ timestamp: '2026-02-07T10:00:00Z' as any })
      ]
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.statusCode).toBe(202)
    })

    it('should handle snapshots with missing optional fields', async () => {
      const snapshots = [{
        timestamp: new Date().toISOString(),
        connections: 50,
        bandwidthIn: 25000,
        bandwidthOut: 15000
        // inactive is optional, omitted here
      }]
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()

      await controller(req as Request, res as Response)

      expect(res.statusCode).toBe(202)
    })
  })

  describe('error handling', () => {
    it('should handle store errors gracefully', async () => {
      const errorStore: IMetricsStore = {
        addSnapshots: () => { throw new Error('Store error') },
        getTimeSeries: () => [],
        clear: () => {}
      }
      const errorController = createMetricsController(errorStore)

      const req = createMockRequest({ snapshots: [createSnapshot()] })
      const res = createMockResponse()

      // Mock console.error to avoid test output noise
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      await errorController(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.jsonData.error).toBe('Internal server error')

      consoleError.mockRestore()
    })
  })
})

describe('Metrics Controller integration scenarios', () => {
  it('should handle rapid successive requests', async () => {
    const store = new MockMetricsStore()
    const controller = createMetricsController(store)

    const requests = Array.from({ length: 10 }, (_, i) => ({
      snapshots: [createSnapshot({ connections: i * 10 })]
    }))

    for (const reqBody of requests) {
      const req = createMockRequest(reqBody)
      const res = createMockResponse()
      await controller(req as Request, res as Response)
      expect(res.statusCode).toBe(202)
    }

    const stored = store.getAll()
    expect(stored).toHaveLength(10)
  })

  it('should preserve data integrity across multiple requests', async () => {
    const store = new MockMetricsStore()
    const controller = createMetricsController(store)

    const batches = [
      [createSnapshot({ connections: 100 })],
      [createSnapshot({ connections: 200 }), createSnapshot({ connections: 300 })],
      [createSnapshot({ connections: 400 })]
    ]

    for (const snapshots of batches) {
      const req = createMockRequest({ snapshots })
      const res = createMockResponse()
      await controller(req as Request, res as Response)
    }

    const stored = store.getAll()
    expect(stored).toHaveLength(4)
    expect(stored.map(s => s.connections)).toEqual([100, 200, 300, 400])
  })
})
