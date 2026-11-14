// Six Vitest projects. Test file suffixes decide where a test runs:
//   *.test.ts          Node
//   *.parity.test.ts   Node and all three browsers: the same hash must come out of every engine
//   *.browser.test.ts  the three browsers only (layout, DOM, canvas)
//   *.journey.test.ts  Node, driving real browsers of its own (Playwright) against a server it starts; the ones under
//                      tests/create/ are their own project, run from the packed package
// Node is the fourth engine of the determinism proof; the browsers are real Chromium, WebKit and Firefox.
import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, type ViteUserConfig } from 'vitest/config'
import { rapierWasm } from './vite-rapier-wasm.ts'

const ENGINES = ['chromium', 'webkit', 'firefox'] as const

const node = {
  extends: true,
  test: {
    name: 'node',
    environment: 'node',
    include: ['tests/**/*.test.ts', 'template/tests/**/*.test.ts'],
    exclude: ['**/*.browser.test.ts', '**/*.journey.test.ts', '**/node_modules/**'],
  },
}

// A journey starts the room server and a built page, and opens them in real browsers it launches itself, so it is a Node
// test that takes minutes: its own project, run by the `online` job and never by the fast `node` one.
const journeys = {
  extends: true,
  test: {
    name: 'journeys',
    environment: 'node',
    include: ['tests/journeys/**/*.journey.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
}

// The new game, made from the packed package and played in real browsers: the `create-play` job's own project, so
// `test:journeys` never runs it and `test:create` runs nothing else.
const create = {
  extends: true,
  test: {
    name: 'create',
    environment: 'node',
    include: ['tests/create/**/*.journey.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
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
// The template game imports the package by its published names; here they are this repo's own entries.
const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))
const config: ViteUserConfig = defineConfig({
  plugins: [rapierWasm()],
  resolve: {
    alias: [
      { find: /^@automataframework\/framework\/headless$/, replacement: here('./src/headless.ts') },
      { find: /^@automataframework\/framework$/, replacement: here('./src/index.ts') },
    ],
  },
  optimizeDeps: { exclude: [RAPIER] },
  test: {
    server: { deps: { inline: [RAPIER] } },
    projects: [node, journeys, create, ...ENGINES.map(inBrowser)],
  },
})

export default config
