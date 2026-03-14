import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FirstTenantWizard from '@/components/FirstTenantWizard.vue'

describe('FirstTenantWizard', () => {
  it('explains onboarding steps and dashboard sections', () => {
    const wrapper = mount(FirstTenantWizard)

    expect(wrapper.text()).toContain('Set up your first tenant')
    expect(wrapper.text()).toContain('Step 1')
    expect(wrapper.text()).toContain('Step 2')
    expect(wrapper.text()).toContain('World Traffic')
    expect(wrapper.text()).toContain('Statistics')
    expect(wrapper.text()).toContain('Live Connections')
    expect(wrapper.text()).toContain('Traffic Timeline')
  })

  it('emits create-tenant from the primary action', async () => {
    const wrapper = mount(FirstTenantWizard)

    await wrapper.get('[data-test="wizard-open-create-tenant"]').trigger('click')

    expect(wrapper.emitted('create-tenant')).toBeTruthy()
  })
})
