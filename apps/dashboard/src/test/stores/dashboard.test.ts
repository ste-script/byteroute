import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import type { Connection, TrafficFlow, Statistics } from '@/types'

describe('Dashboard Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have empty connections', () => {
      const store = useDashboardStore()
      expect(store.connections).toEqual([])
    })

    it('should have empty traffic flows', () => {
      const store = useDashboardStore()
      expect(store.trafficFlows).toEqual([])
    })

    it('should have null statistics', () => {
      const store = useDashboardStore()
      expect(store.statistics).toBeNull()
    })

    it('should not be connected initially', () => {
      const store = useDashboardStore()
      expect(store.isConnected).toBe(false)
    })

    it('should have dark mode disabled by default', () => {
      const store = useDashboardStore()
      expect(store.darkMode).toBe(false)
    })
  })

  describe('connections management', () => {
    const mockConnection: Connection = {
      id: 'conn-1',
      sourceIp: '192.168.1.1',
      destIp: '10.0.0.1',
      sourcePort: 54321,
      destPort: 443,
      protocol: 'TCP',
      status: 'active',
      country: 'United States',
      countryCode: 'US',
      bandwidth: 1000000,
      startTime: new Date(),
      lastActivity: new Date()
    }

    it('should set connections', () => {
      const store = useDashboardStore()
      store.setConnections([mockConnection])
      expect(store.connections).toHaveLength(1)
      expect(store.connections[0].id).toBe('conn-1')
    })

    it('should add a new connection', () => {
      const store = useDashboardStore()
      store.addConnection(mockConnection)
      expect(store.connections).toHaveLength(1)
    })

    it('should cap connections at 500 when adding beyond the limit', () => {
      const store = useDashboardStore()
      // Fill up to exactly 500
      const initial = Array.from({ length: 500 }, (_, i) => ({
        id: `conn-${i}`,
        status: 'active' as const,
        sourceIp: '1.1.1.1',
        destIp: '2.2.2.2',
        sourcePort: 1,
        destPort: 2,
        protocol: 'TCP' as const,
        startTime: new Date(),
        lastActivity: new Date()
      }))
      store.setConnections(initial)
      expect(store.connections).toHaveLength(500)

      // Adding one more should splice off the oldest
      store.addConnection({
        id: 'conn-new',
        status: 'active',
        sourceIp: '3.3.3.3',
        destIp: '4.4.4.4',
        sourcePort: 80,
        destPort: 443,
        protocol: 'TCP',
        startTime: new Date(),
        lastActivity: new Date()
      })
      expect(store.connections).toHaveLength(500)
    })

    it('should update existing connection when added again with the same id', () => {
      const store = useDashboardStore()
      store.addConnection(mockConnection)
      
      const updatedConnection = { ...mockConnection, bandwidth: 2000000 }
      store.addConnection(updatedConnection)
      
      expect(store.connections).toHaveLength(1)
      expect(store.connections[0].bandwidth).toBe(2000000)
    })

    it('should remove a connection', () => {
      const store = useDashboardStore()
      store.setConnections([mockConnection])
      store.removeConnection('conn-1')
      expect(store.connections).toHaveLength(0)
    })

    it('should update connection properties', () => {
      const store = useDashboardStore()
      store.setConnections([mockConnection])
      store.updateConnection('conn-1', { status: 'inactive' })
      expect(store.connections[0].status).toBe('inactive')
    })

    it('should not fail when updating non-existent connection', () => {
      const store = useDashboardStore()
      store.updateConnection('non-existent', { status: 'inactive' })
      expect(store.connections).toHaveLength(0)
    })
  })

  describe('computed getters', () => {
    it('should filter active connections', () => {
      const store = useDashboardStore()
      store.setConnections([
        { id: '1', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '2', status: 'inactive', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '3', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '4', status: 'inactive', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() }
      ] as Connection[])
      
      expect(store.activeConnections).toHaveLength(2)
    })

    it('should group connections by country', () => {
      const store = useDashboardStore()
      store.setConnections([
        { id: '1', country: 'US', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '2', country: 'US', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '3', country: 'DE', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() }
      ] as Connection[])
      
      expect(store.connectionsByCountry.get('US')).toHaveLength(2)
      expect(store.connectionsByCountry.get('DE')).toHaveLength(1)
    })

    it('should group connections without country under "Unknown"', () => {
      const store = useDashboardStore()
      store.setConnections([
        { id: '1', country: undefined, status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
      ] as Connection[])

      expect(store.connectionsByCountry.get('Unknown')).toHaveLength(1)
    })

    it('should compute total bandwidth', () => {
      const store = useDashboardStore()
      store.setConnections([
        { id: '1', bandwidth: 1000, status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '2', bandwidth: 2000, status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() },
        { id: '3', bandwidth: 3000, status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() }
      ] as Connection[])
      
      expect(store.totalBandwidth).toBe(6000)
    })
  })

  describe('traffic flows', () => {
    it('should set traffic flows', () => {
      const store = useDashboardStore()
      const flows: TrafficFlow[] = [
        { id: '1', source: { lat: 40, lng: -74 }, target: { lat: 51, lng: 0 }, value: 100 },
        { id: '2', source: { lat: 35, lng: 139 }, target: { lat: 48, lng: 2 }, value: 200 }
      ]
      
      store.setTrafficFlows(flows)
      expect(store.trafficFlows).toHaveLength(2)
    })
  })

  describe('statistics', () => {
    it('should set statistics', () => {
      const store = useDashboardStore()
      const stats: Statistics = {
        totalConnections: 100,
        activeConnections: 80,
        totalBandwidth: 1000000,
        bandwidthIn: 600000,
        bandwidthOut: 400000,
        byCountry: [],
        byAsn: [],
        byProtocol: [],
        timeSeries: []
      }
      
      store.setStatistics(stats)
      expect(store.statistics).toEqual(stats)
      expect(store.lastUpdated).not.toBeNull()
    })
  })

  describe('settings', () => {
    it('should set connection status', () => {
      const store = useDashboardStore()
      store.setConnectionStatus(true)
      expect(store.isConnected).toBe(true)
    })

    it('should toggle dark mode', () => {
      const store = useDashboardStore()
      expect(store.darkMode).toBe(false)
      
      store.toggleDarkMode()
      expect(store.darkMode).toBe(true)
      
      store.toggleDarkMode()
      expect(store.darkMode).toBe(false)
    })

    it('should clear all data', () => {
      const store = useDashboardStore()
      store.setConnections([{ id: '1', status: 'active', sourceIp: '1.1.1.1', destIp: '2.2.2.2', sourcePort: 1, destPort: 2, protocol: 'TCP', startTime: new Date(), lastActivity: new Date() }] as Connection[])
      store.setStatistics({ totalConnections: 1 } as Statistics)
      
      store.clearAll()
      
      expect(store.connections).toHaveLength(0)
      expect(store.trafficFlows).toHaveLength(0)
      expect(store.statistics).toBeNull()
      expect(store.lastUpdated).toBeNull()
    })
  })
})
