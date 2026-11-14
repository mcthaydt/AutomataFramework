// The two small words a screen needs about a save: the level's name in the player's language, and a name a save takes.
import type { Words } from '../../lib/message.ts'

/** The most a save's label may hold, counted in UTF-16 units as a save counts it. */
const MAX_LABEL = 80

/** A level's name in the player's language: the game's `level.<id>.name`, else the id as it is. */
export function levelName(words: Words, levelId: string): string {
  const key = `level.${levelId}.name`
  const text = words(key)
  return text === key ? levelId : text
}

/** The pieces of a text a person sees as one letter each (an emoji with its joiners is one), or code points where an engine cannot tell. */
function pieces(text: string): readonly string[] {
  if (typeof Intl.Segmenter === 'function')
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
  return [...text]
}

/**
 * A label a save takes: one that fits is returned as it is; a longer one is cut to at most 80 units at a letter's
 * edge, so no emoji or accented letter is left in halves. An empty text stays empty (a save takes no empty label, so
 * leave the label out for one).
 */
export function fitLabel(label: string): string {
  if (label.length <= MAX_LABEL) return label
  let kept = ''
  for (const piece of pieces(label)) {
    if (kept.length + piece.length > MAX_LABEL) break
    kept += piece
  }
  return kept
}
