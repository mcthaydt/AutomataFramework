// The player's language for one game: which it is now (none until the player has one), the words in it, and a pick that
// is kept with the settings.
import type { Message, Words } from '../../lib/message.ts'
import type { GameContent, Language } from '../content/content.ts'
import type { Host } from '../host/host.ts'
import type { Settings, StoreResult } from '../saves/saves.ts'
import { pickLanguage, playersOrder, suggestLanguage } from './pick.ts'
import { LANGUAGE_SETTINGS_DEFAULT, LanguageSettingsSchema } from './settings.ts'
import { languagesOf, wordsOf } from './words.ts'

/** What a game and its screens use to speak in the player's language. */
export interface Locale {
  /** The language the words are in now. `undefined` until the player has one: show the picker first. */
  language(): Language | undefined
  /** True when the player's language is their saved choice or the host's own. False: they have not been asked. */
  asked(): boolean
  /** The flag the picker opens on: the device's language when the game has it, else none. */
  suggested(): Language | undefined
  /** The languages this game has words in, in the fixed order. */
  readonly languages: readonly Language[]
  /** The same languages as a player's list: `language() ?? suggested()` first, nothing else moved. */
  listed(): readonly Language[]
  /**
   * Words in the language now, read on every call, so one held for a long time is never stale. Before there is a
   * language, a key comes back as itself, as a word nobody wrote does.
   */
  readonly words: Words
  /** Words in one language whatever the language is now: the picker shows its title in a flag's language. */
  wordsIn(language: Language): Words
  /** The words for a message a feature below `locale` answered with. */
  say(message: Message): string
  /**
   * Picks a language, changes the words at once and keeps the pick with the settings. Answers the host's answer, so a
   * host that will not keep it is told to the caller while the game still changes. Rejects with a `RangeError`,
   * changing nothing, for a language this game has no words in.
   */
  set(language: Language): Promise<StoreResult<void>>
  /** Called with the new language whenever it changes, by this locale or by anyone sharing its settings. */
  onChange(listener: (language: Language) => void): () => void
}

/** Where the player's language stands: the language the words are in, and whether the player answered for it. */
interface Standing {
  readonly language: Language | undefined
  readonly asked: boolean
}

/**
 * The locale of a game on a host. Not async: `settings` has been read already (`openSettings`). The language is the
 * saved pick if the game has words in it, else the host's; with neither there is none, and `suggested()` is the
 * device's language for the picker to open on. A saved language the game does not have is as good as none, and is
 * left stored.
 */
export function createLocale(options: {
  readonly content: GameContent
  /** Only what the player speaks is asked of it, so a tool in Node gives these two and nothing more. */
  readonly host: Pick<Host, 'language' | 'deviceLanguages'>
  readonly settings: Settings
  /**
   * Watch mode: nobody is there to ask, so until a choice the words are in `suggested()`, else the game's own
   * language (`source`). `asked()` stays false and nothing is kept.
   */
  readonly watching?: boolean
}): Locale {
  const { content, host } = options
  const languages = languagesOf(content)
  const section = options.settings.section({
    name: 'language',
    schema: LanguageSettingsSchema,
    initial: LANGUAGE_SETTINGS_DEFAULT,
  })
  const suggested = (): Language | undefined => suggestLanguage(host.deviceLanguages(), languages)
  const resolve = (saved: Language | null): Standing => {
    const pick = pickLanguage({
      saved: saved ?? undefined,
      host: host.language(),
      device: host.deviceLanguages(),
      shipped: languages,
    })
    if (pick.language !== undefined) return { language: pick.language, asked: true }
    const watched = options.watching === true ? (pick.suggested ?? content.project.source) : undefined
    return { language: watched, asked: false }
  }
  let current = resolve(section.get().language)
  const listeners = new Set<(language: Language) => void>()

  // Follows the section, so a pick made by anyone holding the same handle changes this locale too.
  section.onChange((value) => {
    const next = resolve(value.language)
    const before = current.language
    current = next
    if (next.language === before || next.language === undefined) return
    const language = next.language
    // Every listener is told, then the first one's error is raised: the settings handle keeps the pick either way.
    let heard: { readonly error: unknown } | undefined
    for (const listener of [...listeners]) {
      try {
        listener(language)
      } catch (error) {
        heard ??= { error }
      }
    }
    if (heard !== undefined) throw heard.error
  })

  const words: Words = (key, values) =>
    current.language === undefined ? key : wordsOf(content, current.language)(key, values)
  return {
    language: () => current.language,
    asked: () => current.asked,
    suggested,
    languages,
    listed: () => playersOrder(current.language ?? suggested(), languages),
    words,
    wordsIn: (language) => wordsOf(content, language),
    say: (message) => words(message.key, message.values),
    async set(language) {
      if (!languages.includes(language))
        throw new RangeError(
          `This game has no words in "${language}". It has them in ${languages.join(', ')}.`,
        )
      return section.set({ format: 1, language })
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
