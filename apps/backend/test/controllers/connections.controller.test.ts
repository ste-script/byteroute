import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import type { Connection } from '@byteroute/shared'
import { postConnections } from '../../src/controllers/connections.controller.js'

// Mock the dependencies
vi.mock('../../src/services/ingest.js', () => ({
  enrichAndStoreConnections: vi.fn().mockResolvedValue(undefined),
  storeRawConnections: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../../src/utils/ip.js', () => ({
  normalizeIp: vi.fn((ip) => ip?.toString().trim() || undefined),
  firstForwardedFor: vi.fn((header) => {
    if (typeof header === 'string') {
      return header.split(',')[0]?.trim()
    }
    return undefined
  })
}))

import { enrichAndStoreConnections, storeRawConnections } from '../../src/services/ingest.js'
import { normalizeIp, firstForwardedFor } from '../../src/utils/ip.js'

const createMockRequest = (body?: any, headers?: any, ip?: string): Partial<Request> & {
  app: any
  socket: any
} => ({
  body: body ?? {},
  headers: headers ?? {},
  ip: ip ?? '127.0.0.1',
  socket: {
    remoteAddress: '127.0.0.1'
  },
  app: {
    get: vi.fn((key: string) => {
      if (key === 'io') {
        return {} // Mock Socket.IO server
      }
      return undefined
    })
  }
} as Partial<Request> & { app: any; socket: any })

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

const createConnection = (overrides?: Partial<Connection>): Partial<Connection> => ({
  sourceIp: '192.168.1.1',
  destIp: '8.8.8.8',
  sourcePort: 12345,
  destPort: 80,
  protocol: 'TCP',
  status: 'active',
  ...overrides
})

describe('Connections Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postConnections', () => {
    it('should accept valid connections array', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.jsonData).toEqual({
        received: 1,
        status: 'processing'
      })
    })

    it('should accept multiple connections', async () => {
      const connections = [
        createConnection({ sourcePort: 1111 }),
        createConnection({ sourcePort: 2222 }),
        createConnection({ sourcePort: 3333 })
      ]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.jsonData.received).toBe(3)
    })

    it('should reject missing connections field', async () => {
      const req = createMockRequest({})
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.jsonData.error).toContain('expected { connections: Connection[] }')
    })

    it('should reject non-array connections', async () => {
      const req = createMockRequest({ connections: 'not-an-array' })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.jsonData.error).toContain('expected { connections: Connection[] }')
    })

    it('should reject null connections', async () => {
      const req = createMockRequest({ connections: null })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should accept empty connections array', async () => {
      const req = createMockRequest({ connections: [] })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.jsonData.received).toBe(0)
    })

    it('should call enrichAndStoreConnections with socket.io', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(enrichAndStoreConnections).toHaveBeenCalled()
    })

    it('should handle X-Forwarded-For header', async () => {
      const connections = [createConnection()]
      const req = createMockRequest(
        { connections },
        { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' }
      )
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(firstForwardedFor).toHaveBeenCalledWith('203.0.113.1, 198.51.100.1')
    })

    it('should use socket remoteAddress if no x-forwarded-for', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(normalizeIp).toHaveBeenCalled()
    })

    it('should fall back to socket remoteAddress when req.ip is missing', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections }, {}, '')
      req.socket.remoteAddress = '203.0.113.9'
      const res = createMockResponse()

      await postConnections(req as Request, res as Response)

      expect(firstForwardedFor).toHaveBeenCalled()
      expect(normalizeIp).toHaveBeenCalledWith('')
      expect(normalizeIp).toHaveBeenCalledWith('203.0.113.9')
    })

    it('should respond immediately (fire-and-forget)', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      // Mock enrichAndStoreConnections to take time
      vi.mocked(enrichAndStoreConnections).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      await postConnections(req as Request, res as Response)

      // Response should be sent before enrichment completes
      expect(res.status).toHaveBeenCalledWith(202)
    })

    it('should call fallback on enrichment failure', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      // Mock enrichAndStoreConnections to fail
      vi.mocked(enrichAndStoreConnections).mockRejectedValue(new Error('Enrichment failed'))

      await postConnections(req as Request, res as Response)

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should still respond with 202
      expect(res.statusCode).toBe(202)

      // Should call fallback
      expect(storeRawConnections).toHaveBeenCalledWith(connections, { tenantId: 'default' })
    })

    it('should handle fallback failure gracefully', async () => {
      const connections = [createConnection()]
      const req = createMockRequest({ connections })
      const res = createMockResponse()

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock both to fail
      vi.mocked(enrichAndStoreConnections).mockRejectedValue(new Error('Enrichment failed'))
      vi.mocked(storeRawConnections).mockRejectedValue(new Error('Raw insert failed'))

      await postConnections(req as Request, res as Response)

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should still respond with 202
      expect(res.statusCode).toBe(202)

      // Should log both errors
      expect(consoleError).toHaveBeenCalledWith('Enrichment failed:', expect.any(Error))
      expect(consoleError).toHaveBeenCalledWith('Raw insert fallback failed:', expect.any(Error))

      consoleError.mockRestore()
    })

    it('should use tenant-aware fallback for non-default tenant', async () => {
      const connections = [createConnection()]
      const req = createMockRequest(
        { connections },
        { 'x-tenant-id': 'tenant-acme' }
      )
      const res = createMockResponse()

      vi.mocked(enrichAndStoreConnections).mockRejectedValue(new Error('Enrichment failed'))

      await postConnections(req as Request, res as Response)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(storeRawConnections).toHaveBeenCalledWith(connections, { tenantId: 'tenant-acme' })
    })
  })
})
