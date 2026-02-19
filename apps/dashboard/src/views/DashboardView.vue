<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Badge from 'primevue/badge'
import Select from 'primevue/select'
import WorldMap from '@/components/WorldMap.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import StatisticsPanel from '@/components/StatisticsPanel.vue'
import ConnectionList from '@/components/ConnectionList.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useSocket } from '@/services/socket'
import type { Connection, TrafficFlow } from '@/types'
import { useRouter } from 'vue-router'
import { ensureTenantId, normalizeTenantIds, sanitizeTenantId } from '@byteroute/shared/common'
// Version injected at build time via Vite define
const version = __APP_VERSION__

const store = useDashboardStore()
const authStore = useAuthStore()
const router = useRouter()
const {
  connections,
  trafficFlows,
  statistics,
  darkMode,
  selectedTimeRange
} = storeToRefs(store)

const socket = useSocket()
const { isConnected } = socket
const mapRef = ref<InstanceType<typeof WorldMap> | null>(null)

const timeRangeOptions = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' }
]

const TENANT_STORAGE_KEY = 'byteroute:selected-tenant'
const initialTenant = ensureTenantId(import.meta.env.VITE_TENANT_ID)

const savedTenant = typeof window !== 'undefined'
  ? sanitizeTenantId(window.localStorage.getItem(TENANT_STORAGE_KEY))
  : undefined
const defaultTenant = savedTenant ?? initialTenant
const discoveredTenants = ref<string[]>([])

const tenantOptions = computed(() => {
  const uniqueTenants = Array.from(new Set(normalizeTenantIds([
    defaultTenant,
    ...discoveredTenants.value
  ])))
  return uniqueTenants.map((tenant) => ({ label: tenant, value: tenant }))
})

const selectedTenant = ref(defaultTenant)
const copyClientTokenPending = ref(false)
const copyClientTokenMessage = ref<string | null>(null)
let copyClientTokenTimer: ReturnType<typeof setTimeout> | undefined

const connectionLimit = ref<5 | 10 | 20>(10)
const connectionLimitOptions: Array<{ label: string; value: 5 | 10 | 20 }> = [
  { label: 'Last 5', value: 5 },
  { label: 'Last 10', value: 10 },
  { label: 'Last 20', value: 20 }
]

const connectionsPaused = ref(false)

function toggleConnectionsPaused() {
  connectionsPaused.value = !connectionsPaused.value
  socket.emit(connectionsPaused.value ? 'unsubscribe' : 'subscribe', { rooms: ['connections'] })
}

// Computed display values
const displayStatistics = computed(() => statistics.value)
const displayTimeSeries = computed(() => statistics.value?.timeSeries ?? [])
const displayFlows = computed(() => trafficFlows.value)

const limitedConnections = computed(() => {
  return connections.value.slice(0, connectionLimit.value)
})

// Socket event handlers
const unsubscribers: (() => void)[] = []

function setupSocketListeners() {
  unsubscribers.push(
    socket.on('tenant:new', ({ tenantId }) => {
      const nextTenant = tenantId.trim()
      if (!nextTenant) return
      if (discoveredTenants.value.includes(nextTenant)) return
      discoveredTenants.value = [...discoveredTenants.value, nextTenant]
    }),
    socket.on('tenants:list', ({ tenants }) => {
      const cleaned = tenants
        .map((tenant) => tenant.trim())
        .filter((tenant) => tenant.length > 0)
      discoveredTenants.value = Array.from(new Set([...discoveredTenants.value, ...cleaned]))
    }),
    socket.on('connection:new', (conn) => {
      if (connectionsPaused.value) return
      store.addConnection(conn)
    }),
    socket.on('connection:update', (conn) => {
      if (connectionsPaused.value) return
      store.updateConnection(conn.id, conn)
    }),
    socket.on('connection:remove', ({ id }) => {
      if (connectionsPaused.value) return
      store.removeConnection(id)
    }),
    socket.on('connections:batch', (conns) => {
      if (connectionsPaused.value) return
      store.setConnections(conns)
    }),
    socket.on('traffic:flows', (flows) => store.setTrafficFlows(flows)),
    socket.on('statistics:update', (stats) => store.setStatistics(stats))
  )
}

function handleTimeRangeChange() {
  socket.emit('subscribe:timerange', { range: selectedTimeRange.value })
}

function handleConnectionSelect(connection: Connection) {
  console.log('Selected connection:', connection)
  // Could open a detail panel or fly to location on map
  if (connection.latitude && connection.longitude) {
    mapRef.value?.flyTo({
      center: [connection.longitude, connection.latitude],
      zoom: 5,
      duration: 1000
    })
  }
}

function handleFlowClick(flow: TrafficFlow) {
  console.log('Clicked flow:', flow)
}

async function loadDiscoveredTenants(): Promise<string[]> {
  try {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const tenantsUrl = apiBase ? `${apiBase}/api/tenants` : '/api/tenants'
    const response = await fetch(tenantsUrl, {
      credentials: 'include'
    })
    if (!response.ok) {
      return []
    }

    const payload = await response.json() as { tenants?: unknown }
    if (!Array.isArray(payload.tenants)) {
      return []
    }

    const tenants = payload.tenants
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())

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

async function handleLogout(): Promise<void> {
  socket.disconnect()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TENANT_STORAGE_KEY)
  }
  await authStore.logout()
  await router.push('/login')
}

async function copyTextToClipboard(value: string): Promise<void> {
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  if (clipboard?.writeText) {
    await clipboard.writeText(value)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this environment')
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.pointerEvents = 'none'
  document.body.appendChild(textArea)
  textArea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!copied) {
    throw new Error('Failed to copy token')
  }
}

async function handleCopyClientToken(): Promise<void> {
  copyClientTokenPending.value = true
  copyClientTokenMessage.value = null

  try {
    const token = await authStore.createClientToken()
    await copyTextToClipboard(token)
    copyClientTokenMessage.value = 'Token copied'
  } catch (error) {
    copyClientTokenMessage.value = error instanceof Error ? error.message : 'Copy failed'
  } finally {
    copyClientTokenPending.value = false
    if (copyClientTokenTimer) {
      clearTimeout(copyClientTokenTimer)
    }
    copyClientTokenTimer = setTimeout(() => {
      copyClientTokenMessage.value = null
    }, 3000)
  }
}

function handleTenantChange() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TENANT_STORAGE_KEY, selectedTenant.value)
  }
  connectTenant(selectedTenant.value)
}

onMounted(async () => {
  const tenants = await loadDiscoveredTenants()

  if (tenants.length > 0 && !tenants.includes(selectedTenant.value)) {
    selectedTenant.value = tenants[0]!
  }

  setupSocketListeners()
  
  // Connect to socket
  connectTenant(selectedTenant.value)
})

onUnmounted(() => {
  if (copyClientTokenTimer) {
    clearTimeout(copyClientTokenTimer)
  }
  unsubscribers.forEach(unsub => unsub())
  socket.disconnect()
})
</script>

<template>
  <div class="dashboard-layout">
    <!-- Header -->
    <header class="dashboard-header" role="banner">
      <div class="header-left">
        <h1 class="logo">ByteRoute</h1>
        <div class="header-connection-status">
          <Badge 
            :value="isConnected ? 'Connected' : 'Disconnected'" 
            :severity="isConnected ? 'success' : 'danger'"
          />
        </div>
      </div>
      <div class="header-center">
        <SelectButton
          v-model="selectedTimeRange"
          :options="timeRangeOptions"
          optionLabel="label"
          optionValue="value"
          aria-label="Select time range"
          @change="handleTimeRangeChange"
        />
      </div>
      <div class="header-right">
        <Select
          v-model="selectedTenant"
          :options="tenantOptions"
          optionLabel="label"
          optionValue="value"
          aria-label="Select tenant"
          class="tenant-select"
          @change="handleTenantChange"
        />
        <span class="version">v{{ version }}</span>
        <Button
          :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          :aria-label="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="darkMode"
          text
          rounded
          @click="store.toggleDarkMode"
        />
        <Button
          icon="pi pi-copy"
          aria-label="Copy client token"
          text
          rounded
          :loading="copyClientTokenPending"
          @click="handleCopyClientToken"
        />
        <Button icon="pi pi-sign-out" aria-label="Sign out" text rounded @click="handleLogout" />
        <Button icon="pi pi-cog" aria-label="Open settings" text rounded />
        <span v-if="copyClientTokenMessage" class="copy-token-message">{{ copyClientTokenMessage }}</span>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" class="dashboard-grid" tabindex="-1">
      <!-- Map Panel -->
      <section class="panel map-panel" aria-labelledby="world-traffic-title">
        <div class="panel-header">
          <h2 id="world-traffic-title" class="panel-title">World Traffic</h2>
          <Button
            icon="pi pi-refresh"
            aria-label="Reset world map view"
            text
            size="small"
            @click="mapRef?.resetView()"
          />
        </div>
        <div class="panel-content no-padding">
          <WorldMap
            ref="mapRef"
            :flows="displayFlows"
            :dark-mode="darkMode"
            @flow-click="handleFlowClick"
          />
        </div>
      </section>

      <!-- Sidebar Panel -->
      <aside class="panel sidebar-panel" aria-label="Statistics and live connections">
        <div class="sidebar-sections">
          <!-- Statistics -->
          <section class="sidebar-section statistics-section" aria-labelledby="statistics-title">
            <div class="panel-header">
              <h2 id="statistics-title" class="panel-title">Statistics</h2>
            </div>
            <div class="panel-content">
              <StatisticsPanel
                :statistics="displayStatistics"
                :dark-mode="darkMode"
              />
            </div>
          </section>

          <!-- Connections -->
          <section class="sidebar-section connections-section" aria-labelledby="connections-title">
            <div class="panel-header">
              <div class="connections-header-left">
                <h2 id="connections-title" class="panel-title">Live Connections</h2>
                <Badge :value="connections.length.toString()" severity="info" />
              </div>
              <div class="connections-header-right">
                <Select
                  v-model="connectionLimit"
                  :options="connectionLimitOptions"
                  optionLabel="label"
                  optionValue="value"
                  aria-label="Select number of connections shown"
                  class="connections-limit"
                />
                <Button
                  :icon="connectionsPaused ? 'pi pi-play' : 'pi pi-pause'"
                  :aria-label="connectionsPaused ? 'Resume live updates' : 'Pause live updates'"
                  :aria-pressed="connectionsPaused"
                  text
                  size="small"
                  @click="toggleConnectionsPaused"
                />
              </div>
            </div>
            <div class="panel-content no-padding">
              <ConnectionList
                :connections="limitedConnections"
                @select="handleConnectionSelect"
              />
            </div>
          </section>
        </div>
      </aside>

      <!-- Charts Panel -->
      <section class="panel charts-panel" aria-labelledby="timeline-title">
        <div class="panel-header">
          <h2 id="timeline-title" class="panel-title">Traffic Timeline</h2>
        </div>
        <div class="panel-content no-padding">
          <TrafficChart
            :data="displayTimeSeries"
            :dark-mode="darkMode"
            title=""
          />
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/styles/tokens' as t;
@use '../assets/styles/mixins' as m;

.dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  background: var(--p-surface-ground);

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 1rem;
    background: var(--p-surface-card);
    border-bottom: 1px solid var(--p-surface-border);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }

  .header-connection-status {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .tenant-select {
    width: 10rem;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--p-primary-color);
    margin: 0;
  }

  .header-left,
  .header-right,
  .header-center {
    width: 100%;
  }

  .header-left,
  .header-right {
    justify-content: space-between;
  }

  .header-left {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header-connection-status :deep(.p-badge) {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-center {
    display: flex;
    align-items: center;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .version {
    font-size: 0.875rem;
    color: var(--p-text-muted-color);
    font-weight: 500;
  }

  .copy-token-message {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
  }

  .tenant-select {
    width: 100%;
    max-width: 14rem;
  }

  .dashboard-grid {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    width: 100%;
    max-width: 100%;
    height: calc(100dvh - var(--header-height));
    grid-template-columns: minmax(0, 1fr) t.$dashboard-sidebar-width;
    grid-template-rows: 1fr t.$dashboard-charts-row-height;
    overflow: hidden;

    .map-panel {
      grid-column: 1;
      grid-row: 1;
    }

    .sidebar-panel {
      grid-column: 2;
      grid-row: 1 / 3;
    }

    .charts-panel {
      grid-column: 1;
      grid-row: 2;
    }
  }

  .sidebar-sections {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sidebar-section {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;

    .panel-content {
      flex: 1;
      overflow: auto;
    }
  }

  .statistics-section {
    flex: 0 0 auto;
    max-height: 50%;
  }

  .connections-section {
    flex: 1;
    min-height: 0;
  }

  .connections-header-left,
  .connections-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow-x: hidden;
    overflow-y: visible;
  }

  .statistics-section {
    max-height: none;
  }

  .connections-header-right {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 520px) {
  .header-left {
    justify-content: flex-start;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .version {
    flex-basis: 100%;
  }

  .connections-header-left,
  .connections-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .connections-limit {
    min-width: 7.5rem;
  }

  .connections-limit {
    min-width: t.$connections-limit-min-width;
  }

  .panel-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
}

/* Responsive */
@include m.max-width(t.$bp-xl) {
  .dashboard-layout {
    .dashboard-grid {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: t.$dashboard-map-row-height-xl t.$dashboard-charts-row-height auto;

      .map-panel {
        grid-column: 1;
        grid-row: 1;
      }

      .charts-panel {
        grid-column: 1;
        grid-row: 2;
      }

      .sidebar-panel {
        grid-column: 1;
        grid-row: 3;
        max-height: t.$dashboard-sidebar-max-height-xl;
      }
    }
  }
}

@include m.max-width(t.$bp-md) {
  .dashboard-layout {
    .dashboard-header {
      flex-wrap: wrap;
      height: auto;
      padding: 0.75rem;
      gap: 0.5rem;
    }

    .header-left,
    .header-right,
    .header-center {
      width: 100%;
    }

    .header-left,
    .header-right {
      justify-content: space-between;
    }

    .header-left {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .header-connection-status {
      :deep(.p-badge) {
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .header-center {
      order: 3;
      justify-content: center;
    }

    .tenant-select {
      width: 100%;
      max-width: 14rem;
    }

    .dashboard-grid {
      height: auto;
      min-height: 0;
      grid-template-rows: t.$dashboard-map-row-height-md t.$dashboard-charts-row-height-md minmax(t.$dashboard-sidebar-min-height-md, auto);
      padding: 0.5rem;
      gap: 0.5rem;
      overflow-x: hidden;
      overflow-y: visible;
    }

    .statistics-section {
      max-height: none;
    }

    .connections-header-right {
      width: 100%;
      justify-content: flex-end;
    }
  }
}

@include m.max-width(t.$bp-xs) {
  .dashboard-layout {
    .header-left {
      justify-content: flex-start;
    }

    .header-right {
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .version {
      flex-basis: 100%;
    }

    .connections-header-left,
    .connections-header-right {
      width: 100%;
      justify-content: space-between;
    }

    .connections-limit {
      min-width: t.$connections-limit-min-width-xs;
    }
  }
}
</style>
