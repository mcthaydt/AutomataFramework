// The M1 fixture game with the hero given a figure and the six clips a hero plays: the game the sprite tests and the
// sprite golden run. Everything else about it is the M1 game, so only the sprites are new.
import { type GameContent, loadGame, writeContent } from '#src/features/content/content.ts'
import { heroCharacter, heroFigure } from '../content/art.ts'
import { changed, gameFiles, readFiles } from '../content/kind.ts'
import { fixtureFiles } from './read.ts'

/** The files of the game: the M1 files, the hero's figure, and the hero with that figure and its clips. */
export function spriteGameFiles(): Record<string, string | undefined> {
  return gameFiles(
    fixtureFiles,
    [
      {
        type: 'figure',
        path: 'content/figures/hero.json',
        text: writeContent('figure', heroFigure() as never),
      },
    ],
    {
      'content/characters/hero.json': changed(
        'character',
        fixtureFiles['content/characters/hero.json'],
        (hero) => {
          hero.figure = 'hero'
          hero.clips = heroCharacter().clips
        },
      ),
    },
  )
}

/** The sprite game, loaded. Throws, naming every problem, if it does not load. */
export async function loadSpriteGame(
  replace: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readFiles({ ...spriteGameFiles(), ...replace }))
  if (!loaded.ok)
    throw new Error(`The sprite game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}
