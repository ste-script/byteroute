import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock the auth service
vi.mock('@/services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  createClientToken: vi.fn()
}))

// Mock the API client's setAuthToken
vi.mock('@/api/client', () => ({
  default: {},
  setAuthToken: vi.fn()
}))

import * as authApi from '@/services/auth'
import { setAuthToken } from '@/api/client'

const mockUser = { id: 'user-1', email: 'test@example.com', tenantId: 'tenant-1' }
const mockToken = 'jwt-token-123'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null user', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    it('should have null token', () => {
      const store = useAuthStore()
      expect(store.token).toBeNull()
    })

    it('should not be authenticated', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should not be loading', () => {
      const store = useAuthStore()
      expect(store.loading).toBe(false)
    })

    it('should have null error', () => {
      const store = useAuthStore()
      expect(store.error).toBeNull()
    })

    it('should not be hydrated', () => {
      const store = useAuthStore()
      expect(store.hydrated).toBe(false)
    })
  })

  describe('signIn', () => {
    it('should set user and token on success', async () => {
      vi.mocked(authApi.signIn).mockResolvedValueOnce({ user: mockUser, token: mockToken })

      const store = useAuthStore()
      await store.signIn({ email: 'test@example.com', password: 'password' })

      expect(store.user).toEqual(mockUser)
      expect(store.token).toBe(mockToken)
      expect(store.isAuthenticated).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should call setAuthToken with the token', async () => {
      vi.mocked(authApi.signIn).mockResolvedValueOnce({ user: mockUser, token: mockToken })

      const store = useAuthStore()
      await store.signIn({ email: 'test@example.com', password: 'pass' })

      expect(setAuthToken).toHaveBeenCalledWith(mockToken)
    })

    it('should set error and re-throw on failure', async () => {
      const err = new Error('Invalid credentials')
      vi.mocked(authApi.signIn).mockRejectedValueOnce(err)

      const store = useAuthStore()
      await expect(store.signIn({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials')

      expect(store.error).toBe('Invalid credentials')
      expect(store.user).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('should use fallback error message for non-Error rejections', async () => {
      vi.mocked(authApi.signIn).mockRejectedValueOnce('string error')

      const store = useAuthStore()
      await expect(store.signIn({ email: 'x@x.com', password: 'x' })).rejects.toBe('string error')

      expect(store.error).toBe('Login failed')
    })

    it('should set loading true while in-flight then false afterwards', async () => {
      let resolveSign!: (v: { user: typeof mockUser; token: string }) => void
      vi.mocked(authApi.signIn).mockReturnValueOnce(
        new Promise((res) => { resolveSign = res })
      )

      const store = useAuthStore()
      const promise = store.signIn({ email: 'test@example.com', password: 'pass' })
      expect(store.loading).toBe(true)

      resolveSign({ user: mockUser, token: mockToken })
      await promise
      expect(store.loading).toBe(false)
    })
  })

  describe('signUp', () => {
    it('should set user and token on success', async () => {
      vi.mocked(authApi.signUp).mockResolvedValueOnce({ user: mockUser, token: mockToken })

      const store = useAuthStore()
      await store.signUp({ email: 'new@example.com', password: 'password', tenantId: 'tenant-1' })

      expect(store.user).toEqual(mockUser)
      expect(store.token).toBe(mockToken)
    })

    it('should set error and re-throw on failure', async () => {
      const err = new Error('Email taken')
      vi.mocked(authApi.signUp).mockRejectedValueOnce(err)

      const store = useAuthStore()
      await expect(store.signUp({ email: 'taken@example.com', password: 'pass', tenantId: 't' })).rejects.toThrow('Email taken')

      expect(store.error).toBe('Email taken')
    })

    it('should use fallback error message for non-Error rejections', async () => {
      vi.mocked(authApi.signUp).mockRejectedValueOnce(null)

      const store = useAuthStore()
      await expect(store.signUp({ email: 'x@x.com', password: 'x', tenantId: 't' })).rejects.toBeNull()

      expect(store.error).toBe('Registration failed')
    })
  })

  describe('restoreSession', () => {
    it('should set user on success', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({ user: mockUser })

      const store = useAuthStore()
      await store.restoreSession()

      expect(store.user).toEqual(mockUser)
      expect(store.hydrated).toBe(true)
    })

    it('should set user to null if getCurrentUser returns null', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null)

      const store = useAuthStore()
      await store.restoreSession()

      expect(store.user).toBeNull()
      expect(store.hydrated).toBe(true)
    })

    it('should mark hydrated even when getCurrentUser throws', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValueOnce(new Error('network'))

      const store = useAuthStore()
      // try/finally re-throws, but hydrated must still be set
      await expect(store.restoreSession()).rejects.toThrow('network')

      expect(store.hydrated).toBe(true)
    })

    it('should skip the API call when already hydrated', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({ user: mockUser })
      const store = useAuthStore()

      await store.restoreSession()
      await store.restoreSession() // second call should be a no-op

      expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('logout', () => {
    it('should clear user and token', async () => {
      vi.mocked(authApi.signIn).mockResolvedValueOnce({ user: mockUser, token: mockToken })
      vi.mocked(authApi.signOut).mockResolvedValueOnce(undefined)

      const store = useAuthStore()
      await store.signIn({ email: 'test@example.com', password: 'pass' })
      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should call setAuthToken(null) to clear the bearer header', async () => {
      vi.mocked(authApi.signOut).mockResolvedValueOnce(undefined)

      const store = useAuthStore()
      await store.logout()

      expect(setAuthToken).toHaveBeenCalledWith(null)
    })
  })

  describe('createClientToken', () => {
    it('should return the token from the API', async () => {
      vi.mocked(authApi.createClientToken).mockResolvedValueOnce('client-token-abc')

      const store = useAuthStore()
      const result = await store.createClientToken()

      expect(result).toBe('client-token-abc')
    })
  })
})
