// The full game's opening cutscene as a plain one that does not open the level on its own. Page tests of the art, the
// languages and the controls play the full game and press keys at once; an opening holds the heroes' hands, so they use
// this in place of the file (`readFullGame({ [OPENING_PATH]: withoutOpening() })`). The story is tested on its own game.
import { writeContent } from '#src/features/content/content.ts'
import { fullGameFiles } from './read.ts'

/** The path of the full game's opening cutscene. */
export const OPENING_PATH = 'content/cutscenes/level-1-intro.json'

/** The opening's text without `opens`. */
export function withoutOpening(): string {
  const { opens: _opens, ...scene } = JSON.parse(fullGameFiles[OPENING_PATH] ?? '') as Record<string, unknown>
  return writeContent('cutscene', scene as never)
}
