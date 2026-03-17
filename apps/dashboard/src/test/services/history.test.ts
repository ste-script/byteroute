import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/client', () => ({
  default: mockClient,
  setAuthToken: vi.fn()
}))

import { searchConnectionHistory } from '@/services/history'

describe('History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls history endpoint with selected tenant and filters', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        items: [{ id: 'conn-1', sourceIp: '10.0.0.1', destIp: '8.8.8.8' }],
        total: 1
      }
    })

    const result = await searchConnectionHistory('tenant-a', {
      q: '8.8.8.8',
      status: 'active',
      protocol: 'TCP',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
      limit: 25,
      offset: 5
    })

    expect(mockClient.get).toHaveBeenCalledWith('/api/connections/history', {
      headers: { 'x-tenant-id': 'tenant-a' },
      params: {
        q: '8.8.8.8',
        status: 'active',
        protocol: 'TCP',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.000Z',
        limit: 25,
        offset: 5
      }
    })
    expect(result.total).toBe(1)
  })

  it('throws when tenant is missing', async () => {
    await expect(searchConnectionHistory('', {})).rejects.toThrow(
      'Tenant is required for historical search'
    )
  })
})
