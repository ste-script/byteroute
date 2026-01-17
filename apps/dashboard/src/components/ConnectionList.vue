<script setup lang="ts">
import { computed, ref } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import InputText from 'primevue/inputtext'
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
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' }
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

function getStatusSeverity(status: Connection['status']): 'success' | 'secondary' | 'danger' {
  switch (status) {
    case 'active': return 'success'
    case 'blocked': return 'danger'
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

function handleSelect(connection: Connection) {
  emit('select', connection)
}
</script>

<template>
  <div class="connection-list">
    <!-- Filters -->
    <div class="filters">
      <InputText
        v-model="searchQuery"
        placeholder="Search IP, country, category..."
        class="search-input"
      />
      <div class="filter-row">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          class="filter-dropdown"
        />
        <Select
          v-model="protocolFilter"
          :options="protocolOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Protocol"
          class="filter-dropdown"
        />
      </div>
    </div>

    <!-- Connection count -->
    <div class="list-header">
      <span class="count">{{ filteredConnections.length }} connections</span>
    </div>

    <!-- Virtual scrolled list -->
    <RecycleScroller
      v-if="filteredConnections.length > 0"
      class="scroller"
      :items="filteredConnections"
      :item-size="72"
      key-field="id"
      v-slot="{ item }"
    >
      <div 
        class="connection-item"
        @click="handleSelect(item)"
      >
        <div :class="['connection-status', item.status]" />
        <div class="connection-info">
          <div class="connection-header">
            <span class="connection-ip">{{ item.sourceIp }}</span>
            <i class="pi pi-arrow-right arrow-icon" />
            <span class="connection-ip">{{ item.destIp }}</span>
          </div>
          <div class="connection-meta">
            <Tag 
              :value="item.protocol" 
              :severity="item.protocol === 'TCP' ? 'info' : 'warn'"
              class="protocol-tag"
            />
            <span v-if="item.country" class="location">
              <i class="pi pi-map-marker" />
              {{ item.country }}
            </span>
            <span v-if="item.category" class="category">
              {{ item.category }}
            </span>
          </div>
          <div class="connection-stats">
            <span class="duration">
              <i class="pi pi-clock" />
              {{ formatDuration(item.startTime) }}
            </span>
            <span class="bandwidth">
              <i class="pi pi-chart-line" />
              {{ formatBandwidth(item.bandwidth) }}
            </span>
            <Tag 
              :value="item.status" 
              :severity="getStatusSeverity(item.status)"
              class="status-tag"
            />
          </div>
        </div>
      </div>
    </RecycleScroller>

    <!-- Empty state -->
    <div v-else-if="!loading" class="empty-state">
      <i class="pi pi-inbox empty-icon" />
      <p>No connections found</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <p>Loading connections...</p>
    </div>
  </div>
</template>

<style scoped>
.connection-list {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  border-bottom: 1px solid var(--p-surface-border);
  cursor: pointer;
  transition: background-color 0.15s;
  height: 72px;
}

.connection-item:hover {
  background: var(--p-surface-hover);
}

.connection-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.connection-status.active {
  background: var(--p-green-500);
  box-shadow: 0 0 8px var(--p-green-500);
}

.connection-status.inactive {
  background: var(--p-surface-400);
}

.connection-status.blocked {
  background: var(--p-red-500);
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
}

.connection-ip {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 500;
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
}

.protocol-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
}

.location, .category {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.location i, .category i {
  font-size: 0.625rem;
}

.connection-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.duration, .bandwidth {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.duration i, .bandwidth i {
  font-size: 0.625rem;
}

.status-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  margin-left: auto;
}

.empty-state, .loading-state {
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
</style>
