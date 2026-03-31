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
