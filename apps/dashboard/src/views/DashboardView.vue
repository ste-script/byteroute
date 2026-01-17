<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Badge from 'primevue/badge'
import WorldMap from '@/components/WorldMap.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import StatisticsPanel from '@/components/StatisticsPanel.vue'
import ConnectionList from '@/components/ConnectionList.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useSocket } from '@/services/socket'
import type { Connection, TrafficFlow, Statistics, TimeSeriesData } from '@/types'

const store = useDashboardStore()
const { 
  connections, 
  trafficFlows, 
  statistics, 
  isConnected, 
  darkMode,
  selectedTimeRange 
} = storeToRefs(store)

const socket = useSocket()
const mapRef = ref<InstanceType<typeof WorldMap> | null>(null)

const timeRangeOptions = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' }
]

// Mock data for demo (remove when backend is connected)
const mockTimeSeriesData = ref<TimeSeriesData[]>([])
const mockStatistics = ref<Statistics | null>(null)
const mockFlows = ref<TrafficFlow[]>([])

function generateMockData() {
  // Generate time series
  const now = Date.now()
  mockTimeSeriesData.value = Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(now - (23 - i) * 3600000),
    connections: Math.floor(Math.random() * 500) + 100,
    bandwidthIn: Math.floor(Math.random() * 100000000) + 10000000,
    bandwidthOut: Math.floor(Math.random() * 80000000) + 8000000,
    blocked: Math.floor(Math.random() * 50)
  }))

  // Generate statistics
  mockStatistics.value = {
    totalConnections: 1247,
    activeConnections: 892,
    blockedConnections: 45,
    totalBandwidth: 847293847,
    bandwidthIn: 523948234,
    bandwidthOut: 323345613,
    byCountry: [
      { country: 'United States', countryCode: 'US', connections: 423, bandwidth: 234829384, percentage: 33.9 },
      { country: 'Germany', countryCode: 'DE', connections: 187, bandwidth: 123948234, percentage: 15.0 },
      { country: 'United Kingdom', countryCode: 'GB', connections: 156, bandwidth: 98234823, percentage: 12.5 },
      { country: 'France', countryCode: 'FR', connections: 98, bandwidth: 67234823, percentage: 7.9 },
      { country: 'Japan', countryCode: 'JP', connections: 87, bandwidth: 54234823, percentage: 7.0 },
      { country: 'Canada', countryCode: 'CA', connections: 76, bandwidth: 43234823, percentage: 6.1 },
      { country: 'Australia', countryCode: 'AU', connections: 65, bandwidth: 32234823, percentage: 5.2 },
      { country: 'Netherlands', countryCode: 'NL', connections: 54, bandwidth: 28234823, percentage: 4.3 },
      { country: 'Brazil', countryCode: 'BR', connections: 43, bandwidth: 21234823, percentage: 3.4 },
      { country: 'India', countryCode: 'IN', connections: 38, bandwidth: 18234823, percentage: 3.0 }
    ],
    byCategory: [
      { category: 'Web Traffic', connections: 523, bandwidth: 234829384, percentage: 41.9, color: '#3b82f6' },
      { category: 'API Calls', connections: 287, bandwidth: 123948234, percentage: 23.0, color: '#10b981' },
      { category: 'Streaming', connections: 198, bandwidth: 198234823, percentage: 15.9, color: '#f59e0b' },
      { category: 'File Transfer', connections: 132, bandwidth: 187234823, percentage: 10.6, color: '#8b5cf6' },
      { category: 'Other', connections: 107, bandwidth: 45234823, percentage: 8.6, color: '#6b7280' }
    ],
    byProtocol: [
      { protocol: 'TCP', connections: 987, percentage: 79.1 },
      { protocol: 'UDP', connections: 198, percentage: 15.9 },
      { protocol: 'ICMP', connections: 42, percentage: 3.4 },
      { protocol: 'OTHER', connections: 20, percentage: 1.6 }
    ],
    timeSeries: mockTimeSeriesData.value
  }

  // Generate traffic flows
  mockFlows.value = [
    { id: '1', source: { lat: 40.7128, lng: -74.0060, country: 'US', city: 'New York' }, target: { lat: 51.5074, lng: -0.1278, country: 'GB', city: 'London' }, value: 450 },
    { id: '2', source: { lat: 37.7749, lng: -122.4194, country: 'US', city: 'San Francisco' }, target: { lat: 35.6762, lng: 139.6503, country: 'JP', city: 'Tokyo' }, value: 320 },
    { id: '3', source: { lat: 52.5200, lng: 13.4050, country: 'DE', city: 'Berlin' }, target: { lat: 48.8566, lng: 2.3522, country: 'FR', city: 'Paris' }, value: 280 },
    { id: '4', source: { lat: 40.7128, lng: -74.0060, country: 'US', city: 'New York' }, target: { lat: 52.5200, lng: 13.4050, country: 'DE', city: 'Berlin' }, value: 210 },
    { id: '5', source: { lat: 51.5074, lng: -0.1278, country: 'GB', city: 'London' }, target: { lat: -33.8688, lng: 151.2093, country: 'AU', city: 'Sydney' }, value: 180 },
    { id: '6', source: { lat: 35.6762, lng: 139.6503, country: 'JP', city: 'Tokyo' }, target: { lat: 22.3193, lng: 114.1694, country: 'HK', city: 'Hong Kong' }, value: 150 },
    { id: '7', source: { lat: 37.7749, lng: -122.4194, country: 'US', city: 'San Francisco' }, target: { lat: 49.2827, lng: -123.1207, country: 'CA', city: 'Vancouver' }, value: 140 },
    { id: '8', source: { lat: 48.8566, lng: 2.3522, country: 'FR', city: 'Paris' }, target: { lat: 52.3676, lng: 4.9041, country: 'NL', city: 'Amsterdam' }, value: 120 }
  ]

  // Generate mock connections
  const mockConnections: Connection[] = Array.from({ length: 50 }, (_, i) => ({
    id: `conn-${i}`,
    sourceIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    destIp: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    sourcePort: Math.floor(Math.random() * 60000) + 1024,
    destPort: [80, 443, 8080, 3000, 5432, 27017][Math.floor(Math.random() * 6)],
    protocol: ['TCP', 'UDP', 'ICMP', 'OTHER'][Math.floor(Math.random() * 4)] as Connection['protocol'],
    status: ['active', 'active', 'active', 'inactive', 'blocked'][Math.floor(Math.random() * 5)] as Connection['status'],
    country: mockStatistics.value!.byCountry[Math.floor(Math.random() * 10)].country,
    countryCode: mockStatistics.value!.byCountry[Math.floor(Math.random() * 10)].countryCode,
    category: mockStatistics.value!.byCategory[Math.floor(Math.random() * 5)].category,
    bandwidth: Math.floor(Math.random() * 10000000),
    startTime: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
    lastActivity: new Date(Date.now() - Math.floor(Math.random() * 60000))
  }))

  store.setConnections(mockConnections)
  store.setTrafficFlows(mockFlows.value)
  store.setStatistics(mockStatistics.value!)
}

// Computed display values with mock data fallback
const displayStatistics = computed(() => statistics.value || mockStatistics.value)
const displayTimeSeries = computed(() => 
  statistics.value?.timeSeries || mockTimeSeriesData.value
)
const displayFlows = computed(() => 
  trafficFlows.value.length > 0 ? trafficFlows.value : mockFlows.value
)

// Socket event handlers
const unsubscribers: (() => void)[] = []

function setupSocketListeners() {
  unsubscribers.push(
    socket.on('connection:new', (conn) => store.addConnection(conn)),
    socket.on('connection:update', (conn) => store.updateConnection(conn.id, conn)),
    socket.on('connection:remove', ({ id }) => store.removeConnection(id)),
    socket.on('connections:batch', (conns) => store.setConnections(conns)),
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

onMounted(() => {
  // Generate mock data for demo
  generateMockData()
  
  // Connect to socket
  socket.connect()
  setupSocketListeners()
  
  // Subscribe to initial data
  socket.emit('subscribe', { rooms: ['connections', 'statistics', 'flows'] })
})

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub())
  socket.disconnect()
})
</script>

<template>
  <div class="dashboard-layout">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <h1 class="logo">ByteRoute</h1>
        <div class="connection-status">
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
          @change="handleTimeRangeChange"
        />
      </div>
      <div class="header-right">
        <Button
          :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          text
          rounded
          @click="store.toggleDarkMode"
        />
        <Button icon="pi pi-cog" text rounded />
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-grid">
      <!-- Map Panel -->
      <section class="panel map-panel">
        <div class="panel-header">
          <span class="panel-title">World Traffic</span>
          <Button
            icon="pi pi-refresh"
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
      <aside class="panel sidebar-panel">
        <div class="sidebar-sections">
          <!-- Statistics -->
          <div class="sidebar-section statistics-section">
            <div class="panel-header">
              <span class="panel-title">Statistics</span>
            </div>
            <div class="panel-content">
              <StatisticsPanel
                :statistics="displayStatistics"
                :dark-mode="darkMode"
              />
            </div>
          </div>

          <!-- Connections -->
          <div class="sidebar-section connections-section">
            <div class="panel-header">
              <span class="panel-title">Live Connections</span>
              <Badge :value="connections.length.toString()" severity="info" />
            </div>
            <div class="panel-content no-padding">
              <ConnectionList
                :connections="connections"
                @select="handleConnectionSelect"
              />
            </div>
          </div>
        </div>
      </aside>

      <!-- Charts Panel -->
      <section class="panel charts-panel">
        <div class="panel-header">
          <span class="panel-title">Traffic Timeline</span>
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

<style scoped>
.dashboard-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--p-surface-ground);
}

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
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-primary-color);
  margin: 0;
}

.header-center {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dashboard-grid {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  height: calc(100vh - var(--header-height));
  grid-template-columns: 1fr 380px;
  grid-template-rows: 1fr 280px;
  overflow: hidden;
}

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

.sidebar-sections {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.statistics-section {
  flex: 0 0 auto;
  max-height: 50%;
}

.connections-section {
  flex: 1;
  min-height: 0;
}

.sidebar-section .panel-content {
  flex: 1;
  overflow: auto;
}

/* Responsive */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 400px 280px auto;
  }

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
    max-height: 500px;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-wrap: wrap;
    height: auto;
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .header-center {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .dashboard-grid {
    grid-template-rows: 300px 250px auto;
    padding: 0.5rem;
    gap: 0.5rem;
  }
}
</style>
