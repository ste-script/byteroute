import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockPush = vi.fn()
const mockAuthStore = {
  signIn: vi.fn(),
  loading: false,
  error: null as string | null
}

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

import LoginView from '@/views/LoginView.vue'

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStore.signIn = vi.fn()
    mockAuthStore.loading = false
    mockAuthStore.error = null
  })

  it('renders without crashing', () => {
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: true,
          Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the sign in heading', () => {
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: true,
          Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
        }
      }
    })
    expect(wrapper.text()).toContain('Sign in')
  })

  it('redirects to dashboard on successful sign in', async () => {
    mockAuthStore.signIn.mockResolvedValueOnce(undefined)
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: true,
          Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
        }
      }
    })

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(mockAuthStore.signIn).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows error message on failed sign in', async () => {
    mockAuthStore.signIn.mockRejectedValueOnce(new Error('Invalid credentials'))
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: true,
          Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
        }
      }
    })

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('uses fallback error message for non-Error failures', async () => {
    mockAuthStore.signIn.mockRejectedValueOnce('something')
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: true,
          Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
        }
      }
    })

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Login failed')
  })
})
