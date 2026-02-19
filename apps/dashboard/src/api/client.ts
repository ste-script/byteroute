import axios from 'axios'
import type { AxiosError } from 'axios'

/**
 * Central axios instance. All dashboard requests go through this client so
 * that baseURL and credentials are configured in one place.
 */
const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── CSRF token ────────────────────────────────────────────────────────────────
// Stored at module level; updated by the auth store via setCsrfToken() whenever
// a new session is established (sign-in, sign-up, session restore).
let _csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  _csrfToken = token
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])

client.interceptors.request.use((config) => {
  if (_csrfToken && config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
    config.headers['x-csrf-token'] = _csrfToken
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
