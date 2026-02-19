export interface Tenant {
  tenantId: string
  name?: string
}

function getApiBase(): string {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

export async function createTenant(
  payload: { name: string; tenantId?: string },
  csrfToken?: string | null
): Promise<Tenant> {
  const apiBase = getApiBase()
  const url = apiBase ? `${apiBase}/api/tenants` : '/api/tenants'

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({})) as { tenant?: Tenant; error?: string }

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create tenant')
  }

  if (!data.tenant) {
    throw new Error('Invalid response from server')
  }

  return data.tenant
}

export async function deleteTenant(
  tenantId: string,
  csrfToken?: string | null
): Promise<void> {
  const apiBase = getApiBase()
  const url = apiBase
    ? `${apiBase}/api/tenants/${encodeURIComponent(tenantId)}`
    : `/api/tenants/${encodeURIComponent(tenantId)}`

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
  })

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error || 'Failed to delete tenant')
  }
}
