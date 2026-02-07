<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import type { TimeSeriesData } from '@/types'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
])

interface Props {
  data: TimeSeriesData[]
  title?: string
  darkMode?: boolean
  showBlocked?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Traffic Over Time',
  darkMode: false,
  showBlocked: true
})

const chartRef = ref<InstanceType<typeof VChart> | null>(null)

const chartOption = computed(() => {
  const timestamps = props.data.map(d => 
    new Date(d.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  )

  const textColor = props.darkMode ? '#e0e0e0' : '#333'
  const gridLineColor = props.darkMode ? '#333' : '#e0e0e0'

  const series = [
    {
      name: 'Bandwidth In',
      type: 'line',
      data: props.data.map(d => d.bandwidthIn),
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      areaStyle: {
        opacity: 0.2
      },
      itemStyle: { color: '#10b981' }
    },
    {
      name: 'Bandwidth Out',
      type: 'line',
      data: props.data.map(d => d.bandwidthOut),
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      areaStyle: {
        opacity: 0.2
      },
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: 'Connections',
      type: 'bar',
      data: props.data.map(d => d.connections),
      yAxisIndex: 1,
      itemStyle: { 
        color: props.darkMode ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.4)'
      },
      barMaxWidth: 20
    }
  ]

  if (props.showBlocked) {
    series.push({
      name: 'Blocked',
      type: 'bar',
      data: props.data.map(d => d.blocked || 0),
      yAxisIndex: 1,
      itemStyle: { 
        color: props.darkMode ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.4)'
      },
      barMaxWidth: 20
    })
  }

  return {
    backgroundColor: 'transparent',
    title: {
      text: props.title,
      left: 'center',
      textStyle: {
        color: textColor,
        fontSize: 14,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: props.darkMode ? '#1f2937' : '#fff',
      borderColor: props.darkMode ? '#374151' : '#e5e7eb',
      textStyle: {
        color: textColor
      },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return ''

        let result = `<div style="font-weight: 600; margin-bottom: 4px;">${params[0].axisValue}</div>`

        params.forEach((param: any) => {
          const value = param.value
          let formattedValue = value

          // Format bandwidth values (first two series)
          if (param.seriesName === 'Bandwidth In' || param.seriesName === 'Bandwidth Out') {
            formattedValue = formatBandwidth(value)
          }

          result += `<div style="display: flex; align-items: center; margin: 2px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color}; margin-right: 6px;"></span>
            <span style="flex: 1;">${param.seriesName}:</span>
            <span style="font-weight: 600; margin-left: 8px;">${formattedValue}</span>
          </div>`
        })

        return result
      }
    },
    legend: {
      bottom: 0,
      textStyle: { color: textColor, fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Bandwidth',
        nameTextStyle: { color: textColor, fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { 
          color: textColor, 
          fontSize: 10,
          formatter: (value: number) => formatBandwidth(value)
        },
        splitLine: { lineStyle: { color: gridLineColor, type: 'dashed' } }
      },
      {
        type: 'value',
        name: 'Count',
        nameTextStyle: { color: textColor, fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      }
    ],
    series
  }
})

function formatBandwidth(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

defineExpose({
  refresh: () => chartRef.value?.chart?.resize()
})
</script>

<template>
  <v-chart
    ref="chartRef"
    class="traffic-chart"
    :option="chartOption"
    autoresize
  />
</template>

<style scoped>
.traffic-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
