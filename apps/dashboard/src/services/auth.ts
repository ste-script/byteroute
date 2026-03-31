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
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/types/auth'

async function postAuth<TPayload>(path: string, payload: TPayload): Promise<AuthResponse> {
  const { data } = await client.post<Partial<AuthResponse> & { error?: string }>(path, payload)

  if (!data.user || !data.token) {
    throw new Error('Authentication response is missing user or token')
  }

  return { user: data.user, token: data.token }
}

export function signIn(payload: SignInPayload): Promise<AuthResponse> {
  return postAuth('/auth/signin', payload)
}

export function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  return postAuth('/auth/signup', payload)
}

export async function getCurrentUser(): Promise<{ user: AuthResponse['user'] } | null> {
  try {
    const { data } = await client.get<{ user?: AuthResponse['user'] }>('/auth/me')
    if (!data.user) return null
    return { user: data.user }
  } catch (error) {
    // Treat any error (401, 5xx, network) as "not authenticated" so a backend
    // hiccup never prevents the app from rendering.
    /* v8 ignore next 3 */
    if (import.meta.env.DEV) {
      console.warn('[auth] getCurrentUser failed, treating as unauthenticated:', error)
    }
    return null
  }
}

export async function signOut(): Promise<void> {
  await client.post('/auth/logout')
}

export async function createClientToken(tenantId: string): Promise<string> {
  const { data } = await client.post<{ token?: string }>('/auth/client-token', { tenantId })
  if (!data.token) throw new Error('Token response is missing token')
  return data.token
}
