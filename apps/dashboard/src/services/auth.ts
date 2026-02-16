import type { AuthResponse, SignInPayload, SignUpPayload } from '@/types/auth'

function getApiBase(): string {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

async function postAuth<TPayload>(path: string, payload: TPayload): Promise<AuthResponse> {
  const apiBase = getApiBase()
  const url = apiBase ? `${apiBase}${path}` : path

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json() as { error?: string } & Partial<AuthResponse>

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed')
  }

  if (!data.user || !data.csrfToken) {
    throw new Error('Authentication response is missing user or csrfToken')
  }

  return {
    csrfToken: data.csrfToken,
    user: data.user
  }
}

export function signIn(payload: SignInPayload): Promise<AuthResponse> {
  return postAuth('/auth/signin', payload)
}

export function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  return postAuth('/auth/signup', payload)
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  const apiBase = getApiBase()
  const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })

  if (response.status === 401) {
    return null
  }

  const data = await response.json() as { error?: string } & Partial<AuthResponse>
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load session')
  }

  if (!data.user || !data.csrfToken) {
    return null
  }

  return {
    user: data.user,
    csrfToken: data.csrfToken
  }
}

export async function signOut(csrfToken?: string | null): Promise<void> {
  const apiBase = getApiBase()
  const url = apiBase ? `${apiBase}/auth/logout` : '/auth/logout'

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken
      ? {
          'x-csrf-token': csrfToken
        }
      : undefined
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Logout failed' })) as { error?: string }
    throw new Error(payload.error || 'Logout failed')
  }
}

export async function createClientToken(csrfToken?: string | null): Promise<string> {
  const apiBase = getApiBase()
  const url = apiBase ? `${apiBase}/auth/client-token` : '/auth/client-token'

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken
      ? {
          'x-csrf-token': csrfToken
        }
      : undefined
  })

  const payload = await response.json().catch(() => ({})) as { token?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create client token')
  }

  if (!payload.token) {
    throw new Error('Token response is missing token')
  }

  return payload.token
}
