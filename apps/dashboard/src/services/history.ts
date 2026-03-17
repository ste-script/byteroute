import client from '@/api/client'
import { sanitizeTenantId } from '@byteroute/shared/common'
import type { Connection } from '@/types'

export type HistorySearchFilters = {
  q?: string
  status?: 'active' | 'inactive'
  protocol?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type HistorySearchResult = {
  items: Connection[]
  total: number
}

export async function searchConnectionHistory(
  tenantId: string,
  filters: HistorySearchFilters
): Promise<HistorySearchResult> {
  const normalizedTenantId = sanitizeTenantId(tenantId)
  if (!normalizedTenantId) {
    throw new Error('Tenant is required for historical search')
  }

  const params = {
    q: filters.q,
    status: filters.status,
    protocol: filters.protocol,
    from: filters.from,
    to: filters.to,
    limit: filters.limit,
    offset: filters.offset,
  }

  const { data } = await client.get<Partial<HistorySearchResult>>(
    '/api/connections/history',
    {
      headers: { 'x-tenant-id': normalizedTenantId },
      params,
    }
  )

  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : 0,
  }
}
