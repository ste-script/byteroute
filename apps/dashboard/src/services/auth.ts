import type { AxiosError } from 'axios'
import client from '@/api/client'
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/types/auth'

async function postAuth<TPayload>(path: string, payload: TPayload): Promise<AuthResponse> {
  const { data } = await client.post<Partial<AuthResponse> & { error?: string }>(path, payload)

  if (!data.user || !data.csrfToken) {
    throw new Error('Authentication response is missing user or csrfToken')
  }

  return { user: data.user, csrfToken: data.csrfToken }
}

export function signIn(payload: SignInPayload): Promise<AuthResponse> {
  return postAuth('/auth/signin', payload)
}

export function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  return postAuth('/auth/signup', payload)
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  try {
    const { data } = await client.get<Partial<AuthResponse>>('/auth/me')
    if (!data.user || !data.csrfToken) return null
    return { user: data.user, csrfToken: data.csrfToken }
  } catch (error) {
    if ((error as AxiosError).response?.status === 401) return null
    throw error
  }
}

export async function signOut(): Promise<void> {
  // CSRF token is automatically injected by the axios interceptor
  await client.post('/auth/logout')
}

export async function createClientToken(): Promise<string> {
  const { data } = await client.post<{ token?: string }>('/auth/client-token')
  if (!data.token) throw new Error('Token response is missing token')
  return data.token
}
