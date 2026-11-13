// Four Vitest projects. Test file suffixes decide where a test runs:
//   *.test.ts          Node
//   *.parity.test.ts   Node and all three browsers: the same hash must come out of every engine
//   *.browser.test.ts  the three browsers only (layout, DOM, canvas)
// Node is the fourth engine of the determinism proof; the browsers are real Chromium, WebKit and Firefox.
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, type ViteUserConfig } from 'vitest/config'

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
const config: ViteUserConfig = defineConfig({
  test: { projects: [node, ...ENGINES.map(inBrowser)] },
})

export default config
