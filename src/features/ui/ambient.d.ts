// What a `.svelte` import is, for the compilers that do not read Svelte: `tsc -p .` and the declarations build only
// see `.ts` files, so a part is typed by `ui.ts` and the screens, never by what is in the file. `svelte-check` reads the
// real types.
declare module '*.svelte' {
  import type { Component } from 'svelte'

  const part: Component<Record<string, never>>
  export default part
}
