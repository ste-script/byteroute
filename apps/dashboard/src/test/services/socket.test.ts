import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { socketService, useSocket } from '@/services/socket'

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    id: 'mock-socket-id',
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    onAny: vi.fn()
  }))
}))

describe('Socket Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    socketService.disconnect()
  })

  describe('useSocket composable', () => {
    it('should return socket methods', () => {
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

  describe('event handling', () => {
    it('should register event listeners', () => {
      const socket = useSocket()
      const callback = vi.fn()
      
      const unsubscribe = socket.on('connection:new', callback)
      
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return unsubscribe function', () => {
      const socket = useSocket()
      const callback = vi.fn()
      
      const unsubscribe = socket.on('connection:new', callback)
      unsubscribe()
      
      // Should not throw
      expect(true).toBe(true)
    })
  })
})
