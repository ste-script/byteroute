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

/// <reference types="vite/client" />

declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue'
  export const RecycleScroller: DefineComponent<{
    items: unknown[]
    itemSize: number
    keyField?: string
  }>
  export const DynamicScroller: DefineComponent
  export const DynamicScrollerItem: DefineComponent
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_TENANT_ID?: string
  readonly VITE_TENANTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Build-time constants injected by Vite
declare const __APP_VERSION__: string
