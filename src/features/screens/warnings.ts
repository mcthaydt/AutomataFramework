// What a player reads before they play: the game's own warnings (the project file's `warnings`, in its order) and then the
// framework's, such as a browser that will not keep their progress. One screen, one button.
import type { Component } from 'svelte'
import type { Words } from '../../lib/message.ts'
import type { Language, Project } from '../content/content.ts'
import type { StoreResult } from '../saves/saves.ts'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'
import WarningsPart from './Warnings.svelte'

/** What the warnings screen draws. */
export type WarningsProps = {
  readonly title: string
  readonly lines: readonly string[]
  readonly ok: string
  readonly onok: () => void
}

const Part: Component<WarningsProps> = WarningsPart as never

/**
 * What there is to warn about, as sentences in `words`: the game's own first, in its order, then the framework's. Only a
 * store that will not keep anything warns here (`unavailable`): "full" and "failed" are said when a save is tried.
 */
export function warningsFor(options: {
  readonly project: Pick<Project, 'warnings'>
  /** `host.store.check()`'s answer. */
  readonly saving: StoreResult<void>
  readonly words: Words
}): readonly string[] {
  const { project, saving, words } = options
  const lines = (project.warnings ?? []).map((key) => words(key))
  if (!saving.ok && saving.refusal === 'unavailable') lines.push(words('automata.warnings.no-saving'))
  return lines
}

/** The warnings, with OK as the one thing to press. */
export function warningsScreen(
  options: ScreenBase & {
    /** The words to say them in, which before the picker are the device's language's (`locale.wordsIn`). */
    readonly words: Words
    /** The language of `words`, for the screen's `lang`, while the player has none of their own. */
    readonly language?: Language
    readonly lines: readonly string[]
    readonly onOk: () => void
  },
): Screen {
  const { words, language, lines, onOk } = options
  return show(
    Part,
    {
      ...options,
      name: 'warnings',
      locale: {
        ...options.locale,
        language: () => options.locale.language() ?? language,
        // The words are the ones given, whatever the locale says: the player has not chosen a language yet.
        words,
      },
    },
    (said) => ({
      title: said('automata.warnings.title'),
      lines,
      ok: said('automata.warnings.ok'),
      onok: onOk,
    }),
  )
}
