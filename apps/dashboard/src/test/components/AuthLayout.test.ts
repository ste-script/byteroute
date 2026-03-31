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

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthLayout from '@/components/AuthLayout.vue'

describe('AuthLayout', () => {
  it('renders without crashing', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'test-title' },
      slots: { default: '<h1 id="test-title">Test</h1>' }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders default slot content', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'my-title' },
      slots: { default: '<p class="slot-content">Hello</p>' }
    })
    expect(wrapper.find('.slot-content').exists()).toBe(true)
  })

  it('sets aria-labelledby from titleId prop', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'form-title' },
      slots: { default: '<span />' }
    })
    expect(wrapper.find('.auth-card').attributes('aria-labelledby')).toBe('form-title')
  })

  it('renders the main landmark with correct id', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'x' },
      slots: { default: '<span />' }
    })
    expect(wrapper.find('#main-content').exists()).toBe(true)
  })
})
