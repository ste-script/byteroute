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

const hoistedMocks = vi.hoisted(() => ({
  selectedTenant: { value: 'tenant-1' },
  discoveredTenants: { value: [] as string[] },
  handleCopyToken: vi.fn(),
}))

vi.mock('@/composables/useTenantManager', () => ({
  useTenantManager: () => ({
    selectedTenant: hoistedMocks.selectedTenant,
    tenantOptions: { value: [{ label: 'tenant-1', value: 'tenant-1' }] },
    discoveredTenants: hoistedMocks.discoveredTenants,
    loadDiscoveredTenants: vi.fn(async () => []),
    connectTenant: vi.fn(),
    handleTenantChange: vi.fn(),
  }),
}))

vi.mock('@/composables/useClientToken', () => ({
  useClientToken: () => ({
    pending: { value: false },
    message: { value: null as string | null },
    handleCopy: hoistedMocks.handleCopyToken,
  }),
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
    hoistedMocks.selectedTenant.value = 'tenant-1'
    hoistedMocks.discoveredTenants.value = []
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
          NewTenantDialog: {
            props: ['visible'],
            template: '<div data-test="new-tenant-dialog">{{ visible ? "open" : "closed" }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Set up your first tenant')
    expect(wrapper.text()).toContain('Step 1')
    expect(wrapper.text()).toContain('Step 2')
    expect(wrapper.text()).toContain('World Traffic')
    expect(wrapper.text()).toContain('Live Connections')
    expect(wrapper.text()).toContain('Traffic Timeline')

    expect(mockSocket.connect).not.toHaveBeenCalled()
  })

  it('opens the tenant dialog from the wizard primary action', async () => {
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
          NewTenantDialog: {
            props: ['visible'],
            template: '<div data-test="new-tenant-dialog">{{ visible ? "open" : "closed" }}</div>'
          },
        },
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="new-tenant-dialog"]').text()).toBe('closed')

    await wrapper.get('[data-test="wizard-open-create-tenant"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="new-tenant-dialog"]').text()).toBe('open')
  })

  it('copies a client token for the selected tenant', async () => {
    const { default: DashboardView } = await import('@/views/DashboardView.vue')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          RouterLink: true,
          DashboardHeader: {
            template: '<button type="button" data-test="copy-token" @click="$emit(\'copy-token\')">Copy</button>'
          },
          WorldMap: { template: '<div />' },
          TrafficChart: { template: '<div />' },
          StatisticsPanel: { template: '<div />' },
          ConnectionList: { template: '<div />' },
          NewTenantDialog: { template: '<div />' },
        },
      },
    })

    await wrapper.get('[data-test="copy-token"]').trigger('click')

    expect(hoistedMocks.handleCopyToken).toHaveBeenCalledWith('tenant-1')
  })
})
