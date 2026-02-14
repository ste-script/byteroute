<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useDashboardStore } from '@/stores/dashboard'
import StatisticsPanel from '@/components/StatisticsPanel.vue'

const store = useDashboardStore()
const { statistics, darkMode } = storeToRefs(store)
</script>

<template>
  <div class="statistics-view">
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

<style scoped>
.statistics-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  background: var(--p-surface-ground);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 1rem;
  width: 100%;
  max-width: 100%;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.header-content h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.back-link {
  text-decoration: none;
}

.view-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  overflow-x: hidden;
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

@media (max-width: 640px) {
  .view-header {
    height: auto;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .header-content h1 {
    font-size: 1.1rem;
  }

  .view-content {
    padding: 0.5rem;
  }

  .stats-panel {
    min-height: 480px;
  }
}
</style>
