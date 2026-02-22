import { ref } from 'vue'

export interface TabOption<T extends string> {
  id: T
  label: string
}

export function useTabs<T extends string>(options: TabOption<T>[], initial?: T) {
  const activeTab = ref<T>(initial ?? options[0]!.id)

  function setActiveTab(tab: T) {
    activeTab.value = tab
  }

  function handleTabKeydown(event: KeyboardEvent, index: number) {
    const key = event.key
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return

    event.preventDefault()
    let nextIndex = index

    if (key === 'ArrowRight') nextIndex = (index + 1) % options.length
    else if (key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length
    else if (key === 'Home') nextIndex = 0
    else if (key === 'End') nextIndex = options.length - 1

    activeTab.value = options[nextIndex]!.id
  }

  return { activeTab, setActiveTab, handleTabKeydown }
}
