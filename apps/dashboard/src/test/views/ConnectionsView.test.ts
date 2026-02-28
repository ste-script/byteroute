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
