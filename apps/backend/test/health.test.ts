import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { healthCheck } from '../src/controllers/health.controller.js'

// Mock the mongoReadyState from shared package
vi.mock('@byteroute/shared', () => ({
  mongoReadyState: vi.fn(() => 1) // 1 = connected
}))

const createMockRequest = (): Partial<Request> => ({})

const createMockResponse = (): Partial<Response> & {
  jsonData?: any
} => {
  const res: any = {
    jsonData: null
  }

  res.json = vi.fn((data: any) => {
    res.jsonData = data
    return res
  })

  return res
}

describe('Health Controller', () => {
  describe('healthCheck', () => {
    it('should return ok: true', () => {
      const req = createMockRequest()
      const res = createMockResponse()

      healthCheck(req as Request, res as Response)

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        mongo: { readyState: 1 }
      })
    })

    it('should include mongo readyState', () => {
      const req = createMockRequest()
      const res = createMockResponse()

      healthCheck(req as Request, res as Response)

      expect(res.jsonData).toHaveProperty('mongo')
      expect(res.jsonData.mongo).toHaveProperty('readyState')
    })

    it('should not require any request parameters', () => {
      const req = createMockRequest()
      const res = createMockResponse()

      // Should work with minimal request object
      healthCheck(req as Request, res as Response)

      expect(res.json).toHaveBeenCalled()
    })
  })
})
