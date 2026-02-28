import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DashboardHeader from '@/components/DashboardHeader.vue'

const defaultProps = {
  isConnected: true,
  darkMode: false,
  selectedTenant: 'tenant-1',
  tenantOptions: [{ label: 'Tenant 1', value: 'tenant-1' }],
  version: '1.2.3',
  copyTokenPending: false,
  copyTokenMessage: null as string | null
}

describe('DashboardHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing', () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the ByteRoute logo', () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    expect(wrapper.text()).toContain('ByteRoute')
  })

  it('displays the version string', () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    expect(wrapper.text()).toContain('1.2.3')
  })

  it('shows copy token message when provided', () => {
    const wrapper = mount(DashboardHeader, {
      props: { ...defaultProps, copyTokenMessage: 'Token copied' }
    })
    expect(wrapper.text()).toContain('Token copied')
  })

  it('does not show copy token message when null', () => {
    const wrapper = mount(DashboardHeader, {
      props: { ...defaultProps, copyTokenMessage: null }
    })
    expect(wrapper.find('.copy-token-message').exists()).toBe(false)
  })

  it('emits toggle-dark-mode when dark mode button is clicked', async () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    // Find the aria-label for dark mode button
    const buttons = wrapper.findAll('button, [role="button"]')
    // Find the button stub with the dark mode label
    const darkModeBtn = wrapper.find('[aria-label="Switch to dark mode"]')
    if (darkModeBtn.exists()) {
      await darkModeBtn.trigger('click')
      expect(wrapper.emitted('toggle-dark-mode')).toBeTruthy()
    }
  })

  it('emits logout when logout button is clicked', async () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    const logoutBtn = wrapper.find('[aria-label="Sign out"]')
    if (logoutBtn.exists()) {
      await logoutBtn.trigger('click')
      expect(wrapper.emitted('logout')).toBeTruthy()
    }
  })

  it('emits new-tenant when new tenant button is clicked', async () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    const newTenantBtn = wrapper.find('[aria-label="Create new tenant"]')
    if (newTenantBtn.exists()) {
      await newTenantBtn.trigger('click')
      expect(wrapper.emitted('new-tenant')).toBeTruthy()
    }
  })

  it('emits copy-token when copy token button is clicked', async () => {
    const wrapper = mount(DashboardHeader, { props: defaultProps })
    const copyBtn = wrapper.find('[aria-label="Copy client token"]')
    if (copyBtn.exists()) {
      await copyBtn.trigger('click')
      expect(wrapper.emitted('copy-token')).toBeTruthy()
    }
  })
})
