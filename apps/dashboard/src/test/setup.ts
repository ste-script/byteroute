import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  } as unknown as ResizeObserver
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  } as unknown as IntersectionObserver
})

// Stub PrimeVue components globally
config.global.stubs = {
  Toast: true,
  ConfirmDialog: true,
  Button: true,
  InputText: true,
  Dropdown: true,
  Select: true,
  Tag: true,
  Badge: true,
  SelectButton: true
}

// Provide common mocks
config.global.mocks = {
  $t: (msg: string) => msg
}
