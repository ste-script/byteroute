<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useDashboardStore } from '@/stores/dashboard'
import StatisticsPanel from '@/components/StatisticsPanel.vue'

const store = useDashboardStore()
const { statistics, darkMode } = storeToRefs(store)
</script>

<template>
  <div class="statistics-view standalone-view">
    <header class="view-header" role="banner">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <Button icon="pi pi-arrow-left" aria-label="Back to dashboard" text rounded />
        </router-link>
        <h1>Statistics</h1>
      </div>
      <div class="header-actions">
        <Button
          :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          :aria-label="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="darkMode"
          text
          rounded
          @click="store.toggleDarkMode"
        />
      </div>
    </header>
    <main id="main-content" class="view-content" tabindex="-1">
      <div class="panel stats-panel">
        <div class="panel-content">
          <StatisticsPanel
            :statistics="statistics"
            :dark-mode="darkMode"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/styles/tokens' as t;
@use '../assets/styles/mixins' as m;

.statistics-view {
  .view-content {
    overflow: auto;
  }

  .stats-panel {
    max-width: 800px;
    margin: 0 auto;
    min-height: 600px;
  }

  .panel-content {
    padding: 1rem;
    height: 100%;
  }
}

@include m.max-width(t.$bp-sm) {
  .statistics-view {
    .stats-panel {
      min-height: 480px;
    }
  }
}
</style>
