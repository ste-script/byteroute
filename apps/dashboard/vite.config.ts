import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Read version from package.json at build time
import { readFileSync } from 'node:fs'
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/node_modules/vue/') || id.includes('/node_modules/vue-router/') || id.includes('/node_modules/pinia/')) {
            return 'vendor-vue'
          }

          if (id.includes('/node_modules/primevue/') || id.includes('/node_modules/@primevue/')) {
            return 'vendor-primevue'
          }

          if (id.includes('/node_modules/echarts/')) {
            return 'vendor-echarts'
          }

          if (id.includes('/node_modules/vue-echarts/')) {
            return 'vendor-vue-echarts'
          }

          if (id.includes('/node_modules/maplibre-gl/')) {
            return 'vendor-maplibre-gl'
          }

          if (id.includes('/node_modules/@maplibre/')) {
            return 'vendor-maplibre'
          }

          if (id.includes('/node_modules/@luma.gl/')) {
            return 'vendor-luma'
          }

          if (id.includes('/node_modules/@math.gl/')) {
            return 'vendor-math'
          }

          if (id.includes('/node_modules/@probe.gl/')) {
            return 'vendor-probe'
          }

          if (id.includes('/node_modules/@deck.gl/core/')) {
            return 'vendor-deck-core'
          }

          if (id.includes('/node_modules/@deck.gl/layers/')) {
            return 'vendor-deck-layers'
          }

          if (id.includes('/node_modules/@deck.gl/mapbox/')) {
            return 'vendor-deck-mapbox'
          }

          if (id.includes('/node_modules/@loaders.gl/')) {
            return 'vendor-loaders'
          }

          if (id.includes('/node_modules/socket.io-client/')) {
            return 'vendor-socket'
          }

          return 'vendor-misc'
        }
      }
    }
  }
})
