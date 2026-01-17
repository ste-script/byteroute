<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useDashboardStore } from '@/stores/dashboard'
import ConnectionList from '@/components/ConnectionList.vue'
import type { Connection } from '@/types'

const store = useDashboardStore()
const { connections, darkMode } = storeToRefs(store)

function handleSelect(connection: Connection) {
  console.log('Selected:', connection)
}
</script>

<template>
  <div class="connections-view">
    <header class="view-header">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <Button icon="pi pi-arrow-left" text rounded />
        </router-link>
        <h1>Connections</h1>
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
      <div class="panel connections-panel">
        <ConnectionList
          :connections="connections"
          @select="handleSelect"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.connections-view {
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
  overflow: hidden;
}

.connections-panel {
  height: 100%;
}
</style>
