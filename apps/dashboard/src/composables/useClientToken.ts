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

import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

async function copyTextToClipboard(value: string): Promise<void> {
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  if (clipboard?.writeText) {
    await clipboard.writeText(value)
    return
  }

  /* v8 ignore next 3 */
  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this environment')
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.pointerEvents = 'none'
  document.body.appendChild(textArea)
  textArea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!copied) throw new Error('Failed to copy token')
}

export function useClientToken() {
  const authStore = useAuthStore()
  const pending = ref(false)
  const message = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function handleCopy(tenantId: string): Promise<void> {
    pending.value = true
    message.value = null
    try {
      const token = await authStore.createClientToken(tenantId)
      await copyTextToClipboard(token)
      message.value = 'Token copied'
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Copy failed'
    } finally {
      pending.value = false
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        message.value = null
      }, 3000)
    }
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return { pending, message, handleCopy }
}
