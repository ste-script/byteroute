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
