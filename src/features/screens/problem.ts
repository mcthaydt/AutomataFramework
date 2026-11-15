// The screen for a game that stopped: it could not be loaded, drawn or played on. A player is told in two sentences and
// has one button; the developer's own lines (which file, which place, what is wrong) stand under them as they were
// written. A page with no language yet shows only those lines, since there are no words to say them in.
import type { Component } from 'svelte'
import PartOfProblem from './Problem.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** What the screen draws. */
export type ProblemProps = {
  /** The player's words, or `undefined` while there is no language to say them in. */
  readonly title?: string
  readonly text?: string
  /** For the developer: file, place, what is wrong. */
  readonly lines: readonly string[]
  /** What the developer should do. */
  readonly fix?: string
  /** What the button says, and what a screen reader says when only the picture shows. */
  readonly reload: string
  /** The button is the picture alone: there is no language for a word. */
  readonly pictureOnly: boolean
  readonly onreload: () => void
}

const Part: Component<ProblemProps> = PartOfProblem as never

/** The developer's line for the button when the player has no language: English, as the checks write theirs. */
const RELOAD_FOR_DEVELOPER = 'Load the page again'

/** A locale with nothing to say: the screen is then only what it was given. */
const NO_LOCALE: ScreenBase['locale'] = {
  language: () => undefined,
  words: (key) => key,
  onChange: () => () => {},
}

/**
 * The problem screen. It has `role="alert"`, so a screen reader says it at once. `onReload` is told when the button is
 * pressed; the page then loads again.
 */
export function problemScreen(
  options: Omit<ScreenBase, 'locale'> & {
    /** `undefined` before there is a language: the screen then says only what it is given. */
    readonly locale?: ScreenBase['locale']
    /** For the developer, in English as the checks write them: file, place, what is wrong. */
    readonly lines?: readonly string[]
    /** What the developer should do, when there is something. */
    readonly fix?: string
    readonly onReload: () => void
  },
): Screen {
  const { locale, lines = [], fix, onReload } = options
  return show(Part, { ...options, locale: locale ?? NO_LOCALE, name: 'problem' }, (words) => ({
    ...(locale === undefined
      ? { reload: RELOAD_FOR_DEVELOPER, pictureOnly: true }
      : {
          title: words('automata.problem.title'),
          text: words('automata.problem.text'),
          reload: words('automata.problem.reload'),
          pictureOnly: false,
        }),
    lines,
    ...(fix === undefined ? {} : { fix }),
    onreload: onReload,
  }))
}
