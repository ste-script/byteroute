import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useStatisticsCharts } from '@/composables/useStatisticsCharts'
import type { Statistics } from '@/types'

function makeStats(overrides: Partial<Statistics> = {}): Statistics {
  return {
    totalConnections: 100,
    activeConnections: 80,
    totalBandwidth: 1_000_000,
    bandwidthIn: 600_000,
    bandwidthOut: 400_000,
    byCountry: [
      { country: 'United States', countryCode: 'US', connections: 50, bandwidth: 500_000, percentage: 50 },
      { country: 'Germany', countryCode: 'DE', connections: 30, bandwidth: 300_000, percentage: 30 },
    ],
    byAsn: [
      { asn: 13335, asOrganization: 'Cloudflare', connections: 40, bandwidth: 400_000, percentage: 40 },
      { asn: 15169, asOrganization: 'Google LLC', connections: 30, bandwidth: 300_000, percentage: 30 },
    ],
    byProtocol: [
      { protocol: 'TCP', connections: 70, percentage: 70 },
      { protocol: 'UDP', connections: 30, percentage: 30 },
    ],
    timeSeries: [],
    ...overrides,
  }
}

describe('useStatisticsCharts', () => {
  describe('countryChartOption', () => {
    it('returns a valid chart option with country data', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      const opt = countryChartOption.value
      expect(opt.title.text).toBe('Top Countries')
      expect(opt.series[0].data).toHaveLength(2)
      expect(opt.yAxis.data).toHaveLength(2)
    })

    it('handles null statistics gracefully', () => {
      const stats = ref<Statistics | null>(null)
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      const opt = countryChartOption.value
      expect(opt.series[0].data).toHaveLength(0)
    })

    it('uses dark mode split line color', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(true)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      expect(countryChartOption.value.xAxis.splitLine.lineStyle.color).toBe('#333')
    })

    it('uses light mode split line color', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      expect(countryChartOption.value.xAxis.splitLine.lineStyle.color).toBe('#e0e0e0')
    })

    it('invokes the tooltip formatter with country data', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      const formatter = countryChartOption.value.tooltip.formatter as Function
      const result = formatter([{ name: 'US', value: 50, dataIndex: 0 }])
      expect(result).toContain('United States')
      expect(result).toContain('50')
    })

    it('invokes the tooltip formatter with missing country data', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      const formatter = countryChartOption.value.tooltip.formatter as Function
      // dataIndex beyond the data length → undefined country
      const result = formatter([{ name: 'XX', value: 5, dataIndex: 99 }])
      expect(result).toContain('XX')
    })

    it('invokes the item color function', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      const colorFn = countryChartOption.value.series[0].itemStyle.color as Function
      const color = colorFn({ dataIndex: 0 })
      expect(color).toMatch(/^#/)
      // Color wraps around
      const colorWrapped = colorFn({ dataIndex: 99 })
      expect(colorWrapped).toMatch(/^#/)
    })

    it('limits to 10 countries', () => {
      const manyCountries = Array.from({ length: 15 }, (_, i) => ({
        country: `Country ${i}`, countryCode: `C${i}`, connections: i, bandwidth: i * 1000, percentage: i
      }))
      const stats = ref<Statistics | null>(makeStats({ byCountry: manyCountries }))
      const dark = ref(false)
      const { countryChartOption } = useStatisticsCharts(stats, dark)

      expect(countryChartOption.value.series[0].data).toHaveLength(10)
    })
  })

  describe('asnChartOption', () => {
    it('returns a valid chart option with ASN data', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      const opt = asnChartOption.value
      expect(opt.title.text).toBe('Top ASNs')
      expect(opt.series[0].data).toHaveLength(2)
    })

    it('handles null statistics gracefully', () => {
      const stats = ref<Statistics | null>(null)
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      expect(asnChartOption.value.series[0].data).toHaveLength(0)
    })

    it('sorts ASNs by connections descending', () => {
      const stats = ref<Statistics | null>(makeStats({
        byAsn: [
          { asn: 1, asOrganization: 'Small', connections: 10, bandwidth: 1000, percentage: 10 },
          { asn: 2, asOrganization: 'Large', connections: 90, bandwidth: 9000, percentage: 90 },
        ]
      }))
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      // Reversed in the yAxis data (largest last because chart renders bottom-to-top)
      const yData = asnChartOption.value.yAxis.data as string[]
      expect(yData[yData.length - 1]).toBe('Large')
    })

    it('tooltip formatter shows ASN org and connections', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      const formatter = asnChartOption.value.tooltip.formatter as Function
      const result = formatter([{ name: 'AS13335', value: 40, dataIndex: 0 }])
      expect(result).toContain('Cloudflare')
    })

    it('tooltip formatter handles ASN without organization', () => {
      const stats = ref<Statistics | null>(makeStats({
        byAsn: [{ asn: 99999, asOrganization: undefined as unknown as string, connections: 5, bandwidth: 500, percentage: 5 }]
      }))
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      const formatter = asnChartOption.value.tooltip.formatter as Function
      const result = formatter([{ name: 'AS99999', value: 5, dataIndex: 0 }])
      expect(result).toContain('AS99999')
    })

    it('tooltip formatter handles missing dataIndex', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { asnChartOption } = useStatisticsCharts(stats, dark)

      const formatter = asnChartOption.value.tooltip.formatter as Function
      const result = formatter([{ name: 'AS0', value: 99, dataIndex: 99 }])
      expect(typeof result).toBe('string')
    })
  })

  describe('protocolChartOption', () => {
    it('returns a valid pie chart option with protocol data', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      const opt = protocolChartOption.value
      expect(opt.title.text).toBe('By Protocol')
      expect(opt.series[0].data).toHaveLength(2)
      expect(opt.series[0].data[0].name).toBe('TCP')
    })

    it('handles null statistics gracefully', () => {
      const stats = ref<Statistics | null>(null)
      const dark = ref(false)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      expect(protocolChartOption.value.series[0].data).toHaveLength(0)
    })

    it('tooltip formatter returns formatted string', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      const formatter = protocolChartOption.value.tooltip.formatter as Function
      const result = formatter({ name: 'TCP', value: 70, percent: 70 })
      expect(result).toContain('TCP')
      expect(result).toContain('70')
    })

    it('uses dark text color when darkMode is true', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(true)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      expect(protocolChartOption.value.title.textStyle.color).toBe('#e0e0e0')
    })

    it('protocol data maps colors from CHART_COLORS palette', () => {
      const stats = ref<Statistics | null>(makeStats())
      const dark = ref(false)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      const data = protocolChartOption.value.series[0].data
      expect(data[0].itemStyle.color).toMatch(/^#/)
    })

    it('reacts to statistics ref change', () => {
      const stats = ref<Statistics | null>(null)
      const dark = ref(false)
      const { protocolChartOption } = useStatisticsCharts(stats, dark)

      expect(protocolChartOption.value.series[0].data).toHaveLength(0)

      stats.value = makeStats()
      expect(protocolChartOption.value.series[0].data).toHaveLength(2)
    })
  })
})
