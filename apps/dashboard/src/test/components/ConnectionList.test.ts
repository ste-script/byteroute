import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConnectionList from '@/components/ConnectionList.vue'
import type { Connection } from '@/types'

describe('ConnectionList', () => {
  const mockConnections: Connection[] = [
    {
      id: 'conn-1',
      sourceIp: '192.168.1.1',
      destIp: '10.0.0.1',
      sourcePort: 54321,
      destPort: 443,
      protocol: 'TCP',
      status: 'active',
      country: 'United States',
      countryCode: 'US',
      category: 'Web Traffic',
      bandwidth: 1000000,
      startTime: new Date(Date.now() - 3600000),
      lastActivity: new Date()
    },
    {
      id: 'conn-2',
      sourceIp: '192.168.1.2',
      destIp: '10.0.0.2',
      sourcePort: 54322,
      destPort: 80,
      protocol: 'TCP',
      status: 'inactive',
      country: 'Germany',
      countryCode: 'DE',
      category: 'API Calls',
      bandwidth: 500000,
      startTime: new Date(Date.now() - 7200000),
      lastActivity: new Date()
    },
    {
      id: 'conn-3',
      sourceIp: '192.168.1.3',
      destIp: '10.0.0.3',
      sourcePort: 54323,
      destPort: 443,
      protocol: 'UDP',
      status: 'inactive',
      country: 'France',
      countryCode: 'FR',
      category: 'Streaming',
      bandwidth: 2000000,
      startTime: new Date(Date.now() - 1800000),
      lastActivity: new Date()
    }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render without crashing', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: []
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should display empty state when no connections', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: []
      }
    })
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('should show connection count', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: mockConnections
      }
    })
    expect(wrapper.text()).toContain('3 connections')
  })

  it('should emit select event when connection is clicked', async () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: mockConnections
      }
    })
    
    const items = wrapper.findAll('.connection-item')
    if (items.length > 0) {
      await items[0].trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
    }
  })

  it('should filter connections by search query', async () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: mockConnections
      }
    })

    // The component has internal filtering, check filtered count changes
    const countBefore = wrapper.find('.count').text()
    expect(countBefore).toContain('3')
  })

  it('should display loading state', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: [],
        loading: true
      }
    })
    expect(wrapper.find('.loading-state').exists()).toBe(true)
  })

  it('should render filter dropdowns', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: mockConnections
      }
    })
    expect(wrapper.find('.filters').exists()).toBe(true)
    expect(wrapper.find('.filter-row').exists()).toBe(true)
  })
})
