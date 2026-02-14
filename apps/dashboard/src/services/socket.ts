import { io, Socket } from 'socket.io-client'
import { ref, readonly } from 'vue'
import type { Connection, TrafficFlow, Statistics } from '@/types'

export interface SocketEvents {
  'tenant:new': { tenantId: string }
  'tenants:list': { tenants: string[] }
  'connection:new': Connection
  'connection:update': Connection
  'connection:remove': { id: string }
  'connections:batch': Connection[]
  'traffic:flows': TrafficFlow[]
  'statistics:update': Statistics
  'error': { message: string; code?: string }
}

class SocketService {
  private socket: Socket | null = null
  private _isConnected = ref(false)
  private _connectionError = ref<string | null>(null)
  private listeners = new Map<string, Set<(data: unknown) => void>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  get isConnected() {
    return readonly(this._isConnected)
  }

  get connectionError() {
    return readonly(this._connectionError)
  }

  connect(url?: string, tenantId?: string): void {
    if (this.socket?.connected) {
      return
    }

    const socketUrl = url || import.meta.env.VITE_SOCKET_URL || ''

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: tenantId ? { tenantId } : undefined,
      query: tenantId ? { tenantId } : undefined
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id)
      this._isConnected.value = true
      this._connectionError.value = null
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      this._isConnected.value = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
      this._connectionError.value = error.message
      this.reconnectAttempts++
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
      this._isConnected.value = true
      this._connectionError.value = null
    })

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts')
      this._connectionError.value = 'Failed to reconnect after multiple attempts'
    })

    // Forward all custom events to registered listeners
    this.socket.onAny((event: string, data: unknown) => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.forEach(callback => callback(data))
      }
    })
  }

  on<K extends keyof SocketEvents>(
    event: K,
    callback: (data: SocketEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (data: unknown) => void)
    }
  }

  off<K extends keyof SocketEvents>(
    event: K,
    callback?: (data: SocketEvents[K]) => void
  ): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback as (data: unknown) => void)
    } else {
      this.listeners.delete(event)
    }
  }

  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot emit, not connected')
      return
    }
    this.socket.emit(event, data)
  }

  subscribe(rooms: string | string[]): void {
    this.emit('subscribe', { rooms: Array.isArray(rooms) ? rooms : [rooms] })
  }

  unsubscribe(rooms: string | string[]): void {
    this.emit('unsubscribe', { rooms: Array.isArray(rooms) ? rooms : [rooms] })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this._isConnected.value = false
    }
  }

  reconnect(): void {
    this.disconnect()
    this.connect()
  }
}

// Export singleton instance
export const socketService = new SocketService()

// Composable for use in components
export function useSocket() {
  return {
    isConnected: socketService.isConnected,
    connectionError: socketService.connectionError,
    connect: (url?: string, tenantId?: string) => socketService.connect(url, tenantId),
    disconnect: () => socketService.disconnect(),
    reconnect: () => socketService.reconnect(),
    on: <K extends keyof SocketEvents>(
      event: K,
      callback: (data: SocketEvents[K]) => void
    ) => socketService.on(event, callback),
    off: <K extends keyof SocketEvents>(
      event: K,
      callback?: (data: SocketEvents[K]) => void
    ) => socketService.off(event, callback),
    emit: (event: string, data?: unknown) => socketService.emit(event, data),
    subscribe: (rooms: string | string[]) => socketService.subscribe(rooms),
    unsubscribe: (rooms: string | string[]) => socketService.unsubscribe(rooms)
  }
}
