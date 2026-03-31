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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

const mockAuthStore = {
  createClientToken: vi.fn()
}

// Must be imported after the mock so the composable picks it up
import { useClientToken } from '@/composables/useClientToken'

describe('useClientToken', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('pending is false initially', () => {
      const { pending } = useClientToken()
      expect(pending.value).toBe(false)
    })

    it('message is null initially', () => {
      const { message } = useClientToken()
      expect(message.value).toBeNull()
    })
  })

  describe('handleCopy - success', () => {
    it('copies token and sets message to "Token copied"', async () => {
      mockAuthStore.createClientToken.mockResolvedValueOnce('my-secret-token')

      const writeText = vi.fn().mockResolvedValueOnce(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true
      })

      const { pending, message, handleCopy } = useClientToken()

      const promise = handleCopy('tenant-b')
      expect(pending.value).toBe(true)

      await promise

      expect(mockAuthStore.createClientToken).toHaveBeenCalledWith('tenant-b')
      expect(writeText).toHaveBeenCalledWith('my-secret-token')
      expect(message.value).toBe('Token copied')
      expect(pending.value).toBe(false)
    })

    it('clears message after 3 seconds', async () => {
      mockAuthStore.createClientToken.mockResolvedValueOnce('token')
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValueOnce(undefined) },
        configurable: true
      })

      const { message, handleCopy } = useClientToken()
      await handleCopy('tenant-b')

      expect(message.value).toBe('Token copied')
      vi.advanceTimersByTime(3000)
      expect(message.value).toBeNull()
    })
  })

  describe('handleCopy - textarea clipboard fallback', () => {
    it('uses document.execCommand when navigator.clipboard.writeText is unavailable', async () => {
      mockAuthStore.createClientToken.mockResolvedValueOnce('fallback-token')
      // Remove writeText to trigger textarea path
      Object.defineProperty(navigator, 'clipboard', {
        value: {}, // no writeText
        configurable: true
      })

      // happy-dom does not define execCommand — add it before spying
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn().mockReturnValueOnce(true),
        writable: true,
        configurable: true
      })
      const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValueOnce(true)

      const { message, handleCopy } = useClientToken()
      await handleCopy('tenant-b')

      expect(execCommandSpy).toHaveBeenCalledWith('copy')
      expect(message.value).toBe('Token copied')
      execCommandSpy.mockRestore()
    })

    it('throws when execCommand returns false', async () => {
      mockAuthStore.createClientToken.mockResolvedValueOnce('token')
      Object.defineProperty(navigator, 'clipboard', {
        value: {},
        configurable: true
      })

      // Define execCommand so vi.spyOn can attach to it
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn().mockReturnValueOnce(false),
        writable: true,
        configurable: true
      })
      vi.spyOn(document, 'execCommand').mockReturnValueOnce(false)

      const { message, handleCopy } = useClientToken()
      await handleCopy('tenant-b')

      expect(message.value).toBe('Failed to copy token')
    })
  })

  describe('timer reset', () => {
    it('clears the previous timer when handleCopy is called again', async () => {
      mockAuthStore.createClientToken.mockResolvedValue('token')
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true
      })

      const { message, handleCopy } = useClientToken()

      // First call
      await handleCopy('tenant-b')
      expect(message.value).toBe('Token copied')

      // Second call before the 3s timeout fires – should reset timer without error
      await handleCopy('tenant-b')
      expect(message.value).toBe('Token copied')

      // Advance past the timeout
      vi.advanceTimersByTime(3000)
      expect(message.value).toBeNull()
    })
  })
    it('sets error message when createClientToken fails', async () => {
      mockAuthStore.createClientToken.mockRejectedValueOnce(new Error('Unauthorized'))

      const { pending, message, handleCopy } = useClientToken()
      await handleCopy('tenant-b')

      expect(message.value).toBe('Unauthorized')
      expect(pending.value).toBe(false)
    })

    it('sets "Copy failed" for non-Error rejections', async () => {
      mockAuthStore.createClientToken.mockRejectedValueOnce('something bad')

      const { message, handleCopy } = useClientToken()
      await handleCopy('tenant-b')

      expect(message.value).toBe('Copy failed')
    })

    it('sets error message when clipboard write fails', async () => {
      mockAuthStore.createClientToken.mockResolvedValueOnce('token')
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValueOnce(new Error('Clipboard denied')) },
        configurable: true
      })

      const { message, handleCopy } = useClientToken()
      await handleCopy()

      expect(message.value).toBe('Clipboard denied')
    })
})

