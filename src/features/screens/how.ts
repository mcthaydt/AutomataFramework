// "How to play": the level's goal when the game has one, then one row for each thing the hero can do and how to do it on
// the device in use, and Back. It opens on top of the main menu and of the pause screen, and Back returns to where it was
// opened. The rows are asked again when the device in use changes, so a gamepad plugged in while it is open is told.
import type { Component } from 'svelte'
import HowPart from './How.svelte'
import type { HowRow } from './how-rows.ts'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

export type { HowRow } from './how-rows.ts'

/** What the screen draws. */
export type HowProps = {
  readonly title: string
  readonly goal?: string
  readonly rows: readonly HowRow[]
  readonly back: string
  readonly onback: () => void
}

const Part: Component<HowProps> = HowPart as never

/** The "How to play" screen. Escape and the pad's right button go back. */
export function howScreen(
  options: ScreenBase & {
    /** The level's goal in the player's words, when the game has one. */
    readonly goal?: string
    /** The rows now: asked again by `update`. */
    readonly rows: () => readonly HowRow[]
    readonly onBack: () => void
  },
): Screen & {
  /** Draws the rows again, after the device in use changed. */
  update(): void
} {
  const { goal, rows, onBack } = options
  return show(
    Part,
    { ...options, name: 'how' },
    (words): HowProps => ({
      title: words('automata.menu.how'),
      ...(goal === undefined ? {} : { goal }),
      rows: rows(),
      back: words('automata.back'),
      onback: onBack,
    }),
  )
}
