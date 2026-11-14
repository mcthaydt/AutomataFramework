// Starts Rapier: reads its binary and gives the instance to the package. The package's own import of the binary is
// answered by `vite-rapier-wasm.ts` at build time, so the binary is a file beside the framework's scripts and a game
// downloads it once, as a file, with its own cache.

import wasmUrl from 'virtual:rapier-wasm-url'
import * as bindings from '@dimforge/rapier2d-deterministic/rapier_wasm2d_bg.js'
import { readBinary } from '../../lib/read-binary.ts'

/** Loads Rapier's binary and wires it in. Call once; the caller keeps the promise. */
export async function loadRapier(): Promise<void> {
  const { instance } = await WebAssembly.instantiate(await readBinary(wasmUrl), {
    './rapier_wasm2d_bg.js': bindings as unknown as WebAssembly.ModuleImports,
  })
  bindings.__wbg_set_wasm(instance.exports)
}
