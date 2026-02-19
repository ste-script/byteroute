<script setup lang="ts">
import { computed, toRef } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import type { Statistics } from '@/types'
import { useStatisticsCharts } from '@/composables/useStatisticsCharts'
import { useTabs } from '@/composables/useTabs'
import { formatBytes, formatNumber } from '@/utils/formatters'

use([CanvasRenderer, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

interface Props {
  statistics: Statistics | null
  darkMode?: boolean
}

const props = withDefaults(defineProps<Props>(), { darkMode: false })

type TabId = 'country' | 'category' | 'protocol'

const tabOptions: Array<{ id: TabId; label: string }> = [
  { id: 'country', label: 'Countries' },
  { id: 'category', label: 'Categories' },
  { id: 'protocol', label: 'Protocols' },
]

const { activeTab, setActiveTab, handleTabKeydown } = useTabs(tabOptions)

const statisticsRef = computed(() => props.statistics)
const darkModeRef = toRef(props, 'darkMode')
const { countryChartOption, categoryChartOption, protocolChartOption } =
  useStatisticsCharts(statisticsRef, darkModeRef)
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
        <div class="stat-value">{{ formatBytes(statistics?.totalBandwidth || 0) }}</div>
        <div class="stat-label">Bandwidth</div>
      </div>
    </div>

    <!-- Chart Tabs -->
    <div class="chart-tabs" role="tablist" aria-label="Statistics chart type">
      <button
        v-for="(tab, index) in tabOptions"
        :id="`stats-tab-${tab.id}`"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        role="tab"
        :aria-controls="`stats-panel-${tab.id}`"
        :aria-selected="activeTab === tab.id"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="setActiveTab(tab.id)"
        @keydown="handleTabKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Charts -->
    <div class="chart-container" role="region" aria-live="polite">
      <v-chart
        v-if="activeTab === 'country'"
        id="stats-panel-country"
        role="img"
        aria-label="Bar chart of top countries by connections"
        :option="countryChartOption"
        autoresize
      />
      <v-chart
        v-else-if="activeTab === 'category'"
        id="stats-panel-category"
        role="img"
        aria-label="Pie chart of traffic categories"
        :option="categoryChartOption"
        autoresize
      />
      <v-chart
        v-else
        id="stats-panel-protocol"
        role="img"
        aria-label="Pie chart of network protocols"
        :option="protocolChartOption"
        autoresize
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/styles/tokens' as t;
@use '../assets/styles/mixins' as m;

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

  &.active {
    color: var(--p-green-500);
  }
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

  &:hover {
    color: var(--p-text-color);
  }

  &.active {
    background: var(--p-surface-card);
    color: var(--p-primary-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

.chart-container {
  flex: 1;
  min-height: 200px;

  > * {
    width: 100%;
    height: 100%;
  }
}

@include m.max-width(t.$bp-sm) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .chart-tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1 0 calc(50% - 0.25rem);
  }
}
</style>
