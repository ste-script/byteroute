<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Select from 'primevue/select'
import WorldMap from '@/components/WorldMap.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import StatisticsPanel from '@/components/StatisticsPanel.vue'
import ConnectionList from '@/components/ConnectionList.vue'
import DashboardHeader from '@/components/DashboardHeader.vue'
import NewTenantDialog from '@/components/NewTenantDialog.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useSocket } from '@/services/socket'
import { useTenantManager } from '@/composables/useTenantManager'
import { useClientToken } from '@/composables/useClientToken'
import { createTenant } from '@/services/tenants'
import type { Connection, TrafficFlow } from '@/types'
import { useRouter } from 'vue-router'

// Version injected at build time via Vite define
const version = __APP_VERSION__

const store = useDashboardStore()
const authStore = useAuthStore()
const router = useRouter()
const { connections, trafficFlows, statistics, darkMode, selectedTimeRange } = storeToRefs(store)

const socket = useSocket()
const { isConnected } = socket
const mapRef = ref<InstanceType<typeof WorldMap> | null>(null)

const timeRangeOptions = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
]

// ── Tenant management ─────────────────────────────────────────────────────────
const {
  selectedTenant,
  tenantOptions,
  discoveredTenants,
  loadDiscoveredTenants,
  connectTenant,
  handleTenantChange,
} = useTenantManager()

// ── New Tenant dialog ─────────────────────────────────────────────────────────
const showNewTenantDialog = ref(false)
const newTenantError = ref<string | null>(null)
const newTenantPending = ref(false)

async function handleCreateTenant(payload: { name: string; tenantId?: string }): Promise<void> {
  newTenantError.value = null
  newTenantPending.value = true
  try {
    const tenant = await createTenant(payload, authStore.csrfToken)
    discoveredTenants.value = Array.from(new Set([...discoveredTenants.value, tenant.tenantId]))
    selectedTenant.value = tenant.tenantId
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('byteroute:selected-tenant', tenant.tenantId)
    }
    connectTenant(tenant.tenantId)
    showNewTenantDialog.value = false
  } catch (error) {
    newTenantError.value = error instanceof Error ? error.message : 'Failed to create tenant'
  } finally {
    newTenantPending.value = false
  }
}

// ── Client token copy ─────────────────────────────────────────────────────────
const {
  pending: copyTokenPending,
  message: copyTokenMessage,
  handleCopy: handleCopyToken,
} = useClientToken()

// ── Connection list controls ──────────────────────────────────────────────────
const connectionLimit = ref<5 | 10 | 20>(10)
const connectionLimitOptions: Array<{ label: string; value: 5 | 10 | 20 }> = [
  { label: 'Last 5', value: 5 },
  { label: 'Last 10', value: 10 },
  { label: 'Last 20', value: 20 },
]
const connectionsPaused = ref(false)

function toggleConnectionsPaused() {
  connectionsPaused.value = !connectionsPaused.value
  socket.emit(connectionsPaused.value ? 'unsubscribe' : 'subscribe', { rooms: ['connections'] })
}

const limitedConnections = computed(() => connections.value.slice(0, connectionLimit.value))

// ── Computed display aliases ──────────────────────────────────────────────────
const displayStatistics = computed(() => statistics.value)
const displayTimeSeries = computed(() => statistics.value?.timeSeries ?? [])
const displayFlows = computed(() => trafficFlows.value)

// ── Socket listeners ──────────────────────────────────────────────────────────
const unsubscribers: (() => void)[] = []

function setupSocketListeners() {
  unsubscribers.push(
    socket.on('tenant:new', ({ tenantId }) => {
      const next = tenantId.trim()
      if (!next || discoveredTenants.value.includes(next)) return
      discoveredTenants.value = [...discoveredTenants.value, next]
    }),
    socket.on('tenants:list', ({ tenants }) => {
      const cleaned = tenants.map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      discoveredTenants.value = Array.from(new Set([...discoveredTenants.value, ...cleaned]))
    }),
    socket.on('connection:new', (conn) => {
      if (!connectionsPaused.value) store.addConnection(conn)
    }),
    socket.on('connection:update', (conn) => {
      if (!connectionsPaused.value) store.updateConnection(conn.id, conn)
    }),
    socket.on('connection:remove', ({ id }) => {
      if (!connectionsPaused.value) store.removeConnection(id)
    }),
    socket.on('connections:batch', (conns) => {
      if (!connectionsPaused.value) store.setConnections(conns)
    }),
    socket.on('traffic:flows', (flows) => store.setTrafficFlows(flows)),
    socket.on('statistics:update', (stats) => store.setStatistics(stats))
  )
}

function handleTimeRangeChange() {
  socket.emit('subscribe:timerange', { range: selectedTimeRange.value })
}

function handleConnectionSelect(connection: Connection) {
  if (connection.latitude && connection.longitude) {
    mapRef.value?.flyTo({ center: [connection.longitude, connection.latitude], zoom: 5, duration: 1000 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleFlowClick(_flow: TrafficFlow) {
  // reserved for future use
}

async function handleLogout(): Promise<void> {
  socket.disconnect()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('byteroute:selected-tenant')
  }
  await authStore.logout()
  await router.push('/login')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  const tenants = await loadDiscoveredTenants()
  if (tenants.length > 0 && !tenants.includes(selectedTenant.value)) {
    selectedTenant.value = tenants[0]!
  }
  setupSocketListeners()
  connectTenant(selectedTenant.value)
})

onUnmounted(() => {
  unsubscribers.forEach((unsub) => unsub())
  socket.disconnect()
})
</script>

<template>
  <div class="dashboard-layout">
    <!-- Header -->
    <DashboardHeader
      :is-connected="isConnected"
      :dark-mode="darkMode"
      :selected-tenant="selectedTenant"
      :tenant-options="tenantOptions"
      :selected-time-range="selectedTimeRange"
      :time-range-options="timeRangeOptions"
      :version="version"
      :copy-token-pending="copyTokenPending"
      :copy-token-message="copyTokenMessage"
      @update:selected-tenant="selectedTenant = $event"
      @update:selected-time-range="store.setTimeRange($event as '1h' | '6h' | '24h' | '7d')"
      @tenant-change="handleTenantChange"
      @time-range-change="handleTimeRangeChange"
      @toggle-dark-mode="store.toggleDarkMode"
      @copy-token="handleCopyToken"
      @logout="handleLogout"
      @new-tenant="showNewTenantDialog = true"
    />

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
              <StatisticsPanel :statistics="displayStatistics" :dark-mode="darkMode" />
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
                  option-label="label"
                  option-value="value"
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
              <ConnectionList :connections="limitedConnections" @select="handleConnectionSelect" />
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
          <TrafficChart :data="displayTimeSeries" :dark-mode="darkMode" title="" />
        </div>
      </section>
    </main>

    <!-- New Tenant Dialog -->
    <NewTenantDialog
      v-model:visible="showNewTenantDialog"
      :pending="newTenantPending"
      :error="newTenantError"
      @submit="handleCreateTenant"
      @close="newTenantError = null"
    />
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

.connections-header-right {
  width: 100%;
  justify-content: flex-end;
}

@include m.max-width(t.$bp-xl) {
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

@include m.max-width(t.$bp-md) {
  .dashboard-grid {
    height: auto;
    min-height: 0;
    grid-template-rows: t.$dashboard-map-row-height-md t.$dashboard-charts-row-height-md minmax(t.$dashboard-sidebar-min-height-md, auto);
    padding: 0.5rem;
    gap: 0.5rem;
    overflow-x: hidden;
    overflow-y: visible;
  }

  .connections-header-right {
    width: 100%;
    justify-content: flex-end;
  }
}

@include m.max-width(t.$bp-xs) {
  .connections-header-left,
  .connections-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .connections-limit {
    min-width: t.$connections-limit-min-width-xs;
  }
}
</style>
