import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockSocket = vi.hoisted(() => ({
  disconnect: vi.fn(),
  connect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(() => () => {}),
  isConnected: { value: false },
  connectionError: { value: null },
}))

vi.mock('@/services/socket', () => ({
  useSocket: vi.fn(() => mockSocket),
}))

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn(async () => []),
  createTenant: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('DashboardView (no tenants)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('renders the create-first-tenant empty state when the tenants API returns an empty list', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: { template: '<header />' },
          WorldMap: { template: '<div />' },
          TrafficChart: { template: '<div />' },
          StatisticsPanel: { template: '<div />' },
          ConnectionList: { template: '<div />' },
          NewTenantDialog: { template: '<div />' },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Create your first tenant')
    expect(wrapper.text()).toContain('No tenants found for this account')

    expect(mockSocket.connect).not.toHaveBeenCalled()
  })
})
