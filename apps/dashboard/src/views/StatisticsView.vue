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
    <header class="view-header">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <Button icon="pi pi-arrow-left" text rounded />
        </router-link>
        <h1>Statistics</h1>
      </div>
      <div class="header-actions">
        <Button
          :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          text
          rounded
          @click="store.toggleDarkMode"
        />
      </div>
    </header>
    <main class="view-content">
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
  height: 100vh;
  background: var(--p-surface-ground);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 1rem;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
</style>
