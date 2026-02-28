import { describe, it, expect } from 'vitest'
import { useTabs } from '@/composables/useTabs'
import type { TabOption } from '@/composables/useTabs'

const tabs: TabOption<'overview' | 'details' | 'settings'>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings' }
]

describe('useTabs', () => {
  describe('initial state', () => {
    it('defaults to the first tab when no initial tab is provided', () => {
      const { activeTab } = useTabs(tabs)
      expect(activeTab.value).toBe('overview')
    })

    it('uses the provided initial tab', () => {
      const { activeTab } = useTabs(tabs, 'settings')
      expect(activeTab.value).toBe('settings')
    })
  })

  describe('setActiveTab', () => {
    it('changes the active tab', () => {
      const { activeTab, setActiveTab } = useTabs(tabs)
      setActiveTab('details')
      expect(activeTab.value).toBe('details')
    })

    it('can set back to the first tab', () => {
      const { activeTab, setActiveTab } = useTabs(tabs, 'settings')
      setActiveTab('overview')
      expect(activeTab.value).toBe('overview')
    })
  })

  describe('handleTabKeydown', () => {
    function makeKeyEvent(key: string): KeyboardEvent {
      return new KeyboardEvent('keydown', { key, cancelable: true })
    }

    it('moves to the next tab on ArrowRight', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs)
      handleTabKeydown(makeKeyEvent('ArrowRight'), 0)
      expect(activeTab.value).toBe('details')
    })

    it('wraps ArrowRight from last tab to first', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs)
      handleTabKeydown(makeKeyEvent('ArrowRight'), 2) // last index
      expect(activeTab.value).toBe('overview')
    })

    it('moves to the previous tab on ArrowLeft', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs, 'details')
      handleTabKeydown(makeKeyEvent('ArrowLeft'), 1)
      expect(activeTab.value).toBe('overview')
    })

    it('wraps ArrowLeft from first tab to last', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs)
      handleTabKeydown(makeKeyEvent('ArrowLeft'), 0)
      expect(activeTab.value).toBe('settings')
    })

    it('jumps to the first tab on Home', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs, 'settings')
      handleTabKeydown(makeKeyEvent('Home'), 2)
      expect(activeTab.value).toBe('overview')
    })

    it('jumps to the last tab on End', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs, 'overview')
      handleTabKeydown(makeKeyEvent('End'), 0)
      expect(activeTab.value).toBe('settings')
    })

    it('does nothing for unrelated keys', () => {
      const { activeTab, handleTabKeydown } = useTabs(tabs, 'overview')
      handleTabKeydown(makeKeyEvent('Enter'), 0)
      expect(activeTab.value).toBe('overview')
    })

    it('calls preventDefault for navigation keys', () => {
      const event = makeKeyEvent('ArrowRight')
      const spy = vi.spyOn(event, 'preventDefault')
      const { handleTabKeydown } = useTabs(tabs)
      handleTabKeydown(event, 0)
      expect(spy).toHaveBeenCalled()
    })
  })
})
