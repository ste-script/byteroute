export interface Connection {
  id: string
  sourceIp: string
  destIp: string
  sourcePort: number
  destPort: number
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER'
  status: 'active' | 'inactive' | 'blocked'
  country?: string
  countryCode?: string
  city?: string
  latitude?: number
  longitude?: number
  category?: string
  bandwidth?: number
  bytesIn?: number
  bytesOut?: number
  packetsIn?: number
  packetsOut?: number
  startTime: Date | string
  lastActivity: Date | string
  duration?: number
}

export interface TrafficFlow {
  id: string
  source: {
    lat: number
    lng: number
    country?: string
    city?: string
  }
  target: {
    lat: number
    lng: number
    country?: string
    city?: string
  }
  value: number
  color?: [number, number, number, number]
  animated?: boolean
}

export interface Statistics {
  totalConnections: number
  activeConnections: number
  blockedConnections: number
  totalBandwidth: number
  bandwidthIn: number
  bandwidthOut: number
  byCountry: CountryStats[]
  byCategory: CategoryStats[]
  byProtocol: ProtocolStats[]
  timeSeries: TimeSeriesData[]
}

export interface CountryStats {
  country: string
  countryCode: string
  connections: number
  bandwidth: number
  percentage: number
}

export interface CategoryStats {
  category: string
  connections: number
  bandwidth: number
  percentage: number
  color?: string
}

export interface ProtocolStats {
  protocol: string
  connections: number
  percentage: number
}

export interface TimeSeriesData {
  timestamp: Date | string
  connections: number
  bandwidthIn: number
  bandwidthOut: number
  blocked?: number
}

export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
}

export interface SocketMessage<T = unknown> {
  event: string
  data: T
  timestamp: Date | string
}

export interface DashboardFilters {
  timeRange: '1h' | '6h' | '24h' | '7d'
  countries?: string[]
  categories?: string[]
  protocols?: string[]
  status?: ('active' | 'inactive' | 'blocked')[]
  search?: string
}
