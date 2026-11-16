// "You lost.": what a player sees when a level is lost. One thing to press, Try again, and the way out to the main menu.
// Escape and the pad's right button do nothing here: a lost level has no screen to go back to, and "Main menu" is a
// button like any other.
import type { Component } from 'svelte'
import LostPart from './Lost.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** One button of the screen. */
export type LostButton = {
  readonly label: string
  readonly kind: 'primary' | 'plain'
  readonly onpress: () => void
}

/** What the screen draws. */
export type LostProps = {
  readonly title: string
  /** "Score: 3" and "Best: 5", when the game counts a score. */
  readonly lines: readonly string[]
  /** Why the best score was not kept, when it was not. */
  readonly notKept?: string
  readonly buttons: readonly LostButton[]
}

const Part: Component<LostProps> = LostPart as never

/**
 * The screen after a level is lost: "You lost.", the score and the best when the game has them, "Try again" (the one to
 * press, with the focus) and a plain "Main menu".
 */
export function lostScreen(
  options: ScreenBase & {
    /** The level's score, shown as "Score: n" when given. */
    readonly score?: number
    /** The best score, shown as "Best: n" when given. */
    readonly best?: number
    /** Why the best score was not kept, when it was not: one sentence, already in the player's words. */
    readonly notKept?: string
    readonly onAgain: () => void
    readonly onMenu: () => void
  },
): Screen {
  const { score, best, notKept, onAgain, onMenu } = options
  return show(
    Part,
    { ...options, name: 'lost' },
    (words): LostProps => ({
      title: words('automata.lost.title'),
      lines: [
        ...(score === undefined ? [] : [words('automata.hud.score', { score })]),
        ...(best === undefined ? [] : [words('automata.hud.best', { best })]),
      ],
      ...(notKept === undefined ? {} : { notKept }),
      buttons: [
        { label: words('automata.lost.again'), kind: 'primary', onpress: onAgain },
        { label: words('automata.done.menu'), kind: 'plain', onpress: onMenu },
      ],
    }),
  )
}
