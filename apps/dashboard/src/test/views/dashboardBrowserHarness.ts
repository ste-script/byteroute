import '@/assets/main.scss'
import '@/assets/view-layout.scss'

import type { Component } from 'vue'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import { useDashboardStore } from '../../stores/dashboard'
import type { Connection, Statistics } from '../../types'

const mockSocket = vi.hoisted(() => ({
  disconnect: vi.fn(),
  connect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(() => () => {}),
  isConnected: { value: true },
  connectionError: { value: null },
}))

const mockConnectTenant = vi.hoisted(() => vi.fn())
const mockHandleTenantChange = vi.hoisted(() => vi.fn())
const mockCopyToken = vi.hoisted(() => vi.fn())

vi.mock('@/services/socket', () => ({
  useSocket: vi.fn(() => mockSocket),
}))

vi.mock('@/services/tenants', () => ({
  createTenant: vi.fn(),
}))

vi.mock('@/composables/useTenantManager', () => {
  const selectedTenant = ref('tenant-1')
  const discoveredTenants = ref(['tenant-1'])

  return {
    useTenantManager: () => ({
      selectedTenant,
      tenantOptions: computed(() => [{ label: 'tenant-1', value: 'tenant-1' }]),
      discoveredTenants,
      loadDiscoveredTenants: vi.fn(async () => ['tenant-1']),
      connectTenant: mockConnectTenant,
      handleTenantChange: mockHandleTenantChange,
    }),
  }
})

vi.mock('@/composables/useClientToken', () => ({
  useClientToken: () => ({
    pending: ref(false),
    message: ref<string | null>(null),
    handleCopy: mockCopyToken,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/WorldMap.vue', () => ({
  default: defineComponent({
    name: 'WorldMapStub',
    render() {
      return h('div', {
        class: 'world-map-stub',
        style: { minHeight: '100%' },
      })
    },
  }),
}))

vi.mock('@/components/TrafficChart.vue', () => ({
  default: defineComponent({
    name: 'TrafficChartStub',
    render() {
      return h('div', {
        class: 'traffic-chart-stub',
        style: { minHeight: '100%' },
      })
    },
  }),
}))

vi.mock('@/components/StatisticsPanel.vue', () => ({
  default: defineComponent({
    name: 'StatisticsPanelStub',
    props: ['statistics'],
    render() {
      const mobile = window.innerWidth <= 768

      return h(
        'div',
        {
          class: 'statistics-panel-stub',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: mobile ? '520px' : '320px',
            height: '100%',
          },
        },
        [
          h(
            'div',
            {
              class: 'statistics-summary-stub',
              style: {
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              },
            },
            [0, 1, 2].map((index) =>
              h(
                'div',
                {
                  class: 'statistics-card-stub',
                  style: {
                    minHeight: '88px',
                    border: '1px solid var(--p-surface-border)',
                    borderRadius: '12px',
                    background: 'var(--p-surface-ground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                },
                index === 0 ? String(this.statistics?.totalConnections ?? 0) : 'stub'
              )
            )
          ),
          h(
            'div',
            {
              class: 'statistics-tabs-stub',
              style: {
                display: 'flex',
                gap: '8px',
                minHeight: '44px',
              },
            },
            ['Countries', 'ASNs', 'Protocols'].map((label) =>
              h(
                'div',
                {
                  style: {
                    flex: '1 1 0',
                    border: '1px solid var(--p-surface-border)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                },
                label
              )
            )
          ),
          h('div', {
            class: 'statistics-chart-stub',
            style: {
              flex: '1 1 auto',
              minHeight: mobile ? '220px' : '140px',
              borderRadius: '12px',
              background: 'var(--p-surface-ground)',
              border: '1px solid var(--p-surface-border)',
            },
          }),
        ]
      )
    },
  }),
}))

vi.mock('@/components/DashboardHeader.vue', () => ({
  default: defineComponent({
    name: 'DashboardHeaderStub',
    render() {
      return h('header', {
        class: 'dashboard-header-stub',
        style: { height: 'var(--header-height)' },
      })
    },
  }),
}))

vi.mock('@/components/NewTenantDialog.vue', () => ({
  default: defineComponent({
    name: 'NewTenantDialogStub',
    render() {
      return h('div', { class: 'new-tenant-dialog-stub' })
    },
  }),
}))

export const sampleConnections: Connection[] = Array.from({ length: 8 }, (_, index) => ({
  id: `conn-${index + 1}`,
  tenantId: 'tenant-1',
  sourceIp: `192.168.1.${index + 1}`,
  destIp: `10.0.0.${index + 1}`,
  sourcePort: 54000 + index,
  destPort: 443,
  protocol: index % 2 === 0 ? 'TCP' : 'UDP',
  status: index % 3 === 0 ? 'inactive' : 'active',
  country: 'United States',
  countryCode: 'US',
  city: 'New York',
  latitude: 40.7128,
  longitude: -74.006,
  asn: 13335,
  asOrganization: 'Cloudflare, Inc.',
  bandwidth: 1_000_000 + index,
  startTime: new Date(Date.now() - index * 60_000).toISOString(),
  lastActivity: new Date().toISOString(),
}))

export const sampleStatistics: Statistics = {
  totalConnections: sampleConnections.length,
  activeConnections: sampleConnections.filter((connection) => connection.status === 'active').length,
  totalBandwidth: 8_000_000,
  bandwidthIn: 4_200_000,
  bandwidthOut: 3_800_000,
  byCountry: [
    {
      country: 'United States',
      countryCode: 'US',
      connections: sampleConnections.length,
      bandwidth: 8_000_000,
      percentage: 100,
    },
  ],
  byAsn: [
    {
      asn: 13335,
      asOrganization: 'Cloudflare, Inc.',
      connections: sampleConnections.length,
      bandwidth: 8_000_000,
      percentage: 100,
    },
  ],
  byProtocol: [
    {
      protocol: 'TCP',
      connections: 4,
      percentage: 50,
    },
    {
      protocol: 'UDP',
      connections: 4,
      percentage: 50,
    },
  ],
  timeSeries: [],
}

function normalizeBrowserTestDocument() {
  document.documentElement.className = ''
  document.documentElement.style.setProperty('--header-height', '60px')
  document.documentElement.style.height = 'auto'

  document.body.innerHTML = ''
  document.body.style.margin = '0'
  document.body.style.width = '100%'
  document.body.style.minHeight = '100dvh'
  document.body.style.height = 'auto'
  document.body.style.overflow = 'auto'
}

function flushPromises() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

export async function waitForLayout() {
  await flushPromises()
  await nextTick()
  if ('fonts' in document) {
    await document.fonts.ready
  }
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

export function resetDashboardBrowserHarness() {
  vi.clearAllMocks()
  normalizeBrowserTestDocument()
  window.localStorage.clear()
}

export async function mountDashboardViewForBrowser(loadDashboardView: () => Promise<Component>) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const store = useDashboardStore()
  store.setConnections(sampleConnections)
  store.setStatistics(sampleStatistics)

  const container = document.createElement('div')
  container.style.width = '100%'
  container.style.minHeight = '100dvh'
  document.body.appendChild(container)

  const dashboardView = await loadDashboardView()

  mount(dashboardView, {
    attachTo: container,
    global: {
      plugins: [pinia],
    },
  })

  await waitForLayout()

  const layoutScroller = document.querySelector('.dashboard-layout') as HTMLElement | null
  const chartsSection = document.querySelector('[aria-labelledby="timeline-title"]') as HTMLElement | null
  const connectionsSection = document.querySelector('[aria-labelledby="connections-title"]') as HTMLElement | null
  const scroller = document.querySelector('.connection-list .scroller') as HTMLElement | null

  if (!layoutScroller || !chartsSection || !connectionsSection || !scroller) {
    throw new Error('Dashboard browser harness failed to locate live-connections elements')
  }

  return {
    container,
    layoutScroller,
    chartsSection,
    connectionsSection,
    scroller,
  }
}