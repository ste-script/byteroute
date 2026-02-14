<script setup lang="ts">
import { computed, ref } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import type { Connection } from '@/types'

interface Props {
  connections: Connection[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  select: [connection: Connection]
  block: [connection: Connection]
}>()

const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const protocolFilter = ref<string | null>(null)

const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const protocolOptions = [
  { label: 'All Protocols', value: null },
  { label: 'TCP', value: 'TCP' },
  { label: 'UDP', value: 'UDP' },
  { label: 'ICMP', value: 'ICMP' },
  { label: 'Other', value: 'OTHER' }
]

const filteredConnections = computed(() => {
  let result = props.connections

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.sourceIp.toLowerCase().includes(query) ||
      c.destIp.toLowerCase().includes(query) ||
      c.country?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query)
    )
  }

  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value)
  }

  if (protocolFilter.value) {
    result = result.filter(c => c.protocol === protocolFilter.value)
  }

  return result
})

function getStatusSeverity(status: Connection['status']): 'success' | 'secondary' {
  switch (status) {
    case 'active': return 'success'
    default: return 'secondary'
  }
}

function formatDuration(startTime: Date | string): string {
  const start = new Date(startTime)
  const diff = Date.now() - start.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatBandwidth(bytes?: number): string {
  if (!bytes) return '0 B/s'
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB/s'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB/s'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB/s'
  return bytes + ' B/s'
}

function calculateBandwidth(connection: Connection): number {
  // Calculate bandwidth from bytesIn, bytesOut, and duration
  const bytesIn = connection.bytesIn ?? 0
  const bytesOut = connection.bytesOut ?? 0
  const durationMs = connection.duration ?? 0

  if (durationMs === 0) return 0

  const totalBytes = bytesIn + bytesOut
  const durationSeconds = durationMs / 1000

  return Math.round(totalBytes / durationSeconds)
}

function handleSelect(connection: Connection) {
  emit('select', connection)
}

function getConnectionAriaLabel(connection: Connection): string {
  const country = connection.country ? `, ${connection.country}` : ''
  return `${connection.status} connection from ${connection.sourceIp} to ${connection.destIp}, protocol ${connection.protocol}${country}`
}
</script>

<template>
  <div class="connection-list">
    <!-- Filters -->
    <div class="filters">
      <InputText
        v-model="searchQuery"
        placeholder="Search IP, country, category..."
        aria-label="Search connections"
        class="search-input"
      />
      <div class="filter-row">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          aria-label="Filter by connection status"
          class="filter-dropdown"
        />
        <Select
          v-model="protocolFilter"
          :options="protocolOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Protocol"
          aria-label="Filter by protocol"
          class="filter-dropdown"
        />
      </div>
    </div>

    <!-- Connection count -->
    <div class="list-header" role="status" aria-live="polite">
      <span class="count">{{ filteredConnections.length }} connections</span>
    </div>

    <!-- Virtual scrolled list -->
    <RecycleScroller
      v-if="filteredConnections.length > 0"
      class="scroller"
      :items="filteredConnections"
      :item-size="72"
      key-field="id"
      role="list"
      v-slot="{ item }"
    >
      <button
        type="button"
        class="connection-item"
        :aria-label="getConnectionAriaLabel(item)"
        @click="handleSelect(item)"
      >
        <div :class="['connection-status', item.status]" aria-hidden="true" />
        <div class="connection-info">
          <div class="connection-header">
            <span class="connection-ip">{{ item.sourceIp }}</span>
            <i class="pi pi-arrow-right arrow-icon" aria-hidden="true" />
            <span class="connection-ip">{{ item.destIp }}</span>
          </div>
          <div class="connection-meta">
            <Tag 
              :value="item.protocol" 
              :severity="item.protocol === 'TCP' ? 'info' : 'warn'"
              class="protocol-tag"
            />
            <span v-if="item.country" class="location">
              <i class="pi pi-map-marker" aria-hidden="true" />
              {{ item.country }}
            </span>
            <span v-if="item.category" class="category">
              {{ item.category }}
            </span>
          </div>
          <div class="connection-stats">
            <span class="duration">
              <i class="pi pi-clock" aria-hidden="true" />
              {{ formatDuration(item.startTime) }}
            </span>
            <span class="bandwidth">
              <i class="pi pi-chart-line" aria-hidden="true" />
              {{ formatBandwidth(calculateBandwidth(item)) }}
            </span>
            <Tag 
              :value="item.status" 
              :severity="getStatusSeverity(item.status)"
              class="status-tag"
            />
          </div>
        </div>
      </button>
    </RecycleScroller>

    <!-- Empty state -->
    <div v-else-if="!loading" class="empty-state" role="status" aria-live="polite">
      <i class="pi pi-inbox empty-icon" aria-hidden="true" />
      <p>No connections found</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state" role="status" aria-live="polite">
      <i class="pi pi-spin pi-spinner" aria-hidden="true" />
      <p>Loading connections...</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/styles/tokens' as t;
@use '../assets/styles/mixins' as m;

.connection-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.filters {
  padding: 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-input {
  width: 100%;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
}

.filter-dropdown {
  flex: 1;
}

.list-header {
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-ground);
  border-bottom: 1px solid var(--p-surface-border);
}

.count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.scroller {
  flex: 1;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  border-bottom: 1px solid var(--p-surface-border);
  cursor: pointer;
  transition: background-color 0.15s;
  height: t.$connections-item-height;

  &:hover {
    background: var(--p-surface-hover);
  }
}

.connection-status {
  width: t.$status-dot-size;
  height: t.$status-dot-size;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;

  &.active {
    background: var(--p-green-500);
    box-shadow: 0 0 t.$status-dot-size var(--p-green-500);
  }

  &.inactive {
    background: var(--p-surface-400);
  }
}

.connection-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.connection-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.connection-ip {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

.connection-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  min-width: 0;
}

.protocol-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
}

.location,
.category,
.duration,
.bandwidth {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  i {
    font-size: 0.625rem;
  }
}

.connection-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  min-width: 0;
}

.status-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  margin-left: auto;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.loading-state i {
  font-size: 1.5rem;
}

@include m.max-width(t.$bp-sm) {
  .filters {
    padding: 0.5rem;
  }

  .filter-row {
    flex-direction: column;
  }

  .connection-item {
    height: auto;
    min-height: t.$connections-item-min-height-mobile;
  }

  .connection-header {
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }

  .connection-ip {
    max-width: calc(100vw - 8.5rem);
  }

  .connection-stats {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .status-tag {
    margin-left: 0;
  }
}
</style>
