import { describe, it, expect } from 'vitest'
import type { 
  Connection, 
  TrafficFlow, 
  Statistics, 
  CountryStats, 
  AsnStats,
  ProtocolStats,
  TimeSeriesData,
  DashboardFilters 
} from '@/types'

describe('Type definitions', () => {
  describe('Connection', () => {
    it('should accept valid connection object', () => {
      const connection: Connection = {
        id: 'test-1',
        sourceIp: '192.168.1.1',
        destIp: '10.0.0.1',
        sourcePort: 54321,
        destPort: 443,
        protocol: 'TCP',
        status: 'active',
        startTime: new Date(),
        lastActivity: new Date()
      }
      
      expect(connection.id).toBe('test-1')
      expect(connection.protocol).toBe('TCP')
      expect(connection.status).toBe('active')
    })

    it('should accept all protocol types', () => {
      const protocols: Connection['protocol'][] = ['TCP', 'UDP', 'ICMP', 'OTHER']
      expect(protocols).toHaveLength(4)
    })

    it('should accept all status types', () => {
      const statuses: Connection['status'][] = ['active', 'inactive']
      expect(statuses).toHaveLength(2)
    })

    it('should accept optional fields', () => {
      const connection: Connection = {
        id: 'test-1',
        sourceIp: '192.168.1.1',
        destIp: '10.0.0.1',
        sourcePort: 54321,
        destPort: 443,
        protocol: 'TCP',
        status: 'active',
        startTime: new Date(),
        lastActivity: new Date(),
        country: 'United States',
        countryCode: 'US',
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        asn: 13335,
        asOrganization: 'Cloudflare, Inc.',
        bandwidth: 1000000,
        bytesIn: 500000,
        bytesOut: 500000,
        packetsIn: 1000,
        packetsOut: 1000,
        duration: 3600
      }
      
      expect(connection.country).toBe('United States')
      expect(connection.bandwidth).toBe(1000000)
    })
  })

  describe('TrafficFlow', () => {
    it('should accept valid traffic flow object', () => {
      const flow: TrafficFlow = {
        id: 'flow-1',
        source: { lat: 40.7128, lng: -74.0060 },
        target: { lat: 51.5074, lng: -0.1278 },
        value: 100
      }
      
      expect(flow.source.lat).toBe(40.7128)
      expect(flow.target.lng).toBe(-0.1278)
    })

    it('should accept optional color and animated fields', () => {
      const flow: TrafficFlow = {
        id: 'flow-1',
        source: { lat: 40, lng: -74, country: 'US', city: 'New York' },
        target: { lat: 51, lng: 0, country: 'GB', city: 'London' },
        value: 100,
        color: [255, 0, 0, 200],
        animated: true
      }
      
      expect(flow.color).toEqual([255, 0, 0, 200])
      expect(flow.animated).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should accept valid statistics object', () => {
      const stats: Statistics = {
        totalConnections: 1000,
        activeConnections: 800,
        totalBandwidth: 1000000000,
        bandwidthIn: 600000000,
        bandwidthOut: 400000000,
        byCountry: [],
        byAsn: [],
        byProtocol: [],
        timeSeries: []
      }
      
      expect(stats.totalConnections).toBe(1000)
      expect(stats.activeConnections).toBe(800)
    })
  })

  describe('CountryStats', () => {
    it('should accept valid country stats', () => {
      const countryStats: CountryStats = {
        country: 'United States',
        countryCode: 'US',
        connections: 500,
        bandwidth: 500000000,
        percentage: 50
      }
      
      expect(countryStats.countryCode).toBe('US')
      expect(countryStats.percentage).toBe(50)
    })
  })

  describe('AsnStats', () => {
    it('should accept valid ASN stats', () => {
      const asnStats: AsnStats = {
        asn: 13335,
        asOrganization: 'Cloudflare, Inc.',
        connections: 300,
        bandwidth: 300000000,
        percentage: 30,
      }
      
      expect(asnStats.asn).toBe(13335)
      expect(asnStats.asOrganization).toBe('Cloudflare, Inc.')
    })
  })

  describe('ProtocolStats', () => {
    it('should accept valid protocol stats', () => {
      const protocolStats: ProtocolStats = {
        protocol: 'TCP',
        connections: 800,
        percentage: 80
      }
      
      expect(protocolStats.protocol).toBe('TCP')
    })
  })

  describe('TimeSeriesData', () => {
    it('should accept valid time series data', () => {
      const data: TimeSeriesData = {
        timestamp: new Date(),
        connections: 100,
        bandwidthIn: 50000000,
        bandwidthOut: 40000000
      }
      
      expect(data.connections).toBe(100)
    })

    it('should accept optional inactive field', () => {
      const data: TimeSeriesData = {
        timestamp: '2026-01-17T12:00:00Z',
        connections: 100,
        bandwidthIn: 50000000,
        bandwidthOut: 40000000,
        inactive: 5
      }

      expect(data.inactive).toBe(5)
    })
  })

  describe('DashboardFilters', () => {
    it('should accept valid dashboard filters', () => {
      const filters: DashboardFilters = {
        timeRange: '24h',
        countries: ['US', 'DE'],
        protocols: ['TCP', 'UDP'],
        status: ['active', 'inactive'],
        search: 'test'
      }
      
      expect(filters.timeRange).toBe('24h')
      expect(filters.countries).toHaveLength(2)
    })

    it('should work with minimal filters', () => {
      const filters: DashboardFilters = {
        timeRange: '1h'
      }
      
      expect(filters.timeRange).toBe('1h')
      expect(filters.countries).toBeUndefined()
    })
  })
})
