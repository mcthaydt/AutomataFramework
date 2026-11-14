// Rapier's plain package imports its binary as `import * as wasm from './rapier_wasm2d_bg.wasm'`, the "wasm as an ES
// module" form no bundler in this repo handles. This plugin answers that one import with an empty module, so the
// package's JavaScript loads and holds no wasm yet. The framework's own loader (`src/features/physics/rapier-wasm.ts`)
// then fetches the binary and hands the instance to the package, getting its address from `virtual:rapier-wasm-url`,
// which this plugin also provides. A library build would turn the binary into base64 text inside a script, which is
// what the `-compat` package did and why the game was 400 kB larger, so the build emits it as a file of its own
// (`dist/rapier_wasm2d_bg.wasm`) and the address is relative to the script that holds it.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

const EMPTY = '\0rapier-wasm-empty'
const ADDRESS = 'virtual:rapier-wasm-url'
const ADDRESS_ID = `\0${ADDRESS}`
const PLACEHOLDER = '__RAPIER_WASM_URL__'
const PACKAGE = '@dimforge/rapier2d-deterministic'

export function rapierWasm(): Plugin {
  const binary = createRequire(import.meta.url).resolve(`${PACKAGE}/rapier_wasm2d_bg.wasm`)
  return {
    name: 'automata:rapier-wasm',
    enforce: 'pre',
    async resolveId(source, importer) {
      // The package names its entry only as `module`, which a Node-side Vite (Vitest) does not read.
      if (source === PACKAGE) return this.resolve(`${PACKAGE}/rapier.js`, importer, { skipSelf: true })
      if (source === ADDRESS) return ADDRESS_ID
      if (source === './rapier_wasm2d_bg.wasm' && importer?.includes('rapier2d-deterministic')) return EMPTY
      return undefined
    },
    // Rapier is Apache-2.0 and now travels inside the framework's files, so its licence travels beside them.
    buildStart() {
      if (this.environment?.mode !== 'build') return
      this.emitFile({
        type: 'asset',
        fileName: 'rapier.LICENSE',
        source: readFileSync(join(dirname(binary), 'LICENSE')),
      })
    },
    renderChunk(code) {
      if (!code.includes(PLACEHOLDER)) return null
      // The one line changes in place, so the chunk's sourcemap still lines up.
      return {
        code: code.replaceAll(
          JSON.stringify(PLACEHOLDER),
          "new URL('./rapier_wasm2d_bg.wasm', import.meta.url).href",
        ),
        map: null,
      }
    },
    load(id) {
      if (id === EMPTY) return 'export {}'
      if (id !== ADDRESS_ID) return undefined
      // A build: the binary becomes a file of the output. The address is written in `renderChunk` below, after Vite's own
      // passes, because they would rewrite `new URL(…, import.meta.url)` into a form a game's bundler does not recognise,
      // and the game's bundler is what must find the file and carry it into the game.
      if (this.environment?.mode === 'build') {
        this.emitFile({ type: 'asset', fileName: 'rapier_wasm2d_bg.wasm', source: readFileSync(binary) })
        return `export default ${JSON.stringify(PLACEHOLDER)}`
      }
      // A dev server (Vitest included): Node reads the file by its address; a page asks the server for it by path.
      return `export default ${JSON.stringify(this.environment?.config.consumer === 'server' ? pathToFileURL(binary).href : `/@fs${binary}`)}`
    },
  }
}
