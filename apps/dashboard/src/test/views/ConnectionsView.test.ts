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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

describe('ConnectionsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing', async () => {
    const { default: ConnectionsView } = await import('@/views/ConnectionsView.vue')
    const wrapper = mount(ConnectionsView, {
      global: {
        stubs: {
          RouterLink: true,
          ConnectionList: { template: '<div class="stub-connection-list" />' }
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the page heading', async () => {
    const { default: ConnectionsView } = await import('@/views/ConnectionsView.vue')
    const wrapper = mount(ConnectionsView, {
      global: {
        stubs: {
          RouterLink: true,
          ConnectionList: { template: '<div />' }
        }
      }
    })
    expect(wrapper.text()).toContain('Connections')
  })

  it('handleSelect logs the connection', async () => {
    const { default: ConnectionsView } = await import('@/views/ConnectionsView.vue')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(ConnectionsView, {
      global: {
        stubs: {
          RouterLink: true,
          ConnectionList: {
            template: '<div />',
            emits: ['select']
          }
        }
      }
    })

    const vm = wrapper.vm as unknown as { handleSelect: (c: object) => void }
    vm.handleSelect({ id: 'conn-1' })

    expect(consoleSpy).toHaveBeenCalledWith('Selected:', { id: 'conn-1' })
    consoleSpy.mockRestore()
  })
})
