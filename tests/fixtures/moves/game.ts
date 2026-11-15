// The moves game: a hero the framework moves with everything switched on, and two levels. Built in memory.
import { type GameContent, loadGame, writeContent } from '#src/features/content/content.ts'
import { readFiles } from '../content/kind.ts'
import { movesFiles } from '../game/moves-game.ts'
import { levelOne, levelTwo } from './level.ts'

const LEVEL_TWO = 'content/levels/level-2.json'

/** The crate is four tiles wide, so a hero running at it can land on it. */
const crate = {
  format: 1,
  id: 'crate',
  body: 'dynamic',
  size: { w: 4, h: 1 },
  color: '#c9a227',
  upright: false,
}

/** Every file of the moves game, by path. `overrides` replace files; `undefined` takes one away. */
export function movesGameFiles(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  const base = movesFiles({ doubleJump: true, wallJump: true, dash: true, players: 2 })
  return {
    ...base,
    'automata.toml': `${base['automata.toml'] ?? ''}\n[[content]]\ntype = "level"\npath = "${LEVEL_TWO}"\n`,
    'content/levels/level-1.json': writeContent('level', JSON.parse(levelOne()) as never),
    [LEVEL_TWO]: writeContent('level', JSON.parse(levelTwo()) as never),
    'content/characters/crate.json': writeContent('character', crate as never),
    ...overrides,
  }
}

/** Loads the moves game. Throws, naming every problem, if it does not load. */
export async function loadMovesGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readFiles(movesGameFiles(overrides)))
  if (!loaded.ok)
    throw new Error(`The moves game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}
