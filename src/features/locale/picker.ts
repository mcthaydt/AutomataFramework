// The language picker's rules, apart from how it looks: the flags in the order a player sees them, which one is
// chosen, the picker's own words in that flag's language, and the choice kept once. A page draws it and calls these.
import type { Language } from '../content/content.ts'
import type { StoreResult } from '../saves/saves.ts'
import type { Locale } from './create.ts'

/** The first screen of a player who has no language yet. */
export interface Picker {
  /** The flags in the order shown: `locale.listed()` when the picker was made. */
  readonly flags: readonly Language[]
  chosen(): Language | undefined
  /** Throws a `RangeError` for a language that is not one of `flags`. */
  choose(language: Language): void
  /** One flag back or on. With none chosen, the first flag. Stops at each end. */
  move(step: -1 | 1): void
  /** The picker's words in the chosen flag's language; `undefined` while none is chosen. */
  words(): { readonly title: string; readonly go: string } | undefined
  /**
   * Keeps the choice (`locale.set`) and answers the host's answer. `undefined`, and nothing happens, with no flag
   * chosen or after an earlier `go`.
   */
  go(): Promise<StoreResult<void> | undefined>
  /** Called whenever the chosen flag changes. Returns a function that stops listening. */
  onChange(listener: () => void): () => void
}

/**
 * The picker over a locale. It opens on the device's language when the game has it, so one press starts the game in the
 * player's own words; with none to suggest, no flag is chosen and the player must pick one.
 */
export function createPicker(locale: Locale): Picker {
  const flags = locale.listed()
  let chosen = locale.suggested()
  let done = false
  const listeners = new Set<() => void>()
  const tell = (): void => {
    for (const listener of [...listeners]) listener()
  }
  return {
    flags,
    chosen: () => chosen,
    choose(language) {
      if (!flags.includes(language))
        throw new RangeError(`"${language}" is not one of the flags: ${flags.join(', ')}.`)
      if (chosen === language) return
      chosen = language
      tell()
    },
    move(step) {
      const at = chosen === undefined ? -1 : flags.indexOf(chosen)
      const next = flags[Math.min(Math.max(at + step, 0), flags.length - 1)]
      if (next === undefined || next === chosen) return
      chosen = next
      tell()
    },
    words() {
      if (chosen === undefined) return undefined
      const say = locale.wordsIn(chosen)
      return { title: say('automata.picker.title'), go: say('automata.picker.go') }
    },
    async go() {
      if (chosen === undefined || done) return undefined
      done = true
      return locale.set(chosen)
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
