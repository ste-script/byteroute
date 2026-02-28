import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthLayout from '@/components/AuthLayout.vue'

describe('AuthLayout', () => {
  it('renders without crashing', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'test-title' },
      slots: { default: '<h1 id="test-title">Test</h1>' }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders default slot content', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'my-title' },
      slots: { default: '<p class="slot-content">Hello</p>' }
    })
    expect(wrapper.find('.slot-content').exists()).toBe(true)
  })

  it('sets aria-labelledby from titleId prop', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'form-title' },
      slots: { default: '<span />' }
    })
    expect(wrapper.find('.auth-card').attributes('aria-labelledby')).toBe('form-title')
  })

  it('renders the main landmark with correct id', () => {
    const wrapper = mount(AuthLayout, {
      props: { titleId: 'x' },
      slots: { default: '<span />' }
    })
    expect(wrapper.find('#main-content').exists()).toBe(true)
  })
})
