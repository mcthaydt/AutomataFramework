// The kit's sheet (`Sheet.svelte`), typed: a `.svelte` import is only a wildcard to the compiler, so the props the tests
// give it are said here once.
import type { Component } from 'svelte'
import SheetPart from './Sheet.svelte'

export type SheetProps = {
  /** Told everything that happens on the sheet, as "what:value". */
  readonly log: (what: string) => void
  /** A list long enough to scroll. Default true. */
  readonly long?: boolean
}

export const Sheet: Component<SheetProps> = SheetPart as never
