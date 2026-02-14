import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'
import { queryClient } from './plugins/query'

import 'primeicons/primeicons.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './assets/main.css'
import './assets/view-layout.css'

const app = createApp(App)

// Pinia state management
app.use(createPinia())

// Vue Router
app.use(router)

// Vue Query
app.use(VueQueryPlugin, { queryClient })

// PrimeVue UI
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark-mode',
      cssLayer: false
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
