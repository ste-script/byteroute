import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/api/client', () => ({
  default: mockClient,
  setAuthToken: vi.fn()
}))

import { signIn, signUp, getCurrentUser, signOut, createClientToken } from '@/services/auth'
import { setAuthToken } from '@/api/client'

const mockUser = { id: 'user-1', email: 'test@example.com', tenantId: 'tenant-1' }

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    it('returns user and token on success', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { user: mockUser, token: 'jwt-123' } })

      const result = await signIn({ email: 'test@example.com', password: 'pass' })

      expect(mockClient.post).toHaveBeenCalledWith('/auth/signin', { email: 'test@example.com', password: 'pass' })
      expect(result).toEqual({ user: mockUser, token: 'jwt-123' })
    })

    it('throws when response is missing user', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { token: 'jwt-123' } })

      await expect(signIn({ email: 'x@x.com', password: 'x' }))
        .rejects.toThrow('Authentication response is missing user or token')
    })

    it('throws when response is missing token', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { user: mockUser } })

      await expect(signIn({ email: 'x@x.com', password: 'x' }))
        .rejects.toThrow('Authentication response is missing user or token')
    })

    it('propagates network errors', async () => {
      mockClient.post.mockRejectedValueOnce(new Error('Network Error'))

      await expect(signIn({ email: 'x@x.com', password: 'x' }))
        .rejects.toThrow('Network Error')
    })
  })

  describe('signUp', () => {
    it('returns user and token on success', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { user: mockUser, token: 'jwt-456' } })

      const result = await signUp({ email: 'new@example.com', password: 'pass', tenantId: 't-1' })

      expect(mockClient.post).toHaveBeenCalledWith('/auth/signup', { email: 'new@example.com', password: 'pass', tenantId: 't-1' })
      expect(result).toEqual({ user: mockUser, token: 'jwt-456' })
    })

    it('throws when response is missing user or token', async () => {
      mockClient.post.mockResolvedValueOnce({ data: {} })

      await expect(signUp({ email: 'x@x.com', password: 'x', tenantId: 't' }))
        .rejects.toThrow('Authentication response is missing user or token')
    })
  })

  describe('getCurrentUser', () => {
    it('returns user when session is active', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { user: mockUser } })

      const result = await getCurrentUser()

      expect(mockClient.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual({ user: mockUser })
    })

    it('returns null when response has no user', async () => {
      mockClient.get.mockResolvedValueOnce({ data: {} })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })

    it('returns null when request fails (treats error as unauthenticated)', async () => {
      mockClient.get.mockRejectedValueOnce({ response: { status: 401 } })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('Network Error'))

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('signOut', () => {
    it('calls the logout endpoint', async () => {
      mockClient.post.mockResolvedValueOnce({ data: {} })

      await signOut()

      expect(mockClient.post).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('createClientToken', () => {
    it('returns the token string', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { token: 'client-token-xyz' } })

      const result = await createClientToken()

      expect(mockClient.post).toHaveBeenCalledWith('/auth/client-token')
      expect(result).toBe('client-token-xyz')
    })

    it('throws when token is missing from response', async () => {
      mockClient.post.mockResolvedValueOnce({ data: {} })

      await expect(createClientToken()).rejects.toThrow('Token response is missing token')
    })
  })
})
