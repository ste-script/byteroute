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
