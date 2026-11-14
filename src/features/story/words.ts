// The words a player reads, by key. `wordsOf` and `Words` are the locale feature's: the game's text in the player's
// language, else the framework's, else the game's English, else the key itself, so a missing word shows as something
// findable and never as a blank. This file keeps what is the story's own: the words on the box's two buttons.
export { type Words, wordsOf } from '../locale/locale.ts'

/** The words the box's own two buttons show. A game may change them (`createStoryView`'s `boxWords`). */
export interface BoxWords {
  readonly next: string
  readonly skip: string
}
