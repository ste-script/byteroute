// Dashboard types - shared between backend and frontend

export interface Connection {
  id: string
  tenantId?: string
  sourceIp: string
  destIp: string
  sourcePort: number
  destPort: number
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER'
  status: 'active' | 'inactive'
  enriched?: boolean
  country?: string
  countryCode?: string
  city?: string
  latitude?: number
  longitude?: number
  asn?: number
  asOrganization?: string
  destCountry?: string
  destCountryCode?: string
  destCity?: string
  destLatitude?: number
  destLongitude?: number
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
  inactive?: number
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
  status?: ('active' | 'inactive')[]
  search?: string
}

// Socket.IO typed events for type-safe communication

export interface ServerToClientEvents {
  'tenant:new': (data: { tenantId: string }) => void
  'tenants:list': (data: { tenants: string[] }) => void
  'connection:new': (data: Connection) => void
  'connection:update': (data: Connection) => void
  'connection:remove': (data: { id: string }) => void
  'connections:batch': (data: Connection[]) => void
  'traffic:flows': (data: TrafficFlow[]) => void
  'statistics:update': (data: Statistics) => void
  'error': (data: { message: string; code?: string }) => void
}

export interface ClientToServerEvents {
  'subscribe': (data: { rooms: string[] }) => void
  'unsubscribe': (data: { rooms: string[] }) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId?: string
  tenantId?: string
  subscribedRooms?: string[]
  principal?: Record<string, unknown>
}

export * from "./auth.js";
