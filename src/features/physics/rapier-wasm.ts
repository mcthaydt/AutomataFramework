// Starts Rapier: gives the package its binary's instance. The bytes come from a module the build writes
// (`vite-rapier-wasm.ts`), because reading a file is I/O and this feature may not do any. The package's own import of
// the binary is answered by the same plugin, so the binary is a file beside the framework's scripts and a game
// downloads it once, as a file, with its own cache.

import { readRapierBinary } from 'virtual:rapier-wasm-binary'
import * as bindings from '@dimforge/rapier2d-deterministic/rapier_wasm2d_bg.js'

/** Loads Rapier's binary and wires it in. Call once; the caller keeps the promise. */
export async function loadRapier(): Promise<void> {
  const { instance } = await WebAssembly.instantiate(await readRapierBinary(), {
    './rapier_wasm2d_bg.js': bindings as unknown as WebAssembly.ModuleImports,
  })
  bindings.__wbg_set_wasm(instance.exports)
}
