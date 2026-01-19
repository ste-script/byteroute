import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      exclude: [
        ...configDefaults.exclude,
        '**/dist/**',
        '**/dist-ssr/**',
        '**/coverage/**',
        'e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        exclude: [
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/types/**'
        ]
      }
    }
  })
)
