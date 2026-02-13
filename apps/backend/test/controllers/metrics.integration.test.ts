import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { metricsStore } from '../../src/services/metrics.js'
import { postMetrics } from '../../src/controllers/metrics.controller.js'
import { DEFAULT_TENANT_ID } from '../../src/utils/tenant.js'

const createTestApp = (): Express => {
  const app = express()
  app.use(express.json())
  app.post('/api/metrics', postMetrics)
  return app
}

describe('Metrics API Integration', () => {
  let app: Express

  beforeEach(() => {
    app = createTestApp()
    metricsStore.clear()
  })

  describe('POST /api/metrics', () => {
    it('should accept and store metrics snapshots', async () => {
      const snapshots = [{
        timestamp: new Date().toISOString(),
        connections: 100,
        bandwidthIn: 50000,
        bandwidthOut: 30000,
        inactive: 5
      }]

      const response = await request(app)
        .post('/api/metrics')
        .send({ snapshots })
        .expect(202)

      expect(response.body).toEqual({ received: 1, status: 'processing' })

      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored).toHaveLength(1)
      expect(stored[0]!.connections).toBe(100)
    })

    it('should accept multiple snapshots in one request', async () => {
      const snapshots = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        connections: (i + 1) * 10,
        bandwidthIn: (i + 1) * 1000,
        bandwidthOut: (i + 1) * 500,
        inactive: i
      }))

      await request(app)
        .post('/api/metrics')
        .send({ snapshots })
        .expect(202)

      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored).toHaveLength(5)
      expect(stored.map((snapshot) => snapshot.connections)).toEqual([10, 20, 30, 40, 50])
    })

    it('should reject requests without snapshots field', async () => {
      const response = await request(app)
        .post('/api/metrics')
        .send({})
        .expect(400)

      expect(response.body.error).toContain('snapshots array required')
    })

    it('should reject requests with invalid snapshots', async () => {
      const response = await request(app)
        .post('/api/metrics')
        .send({ snapshots: 'not-an-array' })
        .expect(400)

      expect(response.body.error).toContain('snapshots array required')
    })

    it('should handle empty snapshots array', async () => {
      await request(app)
        .post('/api/metrics')
        .send({ snapshots: [] })
        .expect(202)

      expect(metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)).toHaveLength(0)
    })

    it('should preserve inactive count when provided', async () => {
      const snapshots = [{
        timestamp: new Date().toISOString(),
        connections: 50,
        bandwidthIn: 25000,
        bandwidthOut: 15000,
        inactive: 12
      }]

      await request(app)
        .post('/api/metrics')
        .send({ snapshots })
        .expect(202)

      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored[0]!.inactive).toBe(12)
    })

    it('should default inactive to 0 when omitted', async () => {
      const snapshots = [{
        timestamp: new Date().toISOString(),
        connections: 50,
        bandwidthIn: 25000,
        bandwidthOut: 15000
      }]

      await request(app)
        .post('/api/metrics')
        .send({ snapshots })
        .expect(202)

      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored[0]!.inactive).toBe(0)
    })
  })

  describe('Cross-request data persistence', () => {
    it('should maintain data across multiple requests', async () => {
      const createSnapshots = (count: number, offset: number) =>
        Array.from({ length: count }, (_, i) => ({
          timestamp: new Date(Date.now() + (offset + i) * 1000).toISOString(),
          connections: (offset + i) * 10,
          bandwidthIn: 10000,
          bandwidthOut: 5000,
          inactive: 0
        }))

      await request(app).post('/api/metrics').send({ snapshots: createSnapshots(3, 0) }).expect(202)
      expect(metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)).toHaveLength(3)

      await request(app).post('/api/metrics').send({ snapshots: createSnapshots(2, 3) }).expect(202)
      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored).toHaveLength(5)
      expect(stored.map((snapshot) => snapshot.connections)).toEqual([0, 10, 20, 30, 40])
    })

    it('should sort snapshots by timestamp across requests', async () => {
      const now = Date.now()

      await request(app).post('/api/metrics').send({ snapshots: [{ timestamp: new Date(now + 2000).toISOString(), connections: 300, bandwidthIn: 10000, bandwidthOut: 5000, inactive: 0 }] }).expect(202)
      await request(app).post('/api/metrics').send({ snapshots: [{ timestamp: new Date(now).toISOString(), connections: 100, bandwidthIn: 10000, bandwidthOut: 5000, inactive: 0 }] }).expect(202)
      await request(app).post('/api/metrics').send({ snapshots: [{ timestamp: new Date(now + 1000).toISOString(), connections: 200, bandwidthIn: 10000, bandwidthOut: 5000, inactive: 0 }] }).expect(202)

      const stored = metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)
      expect(stored.map((snapshot) => snapshot.connections)).toEqual([100, 200, 300])
    })
  })

  describe('Data retrieval', () => {
    it('should retrieve stored metrics via getTimeSeries', async () => {
      const snapshots = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000).toISOString(),
        connections: (i + 1) * 10,
        bandwidthIn: 10000,
        bandwidthOut: 5000,
        inactive: 0
      }))

      await request(app)
        .post('/api/metrics')
        .send({ snapshots })
        .expect(202)

      const last12 = metricsStore.getTimeSeries(DEFAULT_TENANT_ID, 12)
      expect(last12).toHaveLength(12)
      expect(last12[0]!.connections).toBe(130)
    })
  })

  describe('Error scenarios', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/metrics')
        .set('Content-Type', 'application/json')
        .send('{"snapshots": [invalid json]}')
        .expect(400)
    })

    it('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/metrics')
        .send('plain text')

      expect([400, 500, 202]).toContain(response.status)
    })
  })

  describe('Performance', () => {
    it('should handle large batch of snapshots', async () => {
      const largeSnapshot = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        connections: i,
        bandwidthIn: i * 1000,
        bandwidthOut: i * 500,
        inactive: Math.floor(i / 10)
      }))

      const start = Date.now()
      await request(app)
        .post('/api/metrics')
        .send({ snapshots: largeSnapshot })
        .expect(202)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
      expect(metricsStore.getAllSnapshots(DEFAULT_TENANT_ID)).toHaveLength(100)
    })
  })
})
