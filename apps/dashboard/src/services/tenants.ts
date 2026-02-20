import client from '@/api/client'

export interface Tenant {
  tenantId: string
  name?: string
}

export async function listTenants(): Promise<string[]> {
  const { data } = await client.get<{ tenants?: unknown[] }>('/api/tenants')
  if (!Array.isArray(data.tenants)) return []
  return data.tenants
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
}

// CSRF token is automatically injected by the axios interceptor for POST/DELETE
export async function createTenant(
  payload: { name: string; tenantId?: string }
): Promise<Tenant> {
  const { data } = await client.post<{ tenant?: Tenant }>('/api/tenants', payload)
  if (!data.tenant) throw new Error('Invalid response from server')
  return data.tenant
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await client.delete(`/api/tenants/${encodeURIComponent(tenantId)}`)
}
