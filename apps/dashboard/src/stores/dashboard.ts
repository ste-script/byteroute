import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Connection, TrafficFlow, Statistics } from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const MAX_CONNECTIONS_IN_MEMORY = 500

  // State
  const connections = ref<Connection[]>([])
  const trafficFlows = ref<TrafficFlow[]>([])
  const statistics = ref<Statistics | null>(null)
  const isConnected = ref(false)
  const lastUpdated = ref<Date | null>(null)
  const darkMode = ref(false)

  // Getters
  const activeConnections = computed(() => 
    connections.value.filter(c => c.status === 'active')
  )

  const connectionsByCountry = computed(() => {
    const grouped = new Map<string, Connection[]>()
    for (const conn of connections.value) {
      const country = conn.country || 'Unknown'
      if (!grouped.has(country)) {
        grouped.set(country, [])
      }
      grouped.get(country)!.push(conn)
    }
    return grouped
  })

  const totalBandwidth = computed(() => {
    return connections.value.reduce((sum, conn) => sum + (conn.bandwidth || 0), 0)
  })

  // Actions
  function setConnections(newConnections: Connection[]) {
    connections.value = newConnections.slice(0, MAX_CONNECTIONS_IN_MEMORY)
    lastUpdated.value = new Date()
  }

  function addConnection(connection: Connection) {
    const index = connections.value.findIndex(c => c.id === connection.id)
    if (index >= 0) {
      connections.value[index] = connection
    } else {
      connections.value.unshift(connection)
    }

    if (connections.value.length > MAX_CONNECTIONS_IN_MEMORY) {
      connections.value.splice(MAX_CONNECTIONS_IN_MEMORY)
    }
    lastUpdated.value = new Date()
  }

  function removeConnection(connectionId: string) {
    const index = connections.value.findIndex(c => c.id === connectionId)
    if (index >= 0) {
      connections.value.splice(index, 1)
    }
    lastUpdated.value = new Date()
  }

  function updateConnection(connectionId: string, updates: Partial<Connection>) {
    const connection = connections.value.find(c => c.id === connectionId)
    if (connection) {
      Object.assign(connection, updates)
      lastUpdated.value = new Date()
    }
  }

  function setTrafficFlows(flows: TrafficFlow[]) {
    trafficFlows.value = flows
  }

  function setStatistics(stats: Statistics) {
    statistics.value = stats
    lastUpdated.value = new Date()
  }

  function setConnectionStatus(status: boolean) {
    isConnected.value = status
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark-mode', darkMode.value)
  }

  function clearAll() {
    connections.value = []
    trafficFlows.value = []
    statistics.value = null
    lastUpdated.value = null
  }

  return {
    // State
    connections,
    trafficFlows,
    statistics,
    isConnected,
    lastUpdated,
    darkMode,
    // Getters
    activeConnections,
    connectionsByCountry,
    totalBandwidth,
    // Actions
    setConnections,
    addConnection,
    removeConnection,
    updateConnection,
    setTrafficFlows,
    setStatistics,
    setConnectionStatus,
    toggleDarkMode,
    clearAll
  }
})
