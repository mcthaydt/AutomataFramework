// The library build: three ES module entries (the browser one, the headless one and the Node server one), every
// dependency left for the game's own bundler. Declarations come from `tsc -p tsconfig.build.json`, not from here.
import { defineConfig, type UserConfig } from 'vite'
import manifest from './package.json' with { type: 'json' }

const dependencies = Object.keys(manifest.dependencies)
// `pixi.js/unsafe-eval` is a path inside a dependency, so a prefix match, not an exact one.
// The server entry runs on Node, so its `node:` modules stay imports too.
const external = (id: string): boolean =>
  id.startsWith('node:') || dependencies.some((name) => id === name || id.startsWith(`${name}/`))

const config: UserConfig = defineConfig({
  build: {
    lib: {
      entry: { index: 'src/index.ts', headless: 'src/headless.ts', server: 'src/server.ts' },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: { external },
    sourcemap: true,
    target: 'es2023',
  },
})

export default config
