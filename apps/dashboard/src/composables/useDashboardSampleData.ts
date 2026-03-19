import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { Connection, TrafficFlow, Statistics } from '@/types'

const sampleConnections: Connection[] = [
  {
    id: 'sample-conn-1',
    sourceIp: '203.0.113.42',
    destIp: '192.0.2.80',
    sourcePort: 51514,
    destPort: 443,
    protocol: 'TCP',
    status: 'active',
    country: 'United States',
    countryCode: 'US',
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.006,
    asn: 13335,
    asOrganization: 'Cloudflare, Inc.',
    bandwidth: 38_000,
    bytesIn: 120_000,
    bytesOut: 95_000,
    packetsIn: 540,
    packetsOut: 488,
    startTime: '2026-03-19T15:30:00.000Z',
    lastActivity: '2026-03-19T15:34:00.000Z',
    duration: 240_000,
  },
  {
    id: 'sample-conn-2',
    sourceIp: '198.51.100.15',
    destIp: '192.0.2.22',
    sourcePort: 61102,
    destPort: 443,
    protocol: 'UDP',
    status: 'active',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Frankfurt',
    latitude: 50.1109,
    longitude: 8.6821,
    asn: 15169,
    asOrganization: 'Google LLC',
    bandwidth: 27_000,
    bytesIn: 88_000,
    bytesOut: 101_000,
    packetsIn: 382,
    packetsOut: 430,
    startTime: '2026-03-19T15:31:00.000Z',
    lastActivity: '2026-03-19T15:34:10.000Z',
    duration: 190_000,
  },
  {
    id: 'sample-conn-3',
    sourceIp: '203.0.113.88',
    destIp: '192.0.2.199',
    sourcePort: 49201,
    destPort: 80,
    protocol: 'TCP',
    status: 'inactive',
    country: 'Japan',
    countryCode: 'JP',
    city: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    asn: 2516,
    asOrganization: 'KDDI CORPORATION',
    bandwidth: 12_000,
    bytesIn: 33_000,
    bytesOut: 27_000,
    packetsIn: 201,
    packetsOut: 163,
    startTime: '2026-03-19T15:32:00.000Z',
    lastActivity: '2026-03-19T15:33:25.000Z',
    duration: 85_000,
  },
]

const sampleFlows: TrafficFlow[] = [
  {
    id: 'sample-flow-1',
    source: { lat: 40.7128, lng: -74.006, country: 'United States', city: 'New York' },
    target: { lat: 50.1109, lng: 8.6821, country: 'Germany', city: 'Frankfurt' },
    value: 38_000,
    animated: true,
  },
  {
    id: 'sample-flow-2',
    source: { lat: 35.6762, lng: 139.6503, country: 'Japan', city: 'Tokyo' },
    target: { lat: 1.3521, lng: 103.8198, country: 'Singapore', city: 'Singapore' },
    value: 27_000,
    animated: true,
  },
]

const sampleStatistics: Statistics = {
  totalConnections: 186,
  activeConnections: 141,
  totalBandwidth: 2_480_000,
  bandwidthIn: 1_210_000,
  bandwidthOut: 1_270_000,
  byCountry: [
    { country: 'United States', countryCode: 'US', connections: 56, bandwidth: 720_000, percentage: 30.1 },
    { country: 'Germany', countryCode: 'DE', connections: 43, bandwidth: 530_000, percentage: 23.1 },
    { country: 'Japan', countryCode: 'JP', connections: 32, bandwidth: 410_000, percentage: 17.2 },
  ],
  byAsn: [
    { asn: 13335, asOrganization: 'Cloudflare, Inc.', connections: 51, bandwidth: 680_000, percentage: 27.4 },
    { asn: 15169, asOrganization: 'Google LLC', connections: 38, bandwidth: 470_000, percentage: 20.4 },
    { asn: 8075, asOrganization: 'Microsoft Corporation', connections: 25, bandwidth: 320_000, percentage: 13.4 },
  ],
  byProtocol: [
    { protocol: 'TCP', connections: 98, percentage: 52.7 },
    { protocol: 'UDP', connections: 62, percentage: 33.3 },
    { protocol: 'ICMP', connections: 26, percentage: 14.0 },
  ],
  timeSeries: [],
}

function hasMeaningfulStatistics(stats: Statistics): boolean {
  return (
    stats.totalConnections > 0 ||
    stats.activeConnections > 0 ||
    stats.totalBandwidth > 0 ||
    stats.timeSeries.length > 0 ||
    stats.byCountry.length > 0 ||
    stats.byAsn.length > 0 ||
    stats.byProtocol.length > 0
  )
}

interface UseDashboardSampleDataArgs {
  connectionLimit: Ref<5 | 10 | 20>
  limitedConnections: ComputedRef<Connection[]>
  trafficFlows: Ref<TrafficFlow[]>
  statistics: Ref<Statistics | null>
}

export function useDashboardSampleData({
  connectionLimit,
  limitedConnections,
  trafficFlows,
  statistics,
}: UseDashboardSampleDataArgs) {
  const hasReceivedRealConnections = ref(false)
  const hasReceivedRealFlows = ref(false)
  const hasReceivedRealStatistics = ref(false)

  const usingSampleConnections = computed(() => !hasReceivedRealConnections.value)
  const usingSampleFlows = computed(() => !hasReceivedRealFlows.value)
  const usingSampleStatistics = computed(() => !hasReceivedRealStatistics.value)

  const displayConnections = computed(() =>
    usingSampleConnections.value
      ? sampleConnections.slice(0, connectionLimit.value)
      : limitedConnections.value
  )

  const displayStatistics = computed(() =>
    usingSampleStatistics.value ? sampleStatistics : statistics.value
  )

  const displayFlows = computed(() =>
    usingSampleFlows.value ? sampleFlows : trafficFlows.value
  )

  function markConnectionsFromItem(): void {
    hasReceivedRealConnections.value = true
  }

  function markConnectionsFromBatch(conns: Connection[]): void {
    if (conns.length > 0) {
      hasReceivedRealConnections.value = true
    }
  }

  function markFlows(flows: TrafficFlow[]): void {
    if (flows.length > 0) {
      hasReceivedRealFlows.value = true
    }
  }

  function markStatistics(stats: Statistics): void {
    if (hasMeaningfulStatistics(stats)) {
      hasReceivedRealStatistics.value = true
    }
  }

  function reset(): void {
    hasReceivedRealConnections.value = false
    hasReceivedRealFlows.value = false
    hasReceivedRealStatistics.value = false
  }

  return {
    usingSampleConnections,
    usingSampleFlows,
    usingSampleStatistics,
    displayConnections,
    displayStatistics,
    displayFlows,
    markConnectionsFromItem,
    markConnectionsFromBatch,
    markFlows,
    markStatistics,
    reset,
  }
}
