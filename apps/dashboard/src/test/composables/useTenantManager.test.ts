import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSocket = vi.hoisted(() => ({
  disconnect: vi.fn(),
  connect: vi.fn(),
  emit: vi.fn(),
  isConnected: { value: false },
  connectionError: { value: null }
}))

const mockDashboardStore = vi.hoisted(() => ({
  clearAll: vi.fn()
}))

const mockAuthStore = vi.hoisted(() => ({
  token: 'auth-token-123'
}))

vi.mock('@/services/socket', () => ({
  useSocket: vi.fn(() => mockSocket)
}))

vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: vi.fn(() => mockDashboardStore)
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn()
}))

import { listTenants } from '@/services/tenants'
import { useTenantManager, TENANT_STORAGE_KEY } from '@/composables/useTenantManager'

describe('useTenantManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.localStorage.clear()
    // Reset socket mock implementations
    mockSocket.disconnect.mockImplementation(() => {})
    mockSocket.connect.mockImplementation(() => {})
    mockSocket.emit.mockImplementation(() => {})
    mockDashboardStore.clearAll.mockImplementation(() => {})
  })

  describe('initialization', () => {
    it('uses default tenant when no saved tenant in localStorage', () => {
      const { selectedTenant } = useTenantManager()
      // default is from VITE_TENANT_ID env (empty in tests) → ensureTenantId returns some default
      expect(selectedTenant.value).toBeDefined()
    })

    it('uses saved tenant from localStorage when available', () => {
      window.localStorage.setItem(TENANT_STORAGE_KEY, 'saved-tenant')
      const { selectedTenant } = useTenantManager()
      expect(selectedTenant.value).toBe('saved-tenant')
    })
  })

  describe('tenantOptions computed', () => {
    it('always includes the default tenant option', () => {
      const { tenantOptions } = useTenantManager()
      expect(tenantOptions.value.length).toBeGreaterThanOrEqual(1)
    })

    it('includes discovered tenants in options', async () => {
      vi.mocked(listTenants).mockResolvedValueOnce(['tenant-a', 'tenant-b'])

      const { tenantOptions, loadDiscoveredTenants, discoveredTenants } = useTenantManager()
      await loadDiscoveredTenants()

      expect(discoveredTenants.value).toContain('tenant-a')
      const labels = tenantOptions.value.map(o => o.value)
      expect(labels).toContain('tenant-a')
    })

    it('deduplicates tenant options', async () => {
      window.localStorage.setItem(TENANT_STORAGE_KEY, 'tenant-x')
      vi.mocked(listTenants).mockResolvedValueOnce(['tenant-x', 'tenant-y'])

      const { tenantOptions, loadDiscoveredTenants } = useTenantManager()
      await loadDiscoveredTenants()

      const values = tenantOptions.value.map(o => o.value)
      const uniqueValues = [...new Set(values)]
      expect(values.length).toBe(uniqueValues.length)
    })
  })

  describe('loadDiscoveredTenants', () => {
    it('returns tenants from the API', async () => {
      vi.mocked(listTenants).mockResolvedValueOnce(['t1', 't2'])

      const { loadDiscoveredTenants } = useTenantManager()
      const result = await loadDiscoveredTenants()

      expect(result).toEqual(['t1', 't2'])
    })

    it('returns empty array on error and logs a warning', async () => {
      vi.mocked(listTenants).mockRejectedValueOnce(new Error('Network error'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { loadDiscoveredTenants } = useTenantManager()
      const result = await loadDiscoveredTenants()

      expect(result).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Dashboard]'),
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })
  })

  describe('connectTenant', () => {
    it('disconnects, clears store, and connects with tenant and token', () => {
      window.localStorage.setItem(TENANT_STORAGE_KEY, 'my-tenant')
      const { connectTenant } = useTenantManager()

      connectTenant('my-tenant')

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockDashboardStore.clearAll).toHaveBeenCalled()
      expect(mockSocket.connect).toHaveBeenCalledWith(undefined, 'my-tenant', 'auth-token-123')
    })

    it('emits subscribe with all rooms', () => {
      const { connectTenant } = useTenantManager()

      connectTenant('tenant-1')

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        rooms: ['connections', 'statistics', 'flows'],
        connectionsLimit: undefined
      })
    })

    it('passes connectionsLimit to subscribe emit', () => {
      const { connectTenant } = useTenantManager()

      connectTenant('tenant-1', { connectionsLimit: 20 })

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        rooms: ['connections', 'statistics', 'flows'],
        connectionsLimit: 20
      })
    })
  })

  describe('handleTenantChange', () => {
    it('saves selected tenant to localStorage and connects', () => {
      window.localStorage.setItem(TENANT_STORAGE_KEY, 'initial-tenant')
      const { selectedTenant, handleTenantChange } = useTenantManager()

      selectedTenant.value = 'new-tenant'
      handleTenantChange()

      expect(window.localStorage.getItem(TENANT_STORAGE_KEY)).toBe('new-tenant')
      expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('passes connectionsLimit to connectTenant', () => {
      const { handleTenantChange } = useTenantManager()

      handleTenantChange(10)

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', expect.objectContaining({
        connectionsLimit: 10
      }))
    })
  })
})
