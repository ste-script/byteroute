<script setup lang="ts">
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

interface TenantOption {
  label: string
  value: string
}

interface TimeRangeOption {
  label: string
  value: string
}

defineProps<{
  isConnected: boolean
  darkMode: boolean
  selectedTenant: string
  tenantOptions: TenantOption[]
  selectedTimeRange: string
  timeRangeOptions: TimeRangeOption[]
  version: string
  copyTokenPending: boolean
  copyTokenMessage: string | null
}>()

const emit = defineEmits<{
  'update:selectedTenant': [value: string]
  'update:selectedTimeRange': [value: string]
  'tenant-change': []
  'time-range-change': []
  'toggle-dark-mode': []
  'copy-token': []
  'logout': []
  'new-tenant': []
}>()
</script>

<template>
  <header class="dashboard-header" role="banner">
    <div class="header-left">
      <h1 class="logo">ByteRoute</h1>
      <div class="header-connection-status">
        <Badge
          :value="isConnected ? 'Connected' : 'Disconnected'"
          :severity="isConnected ? 'success' : 'danger'"
        />
      </div>
    </div>

    <div class="header-center">
      <SelectButton
        :model-value="selectedTimeRange"
        :options="timeRangeOptions"
        option-label="label"
        option-value="value"
        aria-label="Select time range"
        @update:model-value="emit('update:selectedTimeRange', $event as string)"
        @change="emit('time-range-change')"
      />
    </div>

    <div class="header-right">
      <Select
        :model-value="selectedTenant"
        :options="tenantOptions"
        option-label="label"
        option-value="value"
        aria-label="Select tenant"
        class="tenant-select"
        @update:model-value="emit('update:selectedTenant', $event as string)"
        @change="emit('tenant-change')"
      />
      <span class="version">v{{ version }}</span>
      <Button
        :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
        :aria-label="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-pressed="darkMode"
        text
        rounded
        @click="emit('toggle-dark-mode')"
      />
      <Button
        icon="pi pi-plus"
        aria-label="Create new tenant"
        text
        rounded
        @click="emit('new-tenant')"
      />
      <Button
        icon="pi pi-copy"
        aria-label="Copy client token"
        text
        rounded
        :loading="copyTokenPending"
        @click="emit('copy-token')"
      />
      <Button icon="pi pi-sign-out" aria-label="Sign out" text rounded @click="emit('logout')" />
      <Button icon="pi pi-cog" aria-label="Open settings" text rounded />
      <span v-if="copyTokenMessage" class="copy-token-message">{{ copyTokenMessage }}</span>
    </div>
  </header>
</template>

<style scoped lang="scss">
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 1rem;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  width: 100%;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-connection-status {
  display: flex;
  align-items: center;
  min-width: 0;

  :deep(.p-badge) {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.header-center {
  display: flex;
  align-items: center;
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-primary-color);
  margin: 0;
}

.tenant-select {
  width: 100%;
  max-width: 14rem;
}

.version {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.copy-token-message {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-wrap: wrap;
    height: auto;
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .header-left,
  .header-right {
    justify-content: space-between;
  }

  .header-center {
    order: 3;
    justify-content: center;
  }
}

@media (max-width: 520px) {
  .header-left {
    justify-content: flex-start;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .version {
    flex-basis: 100%;
  }
}
</style>
