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
