import { computed, type Ref } from 'vue'
import type { Statistics } from '@/types'
import { formatBytes } from '@/utils/formatters'

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function splitLineColor(darkMode: boolean) {
  return darkMode ? '#333' : '#e0e0e0'
}

export function useStatisticsCharts(
  statistics: Ref<Statistics | null>,
  darkMode: Ref<boolean>
) {
  const textColor = computed(() => darkMode.value ? '#e0e0e0' : '#333')

  const countryChartOption = computed(() => {
    const data = statistics.value?.byCountry ?? []
    const topCountries = data.slice(0, 10)

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Top Countries',
        left: 'center',
        textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
          const item = params[0]!
          const country = topCountries[item.dataIndex]
          return `${country?.country || item.name}<br/>
            Connections: ${country?.connections || 0}<br/>
            Bandwidth: ${formatBytes(country?.bandwidth || 0)}<br/>
            ${country?.percentage?.toFixed(1) || 0}%`
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '20%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: textColor.value, fontSize: 10 },
        splitLine: { lineStyle: { color: splitLineColor(darkMode.value), type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: topCountries.map((c) => c.countryCode || c.country).reverse(),
        axisLabel: { color: textColor.value, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: topCountries.map((c) => c.connections).reverse(),
        itemStyle: {
          color: (params: { dataIndex: number }) =>
            CHART_COLORS[params.dataIndex % CHART_COLORS.length],
        },
        barMaxWidth: 30,
      }],
    }
  })

  const categoryChartOption = computed(() => {
    const data = statistics.value?.byCategory ?? []

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'By Category',
        left: 'center',
        textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/>Connections: ${params.value}<br/>${params.percent?.toFixed(1)}%`,
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'middle',
        textStyle: { color: textColor.value, fontSize: 10 },
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: darkMode.value ? '#1f2937' : '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
        data: data.map((c, i) => ({
          name: c.category,
          value: c.connections,
          itemStyle: { color: c.color || CHART_COLORS[i % CHART_COLORS.length] },
        })),
      }],
    }
  })

  const protocolChartOption = computed(() => {
    const data = statistics.value?.byProtocol ?? []

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'By Protocol',
        left: 'center',
        textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}: ${params.value} (${params.percent?.toFixed(1)}%)`,
      },
      series: [{
        type: 'pie',
        radius: '65%',
        center: ['50%', '55%'],
        data: data.map((p, i) => ({
          name: p.protocol,
          value: p.connections,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
        },
        label: { color: textColor.value, fontSize: 11 },
      }],
    }
  })

  return { countryChartOption, categoryChartOption, protocolChartOption }
}
