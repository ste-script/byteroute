import { ref, computed } from 'vue'
import { useSocket } from '@/services/socket'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { ensureTenantId, normalizeTenantIds, sanitizeTenantId } from '@byteroute/shared/common'
import { listTenants } from '@/services/tenants'

export const TENANT_STORAGE_KEY = 'byteroute:selected-tenant'

export function useTenantManager() {
  const store = useDashboardStore()
  const socket = useSocket()
  const authStore = useAuthStore()

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
      const tenants = await listTenants()
      discoveredTenants.value = tenants
      return tenants
    } catch (error) {
      console.warn('[Dashboard] Failed to load tenants:', error)
      return []
    }
  }

  function connectTenant(tenantId: string, options?: { connectionsLimit?: number }) {
    socket.disconnect()
    store.clearAll()
    socket.connect(undefined, tenantId, authStore.token ?? undefined)
    socket.emit('subscribe', {
      rooms: ['connections', 'statistics', 'flows'],
      connectionsLimit: options?.connectionsLimit
    })
  }

  function handleTenantChange(connectionsLimit?: number) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TENANT_STORAGE_KEY, selectedTenant.value)
    }
    connectTenant(selectedTenant.value, { connectionsLimit })
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
