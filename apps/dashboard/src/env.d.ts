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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Build-time constants injected by Vite
declare const __APP_VERSION__: string
