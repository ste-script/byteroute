<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
</script>

<template>
  <div class="app-container">
    <Toast position="top-right" />
    <ConfirmDialog />
    <RouterView />
  </div>
</template>

<style>
:root {
  --header-height: 60px;
  --sidebar-width: 280px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--p-surface-ground);
  color: var(--p-text-color);
}
</style>
