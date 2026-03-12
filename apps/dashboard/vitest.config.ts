import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      exclude: [
        ...configDefaults.exclude,
        '**/dist/**',
        '**/dist-ssr/**',
        '**/coverage/**',
        'e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        exclude: [
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/types/**',
          // App bootstrapping – no testable logic
          'src/main.ts',
          'src/index.ts',
          'src/App.vue',
          'src/plugins/**',
          'src/components/index.ts',
          // WebGL / native-GPU components that cannot run in happy-dom
          'src/components/WorldMap.vue',
          // Complex orchestrator that composes WorldMap (requires WebGL ref)
          'src/views/DashboardView.vue'
        ]
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'happy-dom',
            include: ['src/test/**/*.test.ts'],
            exclude: ['src/test/**/*.browser.test.ts']
          }
        },
        {
          extends: true,
          test: {
            name: 'browser-chromium',
            include: ['src/test/views/DashboardView.desktop.browser.test.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'chromium' }],
              viewport: {
                width: 1280,
                height: 900
              },
              screenshotFailures: true,
              screenshotDirectory: './reports/browser-screenshots'
            }
          }
        },
        {
          extends: true,
          test: {
            name: 'browser-firefox',
            include: ['src/test/views/DashboardView.desktop.browser.test.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'firefox' }],
              viewport: {
                width: 1280,
                height: 900
              },
              screenshotFailures: true,
              screenshotDirectory: './reports/browser-screenshots'
            }
          }
        },
        {
          extends: true,
          test: {
            name: 'browser-webkit',
            include: ['src/test/views/DashboardView.desktop.browser.test.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'webkit' }],
              viewport: {
                width: 1280,
                height: 900
              },
              screenshotFailures: true,
              screenshotDirectory: './reports/browser-screenshots'
            }
          }
        },
        {
          extends: true,
          test: {
            name: 'browser-mobile',
            include: ['src/test/views/DashboardView.browser.test.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'chromium' }],
              viewport: {
                width: 390,
                height: 844
              },
              screenshotFailures: true,
              screenshotDirectory: './reports/browser-screenshots'
            }
          }
        }
      ]
    }
  })
)
