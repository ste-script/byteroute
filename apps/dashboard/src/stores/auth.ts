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

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/auth'
import { setAuthToken } from '@/api/client'
import type { AuthUser, SignInPayload, SignUpPayload } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(null)
  const hydrated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(user.value))

  function setAuth(nextUser: AuthUser | null, nextToken: string | null): void {
    user.value = nextUser
    token.value = nextToken
    setAuthToken(nextToken)  // keep axios interceptor in sync
    error.value = null
  }

  async function signIn(payload: SignInPayload): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.signIn(payload)
      setAuth(response.user, response.token)
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
      setAuth(response.user, response.token)
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
      setAuth(current?.user ?? null, null)
    } finally {
      hydrated.value = true
    }
  }

  async function logout(): Promise<void> {
    await authApi.signOut()
    setAuth(null, null)
    error.value = null
  }

  async function createClientToken(tenantId: string): Promise<string> {
    return authApi.createClientToken(tenantId)
  }

  return {
    user,
    token,
    hydrated,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    restoreSession,
    logout,
    createClientToken
  }
})
