<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import type { Statistics } from '@/types'

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface Props {
  statistics: Statistics | null
  darkMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  darkMode: false
})

const activeTab = ref<'country' | 'category' | 'protocol'>('country')

const textColor = computed(() => props.darkMode ? '#e0e0e0' : '#333')

const categoryColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

const countryChartOption = computed(() => {
  const data = props.statistics?.byCountry || []
  const topCountries = data.slice(0, 10)

  return {
    backgroundColor: 'transparent',
    title: {
      text: 'Top Countries',
      left: 'center',
      textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
        const item = params[0]
        const country = topCountries[item.dataIndex]
        return `${country?.country || item.name}<br/>
          Connections: ${country?.connections || 0}<br/>
          Bandwidth: ${formatBandwidth(country?.bandwidth || 0)}<br/>
          ${country?.percentage?.toFixed(1) || 0}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: textColor.value, fontSize: 10 },
      splitLine: { lineStyle: { color: props.darkMode ? '#333' : '#e0e0e0', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: topCountries.map(c => c.countryCode || c.country).reverse(),
      axisLabel: { color: textColor.value, fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: topCountries.map(c => c.connections).reverse(),
      itemStyle: {
        color: (params: { dataIndex: number }) => categoryColors[params.dataIndex % categoryColors.length]
      },
      barMaxWidth: 30
    }]
  }
})

const categoryChartOption = computed(() => {
  const data = props.statistics?.byCategory || []

  return {
    backgroundColor: 'transparent',
    title: {
      text: 'By Category',
      left: 'center',
      textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => 
        `${params.name}<br/>
        Connections: ${params.value}<br/>
        ${params.percent?.toFixed(1)}%`
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'middle',
      textStyle: { color: textColor.value, fontSize: 10 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: props.darkMode ? '#1f2937' : '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      data: data.map((c, i) => ({
        name: c.category,
        value: c.connections,
        itemStyle: { color: c.color || categoryColors[i % categoryColors.length] }
      }))
    }]
  }
})

const protocolChartOption = computed(() => {
  const data = props.statistics?.byProtocol || []

  return {
    backgroundColor: 'transparent',
    title: {
      text: 'By Protocol',
      left: 'center',
      textStyle: { color: textColor.value, fontSize: 14, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => 
        `${params.name}: ${params.value} (${params.percent?.toFixed(1)}%)`
    },
    series: [{
      type: 'pie',
      radius: '65%',
      center: ['50%', '55%'],
      data: data.map((p, i) => ({
        name: p.protocol,
        value: p.connections,
        itemStyle: { color: categoryColors[i % categoryColors.length] }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: {
        color: textColor.value,
        fontSize: 11
      }
    }]
  }
})

function formatBandwidth(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toString()
}
</script>

<template>
  <div class="statistics-panel">
    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(statistics?.totalConnections || 0) }}</div>
        <div class="stat-label">Total Connections</div>
      </div>
      <div class="stat-card">
        <div class="stat-value active">{{ formatNumber(statistics?.activeConnections || 0) }}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatBandwidth(statistics?.totalBandwidth || 0) }}</div>
        <div class="stat-label">Bandwidth</div>
      </div>
    </div>

    <!-- Chart Tabs -->
    <div class="chart-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'country' }]"
        @click="activeTab = 'country'"
      >
        Countries
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'category' }]"
        @click="activeTab = 'category'"
      >
        Categories
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'protocol' }]"
        @click="activeTab = 'protocol'"
      >
        Protocols
      </button>
    </div>

    <!-- Charts -->
    <div class="chart-container">
      <v-chart
        v-if="activeTab === 'country'"
        :option="countryChartOption"
        autoresize
      />
      <v-chart
        v-else-if="activeTab === 'category'"
        :option="categoryChartOption"
        autoresize
      />
      <v-chart
        v-else
        :option="protocolChartOption"
        autoresize
      />
    </div>
  </div>
</template>

<style scoped>
.statistics-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat-card {
  background: var(--p-surface-ground);
  border-radius: var(--p-border-radius);
  padding: 0.75rem;
  text-align: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-primary-color);
}

.stat-value.active {
  color: var(--p-green-500);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
}

.chart-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--p-surface-ground);
  padding: 0.25rem;
  border-radius: var(--p-border-radius);
}

.tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: calc(var(--p-border-radius) - 2px);
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--p-text-color);
}

.tab-btn.active {
  background: var(--p-surface-card);
  color: var(--p-primary-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.chart-container > * {
  width: 100%;
  height: 100%;
}
</style>
