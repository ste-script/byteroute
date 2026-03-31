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

import axios from 'axios'
import type { AxiosError } from 'axios'

const SAFE_METHODS = new Set(['get', 'head', 'options'])
const CSRF_COOKIE_NAME = 'byteroute_csrf'

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined' || !document.cookie) {
    return undefined
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.split('=')
    if (rawKey?.trim() !== name) {
      continue
    }

    return decodeURIComponent(rawValue.join('=').trim())
  }

  return undefined
}

/**
 * Central axios instance. All dashboard requests go through this client so
 * that baseURL and credentials are configured in one place.
 */
const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  withCredentials: true,
  timeout: 10_000,
  headers: {
    // Scope Content-Type to methods that actually send a body.
    // Setting it in `common` (the axios.create headers shorthand) sends it on
    // every request including GET/DELETE, which causes express.json() to stall
    // waiting for a body that never arrives when requests bypass the Vite proxy
    // (i.e. in production through Traefik → Express).
    post: { 'Content-Type': 'application/json' },
    put: { 'Content-Type': 'application/json' },
    patch: { 'Content-Type': 'application/json' },
  },
})

// ── Bearer token ─────────────────────────────────────────────────────────────
// Stored at module level; updated by the auth store via setAuthToken() whenever
// a session is established (sign-in, sign-up) or restored.
let _authToken: string | null = null

export function setAuthToken(token: string | null): void {
  _authToken = token
}

client.interceptors.request.use((config) => {
  if (_authToken) {
    config.headers['Authorization'] = `Bearer ${_authToken}`
  }

  const method = (config.method ?? 'get').toLowerCase()
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME)
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }

  return config
})

// ── Error helper ──────────────────────────────────────────────────────────────
/**
 * Extract a human-readable message from an axios error or plain Error.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const ae = error as AxiosError<{ error?: string }>
  return ae.response?.data?.error ?? (error instanceof Error ? error.message : fallback)
}

export default client
