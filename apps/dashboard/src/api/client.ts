import axios from 'axios'
import type { AxiosError } from 'axios'

/**
 * Central axios instance. All dashboard requests go through this client so
 * that baseURL and credentials are configured in one place.
 */
const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  headers: {
    'Content-Type': 'application/json',
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
