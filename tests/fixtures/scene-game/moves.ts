// The scene game with a hero the framework moves, put where a test says: the meadow's slope, ledge and floor, walked by
// the built-in hero. Built in memory from the scene game's files and the moves game's hero and tuning. With `figure`
// the hero has the example figure, so a browser test can find it on the canvas; the slopes golden is recorded without.
import { type GameContent, loadGame, writeContent } from '#src/features/content/content.ts'
import { heroFigure } from '../content/art.ts'
import { movesFiles } from '../game/moves-game.ts'
import { readSceneGame, sceneGameFiles } from './read.ts'

/** Where the hero starts, in tiles: the middle of its box. */
export interface Start {
  readonly x: number
  readonly y: number
}

/** Loads the scene game with its hero given `moves`, alone on the meadow at `start`. Throws if it does not load. */
export async function loadSceneMovesGame(start: Start, figure = false): Promise<GameContent> {
  const moves = movesFiles({ figure })
  const level = JSON.parse(sceneGameFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>
  const files: Record<string, string | undefined> = {
    'automata.toml': `${sceneGameFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "tuning"\npath = "content/tunings/hero-moves.json"\n${figure ? '\n[[content]]\ntype = "figure"\npath = "content/figures/hero.json"\n' : ''}`,
    'content/characters/hero.json': moves['content/characters/hero.json'],
    'content/tunings/hero-moves.json': moves['content/tunings/hero-moves.json'],
    ...(figure ? { 'content/figures/hero.json': writeContent('figure', heroFigure() as never) } : {}),
    'content/levels/level-1.json': writeContent('level', {
      ...level,
      things: [],
      starts: [{ player: 1, x: start.x, y: start.y }],
    } as never),
  }
  const loaded = await loadGame(readSceneGame(files))
  if (!loaded.ok)
    throw new Error(
      `The scene moves game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`,
    )
  return loaded.value
}
