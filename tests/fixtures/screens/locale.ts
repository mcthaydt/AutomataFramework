// A player's language for a screen's test: the words in it, the language it is, and a way for the test to change it, as
// choosing another in the settings would.
import type { Language } from '#src/features/content/content.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import type { ScreenBase } from '#src/features/screens/screens.ts'

export interface TestLocale {
  readonly locale: ScreenBase['locale']
  /** The player picks `language`: the words change at once and every listener is told. */
  set(language: Language): void
}

/** The framework's own words in `language` (none, with `null`), held in one place a test can move. */
export function testLocale(language: Language | null = 'es'): TestLocale {
  let now: Language | undefined = language ?? undefined
  const listeners = new Set<(language: Language) => void>()
  return {
    locale: {
      language: () => now,
      words: (key, values) => (now === undefined ? key : frameworkWords(now)(key, values)),
      onChange(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    set(next) {
      now = next
      for (const listener of [...listeners]) listener(next)
    },
  }
}
