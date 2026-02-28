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

  async function handleCopy(): Promise<void> {
    pending.value = true
    message.value = null
    try {
      const token = await authStore.createClientToken()
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
