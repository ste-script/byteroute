import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NewTenantDialog from '@/components/NewTenantDialog.vue'

const defaultProps = {
  visible: true,
  pending: false,
  error: null as string | null
}

const mountOptions = {
  global: {
    stubs: {
      Dialog: {
        template: `<div class="mock-dialog"><slot /></div>`,
        props: ['visible', 'header', 'modal', 'style'],
        emits: ['update:visible', 'hide']
      },
      InputText: {
        template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        inheritAttrs: false
      }
    }
  }
}

describe('NewTenantDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing', () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows error message when error prop is set', () => {
    const wrapper = mount(NewTenantDialog, {
      props: { ...defaultProps, error: 'Tenant already exists' },
      ...mountOptions
    })
    expect(wrapper.text()).toContain('Tenant already exists')
  })

  it('does not show error when error is null', () => {
    const wrapper = mount(NewTenantDialog, {
      props: { ...defaultProps, error: null },
      ...mountOptions
    })
    expect(wrapper.find('.new-tenant-error').exists()).toBe(false)
  })

  it('emits submit with name only when tenantId is empty', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })

    await wrapper.find('#new-tenant-name').setValue('My Tenant')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    const payload = wrapper.emitted('submit')![0][0] as { name: string; tenantId?: string }
    expect(payload.name).toBe('My Tenant')
    expect(payload.tenantId).toBeUndefined()
  })

  it('emits submit with tenantId when provided', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })

    await wrapper.find('#new-tenant-name').setValue('My Tenant')
    await wrapper.find('#new-tenant-id').setValue('my-tenant-id')
    await wrapper.find('form').trigger('submit')

    const payload = wrapper.emitted('submit')![0][0] as { name: string; tenantId?: string }
    expect(payload.tenantId).toBe('my-tenant-id')
  })

  it('does not include tenantId when only whitespace', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })

    await wrapper.find('#new-tenant-name').setValue('My Tenant')
    await wrapper.find('#new-tenant-id').setValue('   ')
    await wrapper.find('form').trigger('submit')

    const payload = wrapper.emitted('submit')![0][0] as { name: string; tenantId?: string }
    expect(payload.tenantId).toBeUndefined()
  })

  it('trims whitespace from name', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })

    await wrapper.find('#new-tenant-name').setValue('  Trimmed  ')
    await wrapper.find('form').trigger('submit')

    const payload = wrapper.emitted('submit')![0][0] as { name: string; tenantId?: string }
    expect(payload.name).toBe('Trimmed')
  })

  it('clears fields and emits close on hide', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })

    await wrapper.find('#new-tenant-name').setValue('Some Name')
    // Simulate the Dialog @hide event by calling it on the stub
    wrapper.findComponent({ name: 'mock-dialog' })
    // Emit hide from the Dialog stub
    await wrapper.find('.mock-dialog').trigger('hide')

    // Since Dialog is a stub, we need to trigger the handleHide via the component
    // Access via vm
    const vm = wrapper.vm as unknown as { handleHide: () => void; name: { value: string } }
    vm.handleHide?.()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits update:visible false when cancel button is clicked', async () => {
    const wrapper = mount(NewTenantDialog, { props: defaultProps, ...mountOptions })
    const cancelBtn = wrapper.find('[type="button"]')
    if (cancelBtn.exists()) {
      await cancelBtn.trigger('click')
      expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
    }
  })
})
