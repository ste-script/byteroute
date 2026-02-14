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
  <div class="connections-view standalone-view">
    <header class="view-header" role="banner">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <Button icon="pi pi-arrow-left" aria-label="Back to dashboard" text rounded />
        </router-link>
        <h1>Connections</h1>
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
      <div class="panel connections-panel">
        <ConnectionList
          :connections="connections"
          @select="handleSelect"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.connections-view {
  .view-content {
    overflow: hidden;
  }

  .connections-panel {
    height: 100%;
  }
}
</style>
