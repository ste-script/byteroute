/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
