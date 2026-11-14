// Four Vitest projects. Test file suffixes decide where a test runs:
//   *.test.ts          Node
//   *.parity.test.ts   Node and all three browsers: the same hash must come out of every engine
//   *.browser.test.ts  the three browsers only (layout, DOM, canvas)
// Node is the fourth engine of the determinism proof; the browsers are real Chromium, WebKit and Firefox.
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, type ViteUserConfig } from 'vitest/config'
import { rapierWasm } from './vite-rapier-wasm.ts'

const ENGINES = ['chromium', 'webkit', 'firefox'] as const

const node = {
  extends: true,
  test: {
    name: 'node',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/*.browser.test.ts', '**/node_modules/**'],
  },
}

// One project per engine, so CI can run them as parallel jobs and a failing engine is named by the job.
const inBrowser = (engine: (typeof ENGINES)[number]) => ({
  extends: true,
  test: {
    name: engine,
    include: ['tests/**/*.parity.test.ts', 'tests/**/*.browser.test.ts'],
    // A shared runner can be slow to start a page; a hang is still caught.
    testTimeout: 60_000,
    hookTimeout: 90_000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: engine }],
    },
  },
})

// Annotated because the repo's tsconfig demands explicit types on everything exported.
// Rapier's plain package is not loadable as it stands (its imports have no extensions and it imports its binary as an
// ES module), so every project runs it through Vite and the `rapierWasm` plugin: Node inlines it instead of loading it
// from disk, and the browsers are told not to pre-bundle it, which would skip the plugin.
const RAPIER = '@dimforge/rapier2d-deterministic'
const config: ViteUserConfig = defineConfig({
  plugins: [rapierWasm()],
  optimizeDeps: { exclude: [RAPIER] },
  test: { server: { deps: { inline: [RAPIER] } }, projects: [node, ...ENGINES.map(inBrowser)] },
})

export default config
