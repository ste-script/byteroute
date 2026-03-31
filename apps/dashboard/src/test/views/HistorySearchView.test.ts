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

const hoisted = vi.hoisted(() => ({
  listTenants: vi.fn(async () => ['tenant-a']),
  searchConnectionHistory: vi.fn(async () => ({
    items: [{ id: 'conn-1', sourceIp: '10.0.0.1', destIp: '8.8.8.8', protocol: 'TCP', status: 'active', asn: 13335, asOrganization: 'Cloudflare', lastActivity: '2026-01-01T00:00:00.000Z' }],
    total: 250,
  })),
}))

vi.mock('@/services/tenants', () => ({
  listTenants: hoisted.listTenants,
}))

vi.mock('@/services/history', () => ({
  searchConnectionHistory: hoisted.searchConnectionHistory,
}))

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('HistorySearchView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the page heading', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })
    expect(wrapper.text()).toContain('Historical Data Search')
  })

  it('renders ASN data in the table', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('ASN')
    expect(wrapper.text()).toContain('Cloudflare (13335)')
  })

  it('requests first page with default limit and offset', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true,
        }
      }
    })

    await flushPromises()

    expect(hoisted.searchConnectionHistory).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ limit: 100, offset: 0 })
    )
  })

  it('moves to next page using offset + limit', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true,
        }
      }
    })

    await flushPromises()
    hoisted.searchConnectionHistory.mockClear()

    await wrapper.get('[data-test="pagination-next"]').trigger('click')
    await flushPromises()

    expect(hoisted.searchConnectionHistory).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ limit: 100, offset: 100 })
    )
  })

  it('resets offset when page size changes', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true,
        }
      }
    })

    await flushPromises()

    await wrapper.get('[data-test="pagination-next"]').trigger('click')
    await flushPromises()
    hoisted.searchConnectionHistory.mockClear()

    await wrapper.get('[data-test="pagination-limit"]').setValue('25')
    await flushPromises()

    expect(hoisted.searchConnectionHistory).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ limit: 25, offset: 0 })
    )
  })

  it('starts a search on form submit (Enter key path)', async () => {
    const { default: HistorySearchView } = await import('@/views/HistorySearchView.vue')
    const wrapper = mount(HistorySearchView, {
      global: {
        stubs: {
          RouterLink: true,
        }
      }
    })

    await flushPromises()
    hoisted.searchConnectionHistory.mockClear()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(hoisted.searchConnectionHistory).toHaveBeenCalledTimes(1)
    expect(hoisted.searchConnectionHistory).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ limit: 100, offset: 0 })
    )
  })
})
