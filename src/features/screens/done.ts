// "Well done!": what a player sees when a level is finished. One thing to press, which is the next level when there is one
// and the main menu when there is not.
import type { Component } from 'svelte'
import DonePart from './Done.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** One button of the screen. */
export type DoneButton = {
  readonly label: string
  readonly kind: 'primary' | 'plain'
  readonly onpress: () => void
}

/** What the screen draws. */
export type DoneProps = {
  readonly title: string
  /** "You finished Level 1." or, after the last level, "You finished the game." */
  readonly line: string
  /** Why the progress was not kept, when it was not. */
  readonly notKept?: string
  readonly buttons: readonly DoneButton[]
}

const Part: Component<DoneProps> = DonePart as never

/**
 * The screen after a level. With a next level: "Next level" (the one to press) and a plain "Main menu"; after the last,
 * "You finished the game." and one button, "Main menu".
 */
export function doneScreen(
  options: ScreenBase & {
    /** The finished level's name in the player's language. */
    readonly level: string
    /** There is a level after this one. */
    readonly next: boolean
    /** Why the progress was not kept, when it was not: one sentence, already in the player's words. */
    readonly notKept?: string
    readonly onNext: () => void
    readonly onMenu: () => void
  },
): Screen {
  const { level, next, notKept, onNext, onMenu } = options
  return show(
    Part,
    { ...options, name: 'done' },
    (words): DoneProps => ({
      title: words('automata.done.title'),
      line: next ? words('automata.done.level', { level }) : words('automata.done.game'),
      ...(notKept === undefined ? {} : { notKept }),
      buttons: next
        ? [
            { label: words('automata.done.next'), kind: 'primary', onpress: onNext },
            { label: words('automata.done.menu'), kind: 'plain', onpress: onMenu },
          ]
        : [{ label: words('automata.done.menu'), kind: 'primary', onpress: onMenu }],
    }),
  )
}
