<!--

Copyright 2026 Stefano Babini

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

-->

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
