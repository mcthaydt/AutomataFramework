// The player's language for one game: which it is now, the words in it, and a pick that is kept with the settings.
import type { Message, Words } from '../../lib/message.ts'
import type { GameContent, Language } from '../content/content.ts'
import type { Host } from '../host/host.ts'
import type { Settings, StoreResult } from '../saves/saves.ts'
import { pickLanguage } from './pick.ts'
import { LANGUAGE_SETTINGS_DEFAULT, LanguageSettingsSchema } from './settings.ts'
import { languagesOf, wordsOf } from './words.ts'

/** What a game and its screens use to speak in the player's language. */
export interface Locale {
  /** The language the words are in now. */
  language(): Language
  /** What the player picked: a language, or 'auto' for "follow my device". */
  choice(): Language | 'auto'
  /** The languages this game has words in, in order: what a language screen offers. */
  readonly languages: readonly Language[]
  /** Words in the language now. Reads the language on every call, so one held for a long time is never stale. */
  readonly words: Words
  /** The words for a message a feature below `locale` answered with. */
  say(message: Message): string
  /**
   * Picks a language (or 'auto'), changes the words at once and keeps the pick with the settings. Answers the host's
   * answer, so a host that will not keep it is told to the caller while the game still changes. Rejects with a
   * `RangeError`, changing nothing, for a language this game has no words in.
   */
  set(choice: Language | 'auto'): Promise<StoreResult<void>>
  /** Called with the new language whenever it changes, by this locale or by anyone sharing its settings. */
  onChange(listener: (language: Language) => void): () => void
}

/**
 * The locale of a game on a host. Not async: `settings` has been read already (`openSettings`). The language is the
 * saved pick if the game has words in it, else the host's, else the device's in order, else English. A saved language
 * the game does not have is as good as none, and is left stored.
 */
export function createLocale(options: {
  readonly content: GameContent
  readonly host: Host
  readonly settings: Settings
}): Locale {
  const { content, host } = options
  const languages = languagesOf(content)
  const section = options.settings.section({
    name: 'language',
    schema: LanguageSettingsSchema,
    initial: LANGUAGE_SETTINGS_DEFAULT,
  })
  const resolve = (saved: Language | null): Language =>
    pickLanguage({
      saved: saved ?? undefined,
      host: host.language(),
      device: host.deviceLanguages(),
      shipped: languages,
    })
  let current = resolve(section.get().language)
  const listeners = new Set<(language: Language) => void>()

  // Follows the section, so a pick made by anyone holding the same handle changes this locale too.
  section.onChange((value) => {
    const next = resolve(value.language)
    if (next === current) return
    current = next
    // Every listener is told, then the first one's error is raised: the settings handle keeps the pick either way.
    let heard: { readonly error: unknown } | undefined
    for (const listener of [...listeners]) {
      try {
        listener(next)
      } catch (error) {
        heard ??= { error }
      }
    }
    if (heard !== undefined) throw heard.error
  })

  const words: Words = (key, values) => wordsOf(content, current)(key, values)
  return {
    language: () => current,
    // A saved language this game has no words in counts as no choice.
    choice() {
      const saved = section.get().language
      return saved !== null && languages.includes(saved) ? saved : 'auto'
    },
    languages,
    words,
    say: (message) => words(message.key, message.values),
    async set(choice) {
      if (choice !== 'auto' && !languages.includes(choice))
        throw new RangeError(
          `This game has no words in "${choice}". It has them in ${languages.join(', ')}, or pick "auto".`,
        )
      return section.set({ format: 1, language: choice === 'auto' ? null : choice })
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
