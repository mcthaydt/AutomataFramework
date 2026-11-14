// The words a player reads, by key. A game keeps them in one file per language (`messages/<language>.json`); the story's
// box asks for a key and gets the text in the language chosen, else English (every game with words has an English file),
// else the key itself, so a missing word shows as something findable and never as a blank.
import type { GameContent, Language } from '../content/content.ts'

/** The text of a key, already in the language the player chose. */
export type Words = (key: string) => string

/** The words the box's own two buttons show. A game may change them (`createStoryView`'s `boxWords`). */
export interface BoxWords {
  readonly next: string
  readonly skip: string
}

/** The text of a key in `language`, else in English, else the key itself. */
export function wordsOf(content: GameContent, language?: Language): Words {
  const chosen = language === undefined ? undefined : content.messages?.[language]?.messages
  const english = content.messages?.en?.messages
  return (key) => {
    if (chosen !== undefined && Object.hasOwn(chosen, key)) return chosen[key] as string
    if (english !== undefined && Object.hasOwn(english, key)) return english[key] as string
    return key
  }
}
