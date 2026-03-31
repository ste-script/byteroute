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
