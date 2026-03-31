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
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/api/client', () => ({
  default: mockClient,
  setAuthToken: vi.fn()
}))

import { listTenants, createTenant, deleteTenant } from '@/services/tenants'

describe('Tenants Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTenants', () => {
    it('returns array of tenant id strings', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { tenants: ['tenant-1', 'tenant-2'] } })

      const result = await listTenants()

      expect(mockClient.get).toHaveBeenCalledWith('/api/tenants')
      expect(result).toEqual(['tenant-1', 'tenant-2'])
    })

    it('filters out non-string and empty entries', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { tenants: ['valid', '', 42, null, '  ', 'also-valid'] } })

      const result = await listTenants()

      expect(result).toEqual(['valid', 'also-valid'])
    })

    it('trims whitespace from tenant ids', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { tenants: ['  tenant-1  ', ' tenant-2'] } })

      const result = await listTenants()

      expect(result).toEqual(['tenant-1', 'tenant-2'])
    })

    it('returns empty array when tenants is not an array', async () => {
      mockClient.get.mockResolvedValueOnce({ data: {} })

      const result = await listTenants()

      expect(result).toEqual([])
    })

    it('returns empty array when tenants is null', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { tenants: null } })

      const result = await listTenants()

      expect(result).toEqual([])
    })
  })

  describe('createTenant', () => {
    it('creates a tenant with name and tenantId', async () => {
      const tenant = { tenantId: 'new-tenant', name: 'New Tenant' }
      mockClient.post.mockResolvedValueOnce({ data: { tenant } })

      const result = await createTenant({ name: 'New Tenant', tenantId: 'new-tenant' })

      expect(mockClient.post).toHaveBeenCalledWith('/api/tenants', { name: 'New Tenant', tenantId: 'new-tenant' })
      expect(result).toEqual(tenant)
    })

    it('creates a tenant with name only', async () => {
      const tenant = { tenantId: 'auto-id', name: 'My Tenant' }
      mockClient.post.mockResolvedValueOnce({ data: { tenant } })

      const result = await createTenant({ name: 'My Tenant' })

      expect(result).toEqual(tenant)
    })

    it('throws when response is missing tenant', async () => {
      mockClient.post.mockResolvedValueOnce({ data: {} })

      await expect(createTenant({ name: 'Test' }))
        .rejects.toThrow('Invalid response from server')
    })
  })

  describe('deleteTenant', () => {
    it('calls the delete endpoint with encoded tenantId', async () => {
      mockClient.delete.mockResolvedValueOnce({})

      await deleteTenant('my-tenant')

      expect(mockClient.delete).toHaveBeenCalledWith('/api/tenants/my-tenant')
    })

    it('URL-encodes special characters in tenantId', async () => {
      mockClient.delete.mockResolvedValueOnce({})

      await deleteTenant('tenant/with/slashes')

      expect(mockClient.delete).toHaveBeenCalledWith('/api/tenants/tenant%2Fwith%2Fslashes')
    })
  })
})
