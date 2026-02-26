import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleConnection } from '../../src/controllers/socket.controller.js'
import type { TypedSocket } from '../../src/controllers/socket.controller.js'
import type { TypedSocketServer } from '../../src/services/connections.js'

// Mock the connections service
vi.mock('../../src/services/connections.js', () => ({
  getConnectionsForTenant: vi.fn(() => []),
  emitStatisticsUpdate: vi.fn(),
  emitTrafficFlows: vi.fn()
}))

import {
  getConnectionsForTenant,
  emitStatisticsUpdate,
  emitTrafficFlows
} from '../../src/services/connections.js'

const createMockSocket = (): TypedSocket => {
  const socket: any = {
    id: 'test-socket-id',
    data: {},
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined)
  }
  return socket
}

const createMockIo = (): TypedSocketServer => {
  const io: any = {
    emit: vi.fn()
  }
  return io
}

describe('Socket Controller', () => {
  let mockIo: TypedSocketServer
  let mockSocket: TypedSocket
  let consoleLog: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockIo = createMockIo()
    mockSocket = createMockSocket()
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLog.mockRestore()
  })

  describe('handleConnection', () => {
    it('should log client connection', () => {
      handleConnection(mockIo, mockSocket)

      expect(consoleLog).toHaveBeenCalledWith('Client connected: test-socket-id')
    })

    it('should initialize socket data', () => {
      handleConnection(mockIo, mockSocket)

      expect(mockSocket.data.subscribedRooms).toEqual([])
    })

    it('should send initial tenants list only', () => {
      mockSocket.data.principal = { tenantIds: ['default', 'tenant-acme'] }

      handleConnection(mockIo, mockSocket)

      expect(mockSocket.emit).toHaveBeenCalledWith('tenants:list', {
        tenants: ['default', 'tenant-acme']
      })

      // Optimized behavior: initial payloads are sent on subscribe, not on connect.
      expect(getConnectionsForTenant).not.toHaveBeenCalled()
      expect(emitStatisticsUpdate).not.toHaveBeenCalled()
      expect(emitTrafficFlows).not.toHaveBeenCalled()
    })

    it('should register event handlers', () => {
      handleConnection(mockIo, mockSocket)

      expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })

    it('should handle subscribe event', () => {
      const mockConnections = [
        { id: 'conn1', sourceIp: '1.2.3.4' },
        { id: 'conn2', sourceIp: '5.6.7.8' }
      ]
      vi.mocked(getConnectionsForTenant).mockReturnValue(mockConnections as any)

      handleConnection(mockIo, mockSocket)

      // Get the subscribe handler
      const subscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1]

      expect(subscribeHandler).toBeDefined()

      // Call the subscribe handler
      subscribeHandler?.({ rooms: ['connections', 'statistics', 'flows'] } as any)

      expect(mockSocket.join).toHaveBeenCalledWith('tenant:default:connections')
      expect(mockSocket.join).toHaveBeenCalledWith('tenant:default:statistics')
      expect(mockSocket.join).toHaveBeenCalledWith('tenant:default:flows')
      expect(mockSocket.data.subscribedRooms).toEqual(['connections', 'statistics', 'flows'])

      expect(getConnectionsForTenant).toHaveBeenCalledWith('default', 10)
      expect(mockSocket.emit).toHaveBeenCalledWith('connections:batch', mockConnections)
      expect(emitStatisticsUpdate).toHaveBeenCalledWith(mockIo, 'default')
      expect(emitTrafficFlows).toHaveBeenCalledWith(mockIo, 'default')

      expect(consoleLog).toHaveBeenCalledWith(
        'Client test-socket-id subscribed to: connections, statistics, flows'
      )
    })

    it('should handle unsubscribe event', () => {
      handleConnection(mockIo, mockSocket)

      // Setup initial subscriptions
      mockSocket.data.subscribedRooms = ['connections', 'statistics', 'flows']

      // Get the unsubscribe handler
      const unsubscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'unsubscribe'
      )?.[1]

      expect(unsubscribeHandler).toBeDefined()

      // Call the unsubscribe handler
      unsubscribeHandler?.({ rooms: ['connections', 'flows'] } as any)

      expect(mockSocket.leave).toHaveBeenCalledWith('tenant:default:connections')
      expect(mockSocket.leave).toHaveBeenCalledWith('tenant:default:flows')
      expect(mockSocket.data.subscribedRooms).toEqual(['statistics'])
      expect(consoleLog).toHaveBeenCalledWith(
        'Client test-socket-id unsubscribed from: connections, flows'
      )
    })

    it('should handle unsubscribe with no subscribed rooms', () => {
      handleConnection(mockIo, mockSocket)

      // Don't set subscribedRooms (undefined)
      delete mockSocket.data.subscribedRooms

      // Get the unsubscribe handler
      const unsubscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'unsubscribe'
      )?.[1]

      // Should not throw
      expect(() => {
        unsubscribeHandler?.({ rooms: ['connections'] } as any)
      }).not.toThrow()

      expect(mockSocket.leave).toHaveBeenCalledWith('tenant:default:connections')
    })

    it('should handle disconnect event', () => {
      handleConnection(mockIo, mockSocket)

      // Get the disconnect handler
      const disconnectHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]

      expect(disconnectHandler).toBeDefined()

      // Call the disconnect handler
      disconnectHandler?.('client namespace disconnect' as any)

      expect(consoleLog).toHaveBeenCalledWith(
        'Client disconnected: test-socket-id (client namespace disconnect)'
      )
    })

    it('should handle multiple subscribe events', () => {
      handleConnection(mockIo, mockSocket)

      const subscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1]

      // First subscription
      subscribeHandler?.({ rooms: ['connections'] } as any)
      expect(mockSocket.data.subscribedRooms).toEqual(['connections'])

      // Second subscription
      subscribeHandler?.({ rooms: ['statistics', 'flows'] } as any)
      expect(mockSocket.data.subscribedRooms).toEqual(['connections', 'statistics', 'flows'])
    })

    it('should send empty array if no connections', () => {
      vi.mocked(getConnectionsForTenant).mockReturnValue([])

      handleConnection(mockIo, mockSocket)
      const subscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1]
      subscribeHandler?.({ rooms: ['connections'] } as any)

      expect(mockSocket.emit).toHaveBeenCalledWith('connections:batch', [])
    })

    it('should use explicit tenant from handshake auth', () => {
      ;(mockSocket as any).handshake = { auth: { tenantId: 'tenant-acme' } }

      handleConnection(mockIo, mockSocket)

      expect(mockSocket.data.tenantId).toBe('tenant-acme')
      expect(mockSocket.join).toHaveBeenCalledWith('tenant:tenant-acme')

      const subscribeHandler = vi.mocked(mockSocket.on).mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1]
      subscribeHandler?.({ rooms: ['connections'] } as any)

      expect(mockSocket.join).toHaveBeenCalledWith('tenant:tenant-acme:connections')
      expect(getConnectionsForTenant).toHaveBeenCalledWith('tenant-acme', 10)
    })
  })
})
