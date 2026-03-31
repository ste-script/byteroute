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
