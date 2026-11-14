// The library build: four ES module entries (the browser one, the headless one, the Node server one and the `automata`
// command), every dependency left for the game's own bundler. Declarations come from `tsc -p tsconfig.build.json`, not from here.
import { defineConfig, type UserConfig } from 'vite'
import manifest from './package.json' with { type: 'json' }
import { rapierWasm } from './vite-rapier-wasm.ts'

// Rapier is a development dependency: its code is built into the framework's own files (its plain package cannot be
// loaded by a game's bundler, which would need a plugin for the binary) and its binary comes out beside them. Every
// package in `dependencies` is left for the game.
const dependencies = Object.keys(manifest.dependencies)
// `pixi.js/unsafe-eval` is a path inside a dependency, so a prefix match, not an exact one.
// The server entry runs on Node, so its `node:` modules stay imports too.
const external = (id: string): boolean =>
  id.startsWith('node:') || dependencies.some((name) => id === name || id.startsWith(`${name}/`))

const config: UserConfig = defineConfig({
  plugins: [rapierWasm()],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        headless: 'src/headless.ts',
        server: 'src/server.ts',
        cli: 'src/cli.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: { external },
    sourcemap: true,
    target: 'es2023',
  },
})

export default config
