import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { socketService, useSocket } from '@/services/socket'

// Captured socket event handlers so we can trigger them in tests
type SocketHandlers = Record<string, (...args: unknown[]) => void>
let socketHandlers: SocketHandlers = {}
let onAnyHandler: ((event: string, data: unknown) => void) | null = null

const mockSocketInstance = {
  connected: false,
  id: 'mock-socket-id',
  on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    socketHandlers[event] = cb
  }),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  onAny: vi.fn((cb: (event: string, data: unknown) => void) => {
    onAnyHandler = cb
  })
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance)
}))

describe('Socket Service', () => {
  beforeEach(() => {
    socketHandlers = {}
    onAnyHandler = null
    vi.clearAllMocks()
    // Re-bind handlers since clearAllMocks clears their implementations
    mockSocketInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      socketHandlers[event] = cb
    })
    mockSocketInstance.onAny.mockImplementation((cb: (event: string, data: unknown) => void) => {
      onAnyHandler = cb
    })
  })

  afterEach(() => {
    socketService.disconnect()
  })

  describe('useSocket composable', () => {
    it('should return all expected methods', () => {
      const socket = useSocket()

      expect(socket).toHaveProperty('isConnected')
      expect(socket).toHaveProperty('connectionError')
      expect(socket).toHaveProperty('connect')
      expect(socket).toHaveProperty('disconnect')
      expect(socket).toHaveProperty('reconnect')
      expect(socket).toHaveProperty('on')
      expect(socket).toHaveProperty('off')
      expect(socket).toHaveProperty('emit')
      expect(socket).toHaveProperty('subscribe')
      expect(socket).toHaveProperty('unsubscribe')
    })

    it('should start disconnected', () => {
      const socket = useSocket()
      expect(socket.isConnected.value).toBe(false)
    })

    it('should have no connection error initially', () => {
      const socket = useSocket()
      expect(socket.connectionError.value).toBeNull()
    })
  })

  describe('connect', () => {
    it('creates a socket and sets up event handlers', () => {
      socketService.connect('http://localhost:3000', 'tenant-1', 'token-abc')
      expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocketInstance.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
      expect(mockSocketInstance.onAny).toHaveBeenCalled()
    })

    it('does not reconnect if socket is already connected', () => {
      socketService.connect() // initializes this.socket = mockSocketInstance
      mockSocketInstance.connected = true // simulate an established connection
      vi.clearAllMocks() // reset call counts
      mockSocketInstance.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        socketHandlers[event] = cb
      })
      socketService.connect() // should be a no-op
      expect(mockSocketInstance.on).toHaveBeenCalledTimes(0)
      mockSocketInstance.connected = false
    })

    it('connect handler sets isConnected to true and clears error', () => {
      socketService.connect()
      socketHandlers['connect']?.()
      expect(socketService.isConnected.value).toBe(true)
      expect(socketService.connectionError.value).toBeNull()
    })

    it('disconnect handler sets isConnected to false', () => {
      socketService.connect()
      socketHandlers['connect']?.()
      socketHandlers['disconnect']?.('transport close')
      expect(socketService.isConnected.value).toBe(false)
    })

    it('connect_error handler sets connectionError', () => {
      socketService.connect()
      socketHandlers['connect_error']?.(new Error('ECONNREFUSED'))
      expect(socketService.connectionError.value).toBe('ECONNREFUSED')
    })

    it('reconnect handler sets isConnected to true', () => {
      socketService.connect()
      socketHandlers['reconnect']?.(3)
      expect(socketService.isConnected.value).toBe(true)
      expect(socketService.connectionError.value).toBeNull()
    })

    it('reconnect_failed handler sets connectionError', () => {
      socketService.connect()
      socketHandlers['reconnect_failed']?.()
      expect(socketService.connectionError.value).toBe('Failed to reconnect after multiple attempts')
    })
  })

  describe('onAny – event forwarding', () => {
    it('forwards events to registered listeners', () => {
      socketService.connect()

      const callback = vi.fn()
      socketService.on('connection:new', callback)

      const payload = { id: 'c1' }
      onAnyHandler?.('connection:new', payload)

      expect(callback).toHaveBeenCalledWith(payload)
    })

    it('does nothing for events with no listeners', () => {
      socketService.connect()
      expect(() => onAnyHandler?.('no:listener', {})).not.toThrow()
    })
  })

  describe('on / off', () => {
    it('should register event listeners and return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = socketService.on('connection:new', callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe removes the specific listener', () => {
      socketService.connect()
      const callback = vi.fn()
      const unsubscribe = socketService.on('connection:new', callback)
      unsubscribe()

      onAnyHandler?.('connection:new', {})
      expect(callback).not.toHaveBeenCalled()
    })

    it('off() with callback removes that listener', () => {
      socketService.connect()
      const callback = vi.fn()
      socketService.on('connection:new', callback)
      socketService.off('connection:new', callback)

      onAnyHandler?.('connection:new', {})
      expect(callback).not.toHaveBeenCalled()
    })

    it('off() without callback removes all listeners for event', () => {
      socketService.connect()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      socketService.on('connection:new', cb1)
      socketService.on('connection:new', cb2)
      socketService.off('connection:new')

      onAnyHandler?.('connection:new', {})
      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()
    })
  })

  describe('emit', () => {
    it('emits an event on the underlying socket', () => {
      socketService.connect()
      socketService.emit('subscribe', { rooms: ['connections'] })
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('subscribe', { rooms: ['connections'] })
    })

    it('warns and does nothing when socket is not initialized', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // socketService was just disconnected in afterEach, so socket is null
      socketService.emit('test:event')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot emit'))
      warnSpy.mockRestore()
    })
  })

  describe('subscribe / unsubscribe', () => {
    it('subscribe emits with single room as an array', () => {
      socketService.connect()
      socketService.subscribe('connections')
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('subscribe', { rooms: ['connections'] })
    })

    it('subscribe emits with multiple rooms', () => {
      socketService.connect()
      socketService.subscribe(['connections', 'statistics'])
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('subscribe', { rooms: ['connections', 'statistics'] })
    })

    it('unsubscribe emits with single room as an array', () => {
      socketService.connect()
      socketService.unsubscribe('connections')
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('unsubscribe', { rooms: ['connections'] })
    })

    it('unsubscribe emits with multiple rooms', () => {
      socketService.connect()
      socketService.unsubscribe(['connections', 'flows'])
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('unsubscribe', { rooms: ['connections', 'flows'] })
    })
  })

  describe('disconnect / reconnect', () => {
    it('disconnect sets isConnected to false and clears socket', () => {
      socketService.connect()
      socketHandlers['connect']?.()
      expect(socketService.isConnected.value).toBe(true)

      socketService.disconnect()
      expect(socketService.isConnected.value).toBe(false)
    })

    it('disconnect is a no-op when socket is null', () => {
      expect(() => socketService.disconnect()).not.toThrow()
    })

    it('reconnect disconnects and reconnects', () => {
      socketService.reconnect()
      expect(mockSocketInstance.on).toHaveBeenCalled()
    })
  })

  describe('useSocket composable wrappers', () => {
    it('connect wrapper calls socketService.connect', () => {
      const socket = useSocket()
      socket.connect('http://localhost', 'tenant-1', 'token')
      expect(mockSocketInstance.on).toHaveBeenCalled()
    })

    it('disconnect wrapper calls socketService.disconnect', () => {
      const socket = useSocket()
      socket.connect()
      socket.disconnect()
      expect(socketService.isConnected.value).toBe(false)
    })

    it('reconnect wrapper calls socketService.reconnect', () => {
      const socket = useSocket()
      socket.reconnect()
      expect(mockSocketInstance.on).toHaveBeenCalled()
    })

    it('on wrapper registers a listener and returns unsubscribe', () => {
      const socket = useSocket()
      socket.connect()
      const cb = vi.fn()
      const unsub = socket.on('connection:new', cb)

      onAnyHandler?.('connection:new', { id: 'x' })
      expect(cb).toHaveBeenCalledWith({ id: 'x' })

      unsub()
      onAnyHandler?.('connection:new', { id: 'y' })
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('off wrapper removes a specific listener', () => {
      const socket = useSocket()
      socket.connect()
      const cb = vi.fn()
      socket.on('connection:new', cb)
      socket.off('connection:new', cb)

      onAnyHandler?.('connection:new', {})
      expect(cb).not.toHaveBeenCalled()
    })

    it('emit wrapper delegates to socketService.emit', () => {
      const socket = useSocket()
      socket.connect()
      socket.emit('ping', { ts: 1 })
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('ping', { ts: 1 })
    })

    it('subscribe wrapper delegates to socketService.subscribe', () => {
      const socket = useSocket()
      socket.connect()
      socket.subscribe('connections')
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('subscribe', { rooms: ['connections'] })
    })

    it('unsubscribe wrapper delegates to socketService.unsubscribe', () => {
      const socket = useSocket()
      socket.connect()
      socket.unsubscribe('flows')
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('unsubscribe', { rooms: ['flows'] })
    })
  })
})
