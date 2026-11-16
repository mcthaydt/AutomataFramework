// The play test: the built game opened in real browsers. It is not part of `npm test`, which needs no browser; run it with
// `npm run build` and then `npm run play-test`. One file at a time, since each opens browsers of its own.
import { defineConfig, type ViteUserConfig } from 'vitest/config'

const config: ViteUserConfig = defineConfig({
  test: {
    include: ['tests/play/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})

export default config
