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

export async function createClientToken(): Promise<string> {
  const { data } = await client.post<{ token?: string }>('/auth/client-token')
  if (!data.token) throw new Error('Token response is missing token')
  return data.token
}
