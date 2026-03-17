<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import { apiErrorMessage } from '@/api/client'
import { listTenants } from '@/services/tenants'
import {
  searchConnectionHistory,
  type HistorySearchFilters,
} from '@/services/history'
import type { Connection } from '@/types'
import { sanitizeTenantId } from '@byteroute/shared/common'

const tenants = ref<string[]>([])
const selectedTenant = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const results = ref<Connection[]>([])
const total = ref(0)

const filters = ref<HistorySearchFilters>({
  q: '',
  status: undefined,
  protocol: undefined,
  from: '',
  to: '',
  limit: 100,
  offset: 0,
})

const statusOptions = [
  { label: 'Any status', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const protocolOptions = [
  { label: 'Any protocol', value: undefined },
  { label: 'TCP', value: 'TCP' },
  { label: 'UDP', value: 'UDP' },
  { label: 'ICMP', value: 'ICMP' },
  { label: 'OTHER', value: 'OTHER' },
]

const pageSizeOptions = [25, 50, 100]

const currentPage = computed(() => {
  const limit = filters.value.limit ?? 100
  const offset = filters.value.offset ?? 0
  return Math.floor(offset / limit) + 1
})

const totalPages = computed(() => {
  const limit = filters.value.limit ?? 100
  return Math.max(1, Math.ceil(total.value / limit))
})

const canGoPrevious = computed(() => (filters.value.offset ?? 0) > 0)
const canGoNext = computed(() => {
  const limit = filters.value.limit ?? 100
  const offset = filters.value.offset ?? 0
  return offset + limit < total.value
})

function formatDate(value: Date | string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleString()
}

async function runSearch(): Promise<void> {
  const tenantId = sanitizeTenantId(selectedTenant.value)
  if (!tenantId) {
    error.value = 'Select a tenant before searching.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await searchConnectionHistory(tenantId, filters.value)
    results.value = response.items
    total.value = response.total
  } catch (cause) {
    error.value = apiErrorMessage(cause, 'Failed to load historical data')
  } finally {
    loading.value = false
  }
}

async function goToNextPage(): Promise<void> {
  if (!canGoNext.value) {
    return
  }

  const limit = filters.value.limit ?? 100
  const offset = filters.value.offset ?? 0
  filters.value.offset = offset + limit
  await runSearch()
}

async function goToPreviousPage(): Promise<void> {
  if (!canGoPrevious.value) {
    return
  }

  const limit = filters.value.limit ?? 100
  const offset = filters.value.offset ?? 0
  filters.value.offset = Math.max(0, offset - limit)
  await runSearch()
}

async function handlePageSizeChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement
  const nextLimit = Number.parseInt(target.value, 10)
  if (!Number.isFinite(nextLimit) || nextLimit <= 0) {
    return
  }

  filters.value.limit = nextLimit
  filters.value.offset = 0
  await runSearch()
}

onMounted(async () => {
  try {
    tenants.value = await listTenants()
  } catch {
    tenants.value = []
  }

  const savedTenant =
    typeof window !== 'undefined'
      ? sanitizeTenantId(window.localStorage.getItem('byteroute:selected-tenant'))
      : undefined

  selectedTenant.value = savedTenant ?? tenants.value[0] ?? ''

  if (selectedTenant.value) {
    await runSearch()
  }
})
</script>

<template>
  <div class="history-search-view standalone-view">
    <header class="view-header" role="banner">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <Button icon="pi pi-arrow-left" aria-label="Back to dashboard" text rounded />
        </router-link>
        <h1>Historical Data Search</h1>
      </div>
    </header>

    <main id="main-content" class="view-content" tabindex="-1">
      <section class="panel search-panel">
        <form class="panel-content filters-grid" @submit.prevent="runSearch">
          <Select
            v-model="selectedTenant"
            :options="tenants"
            placeholder="Tenant"
            aria-label="Select tenant"
          />
          <InputText
            v-model="filters.q"
            placeholder="Search IP, country, city or ASN org"
            aria-label="Search term"
          />
          <Select
            v-model="filters.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            aria-label="Filter by status"
          />
          <Select
            v-model="filters.protocol"
            :options="protocolOptions"
            option-label="label"
            option-value="value"
            aria-label="Filter by protocol"
          />
          <InputText
            v-model="filters.from"
            type="datetime-local"
            aria-label="From timestamp"
          />
          <InputText
            v-model="filters.to"
            type="datetime-local"
            aria-label="To timestamp"
          />
          <div class="actions-row">
            <Button
              label="Search"
              icon="pi pi-search"
              type="submit"
              :loading="loading"
            />
            <span class="total-label">{{ total }} total</span>
          </div>
        </form>
      </section>

      <section class="panel results-panel">
        <div class="panel-content">
          <div class="pagination-row">
            <label class="page-size-label" for="history-page-size">Rows per page</label>
            <select
              id="history-page-size"
              data-test="pagination-limit"
              class="page-size-select"
              :value="String(filters.limit ?? 100)"
              @change="handlePageSizeChange"
            >
              <option
                v-for="size in pageSizeOptions"
                :key="size"
                :value="String(size)"
              >
                {{ size }}
              </option>
            </select>

            <Button
              data-test="pagination-prev"
              icon="pi pi-chevron-left"
              label="Previous"
              size="small"
              text
              :disabled="!canGoPrevious"
              @click="goToPreviousPage"
            />

            <span class="page-indicator">Page {{ currentPage }} / {{ totalPages }}</span>

            <Button
              data-test="pagination-next"
              icon="pi pi-chevron-right"
              icon-pos="right"
              label="Next"
              size="small"
              text
              :disabled="!canGoNext"
              @click="goToNextPage"
            />
          </div>

          <p v-if="error" class="error-text">{{ error }}</p>
          <p v-else-if="!loading && results.length === 0">No historical records found.</p>
          <div v-else class="table-wrap">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Protocol</th>
                  <th>Status</th>
                  <th>ASN</th>
                  <th>Location</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="connection in results" :key="connection.id">
                  <td>{{ connection.sourceIp }}</td>
                  <td>{{ connection.destIp }}</td>
                  <td>{{ connection.protocol }}</td>
                  <td>{{ connection.status }}</td>
                  <td>{{ connection.asn ? `${connection.asOrganization ? `${connection.asOrganization} ` : ''}(${connection.asn})` : '-' }}</td>
                  <td>{{ connection.country ?? '-' }}</td>
                  <td>{{ formatDate(connection.lastActivity) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.history-search-view {
  .view-content {
    overflow: auto;
    display: grid;
    gap: 1rem;
  }
}

.filters-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.total-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.error-text {
  color: var(--p-red-500);
}

.table-wrap {
  overflow-x: auto;
}

.pagination-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.page-size-label {
  font-size: 0.875rem;
}

.page-size-select {
  min-width: 5rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius);
  background: var(--p-surface-card);
  color: var(--p-text-color);
}

.page-indicator {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.history-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid var(--p-surface-border);
    white-space: nowrap;
  }

  th {
    font-size: 0.875rem;
    background: var(--p-surface-ground);
    color: var(--p-text-color);
  }

  td {
    font-size: 0.8125rem;
  }
}

@media (max-width: 840px) {
  .filters-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
