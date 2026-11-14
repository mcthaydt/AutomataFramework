// A game starts only for a player who has a language: nobody is given one, so the picker comes first.
import type { Locale } from '../locale/locale.ts'

/** What `startGame` and `startOnlineGame` throw for a player who has no language yet. */
const NO_LANGUAGE_YET =
  'No language is chosen yet. Show the language picker first (languagePicker), then start the game.'

/** Throws `NO_LANGUAGE_YET` unless the player's language is their own choice (or the host's). */
export function requireLanguage(locale: Pick<Locale, 'asked'>): void {
  if (!locale.asked()) throw new Error(NO_LANGUAGE_YET)
}
