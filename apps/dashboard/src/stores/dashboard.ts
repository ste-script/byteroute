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

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Connection, TrafficFlow, Statistics } from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const MAX_CONNECTIONS_IN_MEMORY = 500
  const DARK_MODE_STORAGE_KEY = 'byteroute:dark-mode'

  function resolveInitialDarkMode(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    const saved = window.localStorage.getItem(DARK_MODE_STORAGE_KEY)
    if (saved === 'true') {
      return true
    }
    if (saved === 'false') {
      return false
    }

    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return false
  }

  function syncDarkModeClass(enabled: boolean) {
    if (typeof document === 'undefined') {
      return
    }
    document.documentElement.classList.toggle('dark-mode', enabled)
  }

  // State
  const connections = ref<Connection[]>([])
  const trafficFlows = ref<TrafficFlow[]>([])
  const statistics = ref<Statistics | null>(null)
  const isConnected = ref(false)
  const lastUpdated = ref<Date | null>(null)
  const darkMode = ref(resolveInitialDarkMode())

  syncDarkModeClass(darkMode.value)

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
    syncDarkModeClass(darkMode.value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode.value))
    }
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
