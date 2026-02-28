import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockPush = vi.fn()
const mockAuthStore = {
  signUp: vi.fn(),
  loading: false,
  error: null as string | null
}

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

import RegisterView from '@/views/RegisterView.vue'

const mountStubs = {
  global: {
    stubs: {
      AuthLayout: { template: '<div><slot /></div>' },
      RouterLink: true,
      Password: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] }
    }
  }
}

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStore.signUp = vi.fn()
    mockAuthStore.loading = false
    mockAuthStore.error = null
  })

  it('renders without crashing', () => {
    const wrapper = mount(RegisterView, mountStubs)
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the create account heading', () => {
    const wrapper = mount(RegisterView, mountStubs)
    expect(wrapper.text()).toContain('Create account')
  })

  it('redirects to dashboard on successful registration', async () => {
    mockAuthStore.signUp.mockResolvedValueOnce(undefined)
    const wrapper = mount(RegisterView, mountStubs)

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(mockAuthStore.signUp).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows error message on failed registration', async () => {
    mockAuthStore.signUp.mockRejectedValueOnce(new Error('Email already taken'))
    const wrapper = mount(RegisterView, mountStubs)

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Email already taken')
  })

  it('uses fallback error message for non-Error failures', async () => {
    mockAuthStore.signUp.mockRejectedValueOnce(null)
    const wrapper = mount(RegisterView, mountStubs)

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Registration failed')
  })
})
