import { ref, computed } from 'vue'
import { useSocket } from '@/services/socket'
import { useDashboardStore } from '@/stores/dashboard'
import { ensureTenantId, normalizeTenantIds, sanitizeTenantId } from '@byteroute/shared/common'

export const TENANT_STORAGE_KEY = 'byteroute:selected-tenant'

export function useTenantManager() {
  const store = useDashboardStore()
  const socket = useSocket()

  const initialTenant = ensureTenantId(import.meta.env.VITE_TENANT_ID)
  const savedTenant =
    typeof window !== 'undefined'
      ? sanitizeTenantId(window.localStorage.getItem(TENANT_STORAGE_KEY))
      : undefined

  const defaultTenant = savedTenant ?? initialTenant
  const discoveredTenants = ref<string[]>([])
  const selectedTenant = ref(defaultTenant)

  const tenantOptions = computed(() => {
    const uniqueTenants = Array.from(
      new Set(normalizeTenantIds([defaultTenant, ...discoveredTenants.value]))
    )
    return uniqueTenants.map((tenant) => ({ label: tenant, value: tenant }))
  })

  async function loadDiscoveredTenants(): Promise<string[]> {
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const tenantsUrl = apiBase ? `${apiBase}/api/tenants` : '/api/tenants'
      const response = await fetch(tenantsUrl, { credentials: 'include' })
      if (!response.ok) return []
      const payload = (await response.json()) as { tenants?: unknown }
      if (!Array.isArray(payload.tenants)) return []
      const tenants = payload.tenants
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim())
      discoveredTenants.value = tenants
      return tenants
    } catch (error) {
      console.warn('[Dashboard] Failed to load tenants:', error)
      return []
    }
  }

  function connectTenant(tenantId: string) {
    socket.disconnect()
    store.clearAll()
    socket.connect(undefined, tenantId)
    socket.emit('subscribe', { rooms: ['connections', 'statistics', 'flows'] })
  }

  function handleTenantChange() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TENANT_STORAGE_KEY, selectedTenant.value)
    }
    connectTenant(selectedTenant.value)
  }

  return {
    selectedTenant,
    tenantOptions,
    discoveredTenants,
    loadDiscoveredTenants,
    connectTenant,
    handleTenantChange,
  }
}
