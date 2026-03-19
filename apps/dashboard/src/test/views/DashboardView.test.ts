import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockSocket = vi.hoisted(() => ({
  listeners: new Map<string, Array<(payload: unknown) => void>>(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn((event: string, handler: (payload: unknown) => void) => {
    const current = mockSocket.listeners.get(event) ?? []
    current.push(handler)
    mockSocket.listeners.set(event, current)

    return () => {
      const next = (mockSocket.listeners.get(event) ?? []).filter((entry) => entry !== handler)
      mockSocket.listeners.set(event, next)
    }
  }),
  emitServerEvent: (event: string, payload: unknown) => {
    for (const handler of mockSocket.listeners.get(event) ?? []) {
      handler(payload)
    }
  },
  isConnected: { value: false },
  connectionError: { value: null },
}))

vi.mock('@/services/socket', () => ({
  useSocket: vi.fn(() => mockSocket),
}))

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn(async () => []),
  createTenant: vi.fn(),
}))

const hoistedMocks = vi.hoisted(() => ({
  selectedTenant: { value: 'tenant-1' },
  discoveredTenants: { value: [] as string[] },
  loadTenantsResult: [] as string[],
  connectTenant: vi.fn(),
  handleTenantChange: vi.fn(),
  handleCopyToken: vi.fn(),
}))

vi.mock('@/composables/useTenantManager', () => ({
  useTenantManager: () => ({
    selectedTenant: hoistedMocks.selectedTenant,
    tenantOptions: { value: [{ label: 'tenant-1', value: 'tenant-1' }] },
    discoveredTenants: hoistedMocks.discoveredTenants,
    loadDiscoveredTenants: vi.fn(async () => hoistedMocks.loadTenantsResult),
    connectTenant: hoistedMocks.connectTenant,
    handleTenantChange: hoistedMocks.handleTenantChange,
  }),
}))

vi.mock('@/composables/useClientToken', () => ({
  useClientToken: () => ({
    pending: { value: false },
    message: { value: null as string | null },
    handleCopy: hoistedMocks.handleCopyToken,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('DashboardView (no tenants)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSocket.listeners.clear()
    window.localStorage.clear()
    hoistedMocks.selectedTenant.value = 'tenant-1'
    hoistedMocks.discoveredTenants.value = []
    hoistedMocks.loadTenantsResult = []
  })

  it('renders the create-first-tenant empty state when the tenants API returns an empty list', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: { template: '<header />' },
          WorldMap: { template: '<div />' },
          TrafficChart: { template: '<div />' },
          StatisticsPanel: { template: '<div />' },
          ConnectionList: { template: '<div />' },
          NewTenantDialog: {
            props: ['visible'],
            template: '<div data-test="new-tenant-dialog">{{ visible ? "open" : "closed" }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Set up your first tenant')
    expect(wrapper.text()).toContain('Step 1')
    expect(wrapper.text()).toContain('Step 2')
    expect(wrapper.text()).toContain('World Traffic')
    expect(wrapper.text()).toContain('Live Connections')
    expect(wrapper.text()).toContain('Traffic Timeline')

    expect(mockSocket.connect).not.toHaveBeenCalled()
  })

  it('opens the tenant dialog from the wizard primary action', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: { template: '<header />' },
          WorldMap: { template: '<div />' },
          TrafficChart: { template: '<div />' },
          StatisticsPanel: { template: '<div />' },
          ConnectionList: { template: '<div />' },
          NewTenantDialog: {
            props: ['visible'],
            template: '<div data-test="new-tenant-dialog">{{ visible ? "open" : "closed" }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="new-tenant-dialog"]').text()).toBe('closed')

    await wrapper.get('[data-test="wizard-open-create-tenant"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="new-tenant-dialog"]').text()).toBe('open')
  })

  it('copies a client token for the selected tenant', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: {
            template: '<button type="button" data-test="copy-token" @click="$emit(\'copy-token\')">Copy</button>'
          },
          WorldMap: { template: '<div />' },
          TrafficChart: { template: '<div />' },
          StatisticsPanel: { template: '<div />' },
          ConnectionList: { template: '<div />' },
          NewTenantDialog: { template: '<div />' },
        },
      },
    })

    await wrapper.get('[data-test="copy-token"]').trigger('click')

    expect(hoistedMocks.handleCopyToken).toHaveBeenCalledWith('tenant-1')
  })
})

describe('DashboardView sample data mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSocket.listeners.clear()
    window.localStorage.clear()
    hoistedMocks.selectedTenant.value = 'tenant-1'
    hoistedMocks.discoveredTenants.value = ['tenant-1']
    hoistedMocks.loadTenantsResult = ['tenant-1']
  })

  it('uses sample data in map, statistics, and connection list until first real payload arrives', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: { template: '<header />' },
          TrafficChart: { template: '<div />' },
          NewTenantDialog: { template: '<div />' },
          WorldMap: {
            props: ['flows'],
            template: '<div data-test="world-flows">{{ flows.length }}</div>'
          },
          StatisticsPanel: {
            props: ['statistics'],
            template: '<div data-test="stats-total">{{ statistics?.totalConnections }}</div>'
          },
          ConnectionList: {
            props: ['connections'],
            template: '<div data-test="connections-count">{{ connections.length }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text().toLowerCase()).toContain('sample data')
    expect(wrapper.get('[data-test="world-flows"]').text()).toBe('2')
    expect(wrapper.get('[data-test="stats-total"]').text()).toBe('186')
    expect(wrapper.get('[data-test="connections-count"]').text()).toBe('3')

    mockSocket.emitServerEvent('traffic:flows', [
      {
        id: 'real-flow-1',
        source: { lat: 1, lng: 2 },
        target: { lat: 3, lng: 4 },
        value: 9000
      }
    ])
    mockSocket.emitServerEvent('statistics:update', {
      totalConnections: 1,
      activeConnections: 1,
      totalBandwidth: 500,
      bandwidthIn: 250,
      bandwidthOut: 250,
      byCountry: [],
      byAsn: [],
      byProtocol: [],
      timeSeries: []
    })
    mockSocket.emitServerEvent('connections:batch', [
      {
        id: 'real-conn-1',
        sourceIp: '10.0.0.1',
        destIp: '10.0.0.2',
        sourcePort: 55000,
        destPort: 443,
        protocol: 'TCP',
        status: 'active',
        startTime: '2026-03-19T00:00:00.000Z',
        lastActivity: '2026-03-19T00:01:00.000Z'
      }
    ])

    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="world-flows"]').text()).toBe('1')
    expect(wrapper.get('[data-test="stats-total"]').text()).toBe('1')
    expect(wrapper.get('[data-test="connections-count"]').text()).toBe('1')
  })

  it('keeps showing sample data when initial tenant payloads are empty', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: { template: '<header />' },
          TrafficChart: { template: '<div />' },
          NewTenantDialog: { template: '<div />' },
          WorldMap: {
            props: ['flows'],
            template: '<div data-test="world-flows">{{ flows.length }}</div>'
          },
          StatisticsPanel: {
            props: ['statistics'],
            template: '<div data-test="stats-total">{{ statistics?.totalConnections }}</div>'
          },
          ConnectionList: {
            props: ['connections'],
            template: '<div data-test="connections-count">{{ connections.length }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    mockSocket.emitServerEvent('traffic:flows', [])
    mockSocket.emitServerEvent('statistics:update', {
      totalConnections: 0,
      activeConnections: 0,
      totalBandwidth: 0,
      bandwidthIn: 0,
      bandwidthOut: 0,
      byCountry: [],
      byAsn: [],
      byProtocol: [],
      timeSeries: []
    })
    mockSocket.emitServerEvent('connections:batch', [])

    await wrapper.vm.$nextTick()

    expect(wrapper.text().toLowerCase()).toContain('sample data')
    expect(wrapper.get('[data-test="world-flows"]').text()).toBe('2')
    expect(wrapper.get('[data-test="stats-total"]').text()).toBe('186')
    expect(wrapper.get('[data-test="connections-count"]').text()).toBe('3')
  })
})
