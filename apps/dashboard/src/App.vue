<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
</script>

<template>
  <div class="app-container">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <Toast position="top-right" />
    <ConfirmDialog />
    <RouterView />
  </div>
</template>

<style lang="scss">
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
  max-width: 100%;
  overflow-x: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-container {
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--p-surface-ground);
  color: var(--p-text-color);
}

.skip-link {
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  z-index: 1000;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius);
  color: var(--p-text-color);
  padding: 0.5rem 0.75rem;
  text-decoration: none;
  transform: translateY(-180%);
  transition: transform 0.15s ease;
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}
</style>
