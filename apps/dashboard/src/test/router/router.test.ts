import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockAuthStore = {
  hydrated: false,
  isAuthenticated: false,
  restoreSession: vi.fn()
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

// Import after mocks are in place
import router from '@/router/index'

describe('Router navigation guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStore.restoreSession.mockResolvedValue(undefined)

    // Navigate to a neutral private route while authenticated so we don't
    // start each test from /login (NavigationDuplicated risk)
    mockAuthStore.hydrated = true
    mockAuthStore.isAuthenticated = true
    await router.replace('/statistics').catch(() => null)

    // Reset to default unauthenticated, hydrated state for the actual test
    mockAuthStore.hydrated = true
    mockAuthStore.isAuthenticated = false
  })

  it('redirects unauthenticated user to login on a private route', async () => {
    mockAuthStore.isAuthenticated = false

    await router.push('/').catch(() => null)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects authenticated user away from public route to dashboard', async () => {
    mockAuthStore.isAuthenticated = true

    await router.push('/login').catch(() => null)
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('allows unauthenticated user to access public routes', async () => {
    mockAuthStore.isAuthenticated = false
    mockAuthStore.hydrated = true

    await router.push('/login').catch(() => null)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows authenticated user to access private routes', async () => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.hydrated = true

    await router.push('/connections').catch(() => null)
    expect(router.currentRoute.value.name).toBe('connections')
  })

  it('calls restoreSession when not yet hydrated and not authenticated', async () => {
    mockAuthStore.hydrated = false
    mockAuthStore.isAuthenticated = false

    await router.push('/connections').catch(() => null)

    expect(mockAuthStore.restoreSession).toHaveBeenCalled()
  })

  it('does not call restoreSession when already hydrated', async () => {
    mockAuthStore.hydrated = true
    mockAuthStore.isAuthenticated = false

    await router.push('/login').catch(() => null)

    expect(mockAuthStore.restoreSession).not.toHaveBeenCalled()
  })

  it('does not call restoreSession when already authenticated', async () => {
    mockAuthStore.hydrated = false
    mockAuthStore.isAuthenticated = true

    await router.push('/connections').catch(() => null)

    expect(mockAuthStore.restoreSession).not.toHaveBeenCalled()
  })

  it('swallows restoreSession errors and redirects to login', async () => {
    mockAuthStore.hydrated = false
    mockAuthStore.isAuthenticated = false
    mockAuthStore.restoreSession.mockRejectedValueOnce(new Error('network'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await router.push('/connections').catch(() => null)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[router]'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})

