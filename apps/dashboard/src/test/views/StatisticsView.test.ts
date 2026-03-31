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

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

describe('StatisticsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing', async () => {
    const { default: StatisticsView } = await import('@/views/StatisticsView.vue')
    const wrapper = mount(StatisticsView, {
      global: {
        stubs: {
          RouterLink: true,
          StatisticsPanel: { template: '<div class="stub-statistics-panel" />' }
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the page heading', async () => {
    const { default: StatisticsView } = await import('@/views/StatisticsView.vue')
    const wrapper = mount(StatisticsView, {
      global: {
        stubs: {
          RouterLink: true,
          StatisticsPanel: { template: '<div />' }
        }
      }
    })
    expect(wrapper.text()).toContain('Statistics')
  })

  it('renders StatisticsPanel component', async () => {
    const { default: StatisticsView } = await import('@/views/StatisticsView.vue')
    const wrapper = mount(StatisticsView, {
      global: {
        stubs: {
          RouterLink: true,
          StatisticsPanel: { template: '<div class="stub-statistics-panel" />' }
        }
      }
    })
    expect(wrapper.find('.stub-statistics-panel').exists()).toBe(true)
  })
})
