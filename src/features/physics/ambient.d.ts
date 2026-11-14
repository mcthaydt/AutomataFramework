// What the loader imports that the package and Vite do not describe.
declare module 'virtual:rapier-wasm-binary' {
  export function readRapierBinary(): Promise<BufferSource>
}
declare module '@dimforge/rapier2d-deterministic/rapier_wasm2d_bg.js' {
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void
}
