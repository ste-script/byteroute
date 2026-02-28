import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { TimeSeriesData } from '@/types'

const MockVChart = vi.hoisted(() => ({
  name: 'VChart',
  template: '<div class="mock-vchart" />',
  props: ['option', 'autoresize'],
  expose: ['chart']
}))

vi.mock('echarts/core', () => ({ use: vi.fn() }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: class {} }))
vi.mock('echarts/charts', () => ({ LineChart: class {}, BarChart: class {} }))
vi.mock('echarts/components', () => ({
  TitleComponent: class {},
  TooltipComponent: class {},
  LegendComponent: class {},
  GridComponent: class {},
  DataZoomComponent: class {}
}))
vi.mock('vue-echarts', () => ({ default: MockVChart }))

import TrafficChart from '@/components/TrafficChart.vue'

const sampleData: TimeSeriesData[] = [
  { timestamp: new Date('2026-01-01T12:00:00Z'), connections: 10, bandwidthIn: 1_000_000, bandwidthOut: 500_000 },
  { timestamp: new Date('2026-01-01T12:05:00Z'), connections: 20, bandwidthIn: 2_000_000, bandwidthOut: 1_000_000 },
]

describe('TrafficChart', () => {
  it('renders without crashing', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData },
      global: { stubs: { VChart: MockVChart } }
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.mock-vchart').exists()).toBe(true)
  })

  it('computes chart option with correct title', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData, title: 'My Chart' },
      global: { stubs: { VChart: MockVChart } }
    })
    const vChart = wrapper.findComponent(MockVChart)
    const option = vChart.props('option') as Record<string, unknown>
    expect((option.title as Record<string, unknown>).text).toBe('My Chart')
  })

  it('uses default title when not provided', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: [] },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    expect((option.title as Record<string, unknown>).text).toBe('Traffic Over Time')
  })

  it('builds x-axis timestamps from data', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    expect((option.xAxis as Record<string, unknown[]>).data).toHaveLength(2)
  })

  it('uses dark mode colors when darkMode=true', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData, darkMode: true },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const titleStyle = (option.title as Record<string, Record<string, unknown>>).textStyle
    expect(titleStyle.color).toBe('#e0e0e0')
  })

  it('uses light mode colors when darkMode=false', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData, darkMode: false },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const titleStyle = (option.title as Record<string, Record<string, unknown>>).textStyle
    expect(titleStyle.color).toBe('#333')
  })

  it('third series uses dark mode bar color when darkMode=true', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData, darkMode: true },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const series = option.series as Array<Record<string, unknown>>
    const barSeries = series[2]
    expect((barSeries.itemStyle as Record<string, unknown>).color).toContain('0.6')
  })

  it('tooltip formatter returns empty string for non-array params', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const formatter = (option.tooltip as Record<string, unknown>).formatter as Function
    expect(formatter('not-an-array')).toBe('')
  })

  it('tooltip formatter formats bandwidth series', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const formatter = (option.tooltip as Record<string, unknown>).formatter as Function

    const result = formatter([
      { axisValue: '12:00', seriesName: 'Bandwidth In', value: 1_500_000, color: '#10b981' },
      { axisValue: '12:00', seriesName: 'Connections', value: 10, color: '#8b5cf6' }
    ])
    expect(result).toContain('1.5 MB')
    expect(result).toContain('10') // connections not formatted as bandwidth
  })

  it('yAxis axisLabel formatter handles bandwidth values', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: sampleData },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    const yAxes = option.yAxis as Array<Record<string, unknown>>
    const formatter = (yAxes[0].axisLabel as Record<string, unknown>).formatter as Function
    expect(formatter(1_000_000)).toBe('1.0 MB')
    expect(formatter(1_000)).toBe('1.0 KB')
    expect(formatter(500)).toBe('500 B')
    expect(formatter(1_000_000_000)).toBe('1.0 GB')
  })

  it('handles empty data array', () => {
    const wrapper = mount(TrafficChart, {
      props: { data: [] },
      global: { stubs: { VChart: MockVChart } }
    })
    const option = wrapper.findComponent(MockVChart).props('option') as Record<string, unknown>
    expect((option.xAxis as Record<string, unknown[]>).data).toHaveLength(0)
  })
})
