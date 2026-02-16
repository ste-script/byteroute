import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/auth'
import type { AuthUser, SignInPayload, SignUpPayload } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const csrfToken = ref<string | null>(null)
  const hydrated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(user.value))

  function setAuth(nextUser: AuthUser | null, nextCsrfToken: string | null): void {
    user.value = nextUser
    csrfToken.value = nextCsrfToken
    error.value = null
  }

  async function signIn(payload: SignInPayload): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.signIn(payload)
      setAuth(response.user, response.csrfToken)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Login failed'
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function signUp(payload: SignUpPayload): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.signUp(payload)
      setAuth(response.user, response.csrfToken)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Registration failed'
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function restoreSession(): Promise<void> {
    if (hydrated.value) {
      return
    }

    try {
      const current = await authApi.getCurrentUser()
      setAuth(current?.user ?? null, current?.csrfToken ?? null)
    } finally {
      hydrated.value = true
    }
  }

  async function logout(): Promise<void> {
    let token = csrfToken.value

    if (!token) {
      const current = await authApi.getCurrentUser()
      if (current?.user && current.csrfToken) {
        setAuth(current.user, current.csrfToken)
        token = current.csrfToken
      }
    }

    if (token) {
      await authApi.signOut(token)
    }

    setAuth(null, null)
    error.value = null
  }

  return {
    user,
    csrfToken,
    hydrated,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    restoreSession,
    logout
  }
})
