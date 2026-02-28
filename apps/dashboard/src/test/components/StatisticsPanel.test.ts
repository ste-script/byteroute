import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Statistics } from '@/types'

const MockVChart = vi.hoisted(() => ({
  name: 'VChart',
  template: '<div class="mock-vchart" :data-id="$attrs.id" />',
  props: ['option', 'autoresize']
}))

vi.mock('echarts/core', () => ({ use: vi.fn() }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: class {} }))
vi.mock('echarts/charts', () => ({ PieChart: class {}, BarChart: class {} }))
vi.mock('echarts/components', () => ({
  TitleComponent: class {},
  TooltipComponent: class {},
  LegendComponent: class {},
  GridComponent: class {}
}))
vi.mock('vue-echarts', () => ({ default: MockVChart }))

import StatisticsPanel from '@/components/StatisticsPanel.vue'

const mockStats: Statistics = {
  totalConnections: 1000,
  activeConnections: 800,
  totalBandwidth: 1_000_000_000,
  bandwidthIn: 600_000_000,
  bandwidthOut: 400_000_000,
  byCountry: [{ country: 'US', countryCode: 'US', connections: 500, bandwidth: 500_000_000, percentage: 50 }],
  byAsn: [{ asn: 13335, asOrganization: 'Cloudflare', connections: 400, bandwidth: 400_000_000, percentage: 40 }],
  byProtocol: [{ protocol: 'TCP', connections: 800, percentage: 80 }],
  timeSeries: []
}

describe('StatisticsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing', () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: null },
      global: { stubs: { VChart: MockVChart } }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows 0 stats when statistics is null', () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: null },
      global: { stubs: { VChart: MockVChart } }
    })
    expect(wrapper.text()).toContain('0')
  })

  it('displays total connections from statistics', () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    expect(wrapper.text()).toContain('1.0K') // formatNumber(1000)
  })

  it('renders tab buttons for country, asn, protocol', () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBeGreaterThanOrEqual(3)
  })

  it('switches to ASN chart when ASN tab is clicked', async () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    const asnTab = wrapper.find('#stats-tab-asn')
    await asnTab.trigger('click')
    expect(wrapper.find('#stats-panel-asn').exists()).toBe(true)
  })

  it('switches to Protocol chart when Protocol tab is clicked', async () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    const protocolTab = wrapper.find('#stats-tab-protocol')
    await protocolTab.trigger('click')
    expect(wrapper.find('#stats-panel-protocol').exists()).toBe(true)
  })

  it('handles keydown navigation on tabs', async () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    const firstTab = wrapper.find('#stats-tab-country')
    await firstTab.trigger('keydown', { key: 'ArrowRight' })
    // After ArrowRight, ASN tab should be active
    expect(wrapper.find('#stats-panel-asn').exists()).toBe(true)
  })

  it('displays bandwidth using formatBytes', () => {
    const wrapper = mount(StatisticsPanel, {
      props: { statistics: mockStats },
      global: { stubs: { VChart: MockVChart } }
    })
    expect(wrapper.text()).toContain('1.0 GB') // formatBytes(1_000_000_000)
  })
})
