// The moves game with a feel of its own: a spark on the floor in front of the hero and three feel files, one for a
// landing (dust and a buzz), one for a jump (a shake) and one for taking the spark (a freeze and a burst of dust).
// Built in memory, as `writeContent` writes each file.
import { type GameContent, loadGame, writeContent } from '#src/features/content/content.ts'
import { readFiles } from '../content/kind.ts'
import { movesFiles } from '../game/moves-game.ts'
import { levelOne, START_FLOOR } from '../moves/level.ts'

/** Where the spark lies: on the start floor, a few tiles to the right of the first hero. */
export const SPARK_X = 8

/** What `land` buzzes with, so a test can say what the host was asked. */
export const LAND_BUZZ: { readonly strength: 0.3; readonly ticks: 3 } = { strength: 0.3, ticks: 3 }
/** How many ticks `got` holds the game. */
export const FREEZE_TICKS = 6

const spark = {
  format: 1,
  id: 'spark',
  body: 'fixed',
  size: { w: 0.6, h: 0.6 },
  color: '#f5d547',
  upright: false,
  kind: 'spark',
  touch: 'take',
}

/** The three feel files, by id. */
export const feelFiles = {
  land: {
    format: 1,
    id: 'land',
    on: 'hero.landed',
    dust: { count: 6, color: '#e8dcc0', speed: 2, life: 18 },
    // `LAND_BUZZ`, written out: a declared constant has to be made of plain values.
    buzz: { strength: 0.3, ticks: 3 },
  },
  leap: { format: 1, id: 'leap', on: 'hero.jumped', shake: { strength: 0.2, ticks: 12 } },
  got: {
    format: 1,
    id: 'got',
    on: 'spark.taken',
    // `FREEZE_TICKS`, written out for the same reason.
    freeze: { ticks: 6 },
    dust: { count: 12, color: '#ffd23f', speed: 3, life: 24 },
  },
} as const

/** The lines of `automata.toml` that list one feel file. */
const feelBlock = (id: string): string => `\n[[content]]\ntype = "feel"\npath = "content/feels/${id}.json"\n`

/** Every file of the feel game, by path. `overrides` replace files; `undefined` takes one away. */
export function feelGameFiles(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  const files = movesFiles({ doubleJump: true, wallJump: true, dash: true, players: 2 })
  const level = JSON.parse(levelOne()) as Record<string, unknown>
  files['content/levels/level-1.json'] = writeContent('level', {
    ...level,
    things: [{ id: 'spark-1', character: 'spark', x: SPARK_X, y: START_FLOOR - 0.3 }],
    // The second hero waits beyond the spark, so the first never has to push past it.
    starts: [
      { player: 1, x: 2.5, y: START_FLOOR - 0.5 },
      { player: 2, x: 10.5, y: START_FLOOR - 0.5 },
    ],
  } as never)
  files['content/characters/spark.json'] = writeContent('character', spark as never)
  const listed = `\n[[content]]\ntype = "character"\npath = "content/characters/spark.json"\n`
  const feels = Object.keys(feelFiles).map(feelBlock).join('')
  files['automata.toml'] = `${files['automata.toml'] ?? ''}${listed}${feels}`
  for (const [id, file] of Object.entries(feelFiles))
    files[`content/feels/${id}.json`] = writeContent('feel', file as never)
  return { ...files, ...overrides }
}

/** Loads the feel game. Throws, naming every problem, if it does not load. */
export async function loadFeelGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<GameContent> {
  const loaded = await loadGame(readFiles(feelGameFiles(overrides)))
  if (!loaded.ok)
    throw new Error(`The feel game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

/** Overrides that take the three feel files out of the game and leave everything else as it is. */
export function withoutFeel(): Record<string, string | undefined> {
  const toml = Object.keys(feelFiles).reduce(
    (text, id) => text.replace(feelBlock(id), ''),
    feelGameFiles()['automata.toml'] ?? '',
  )
  return {
    'automata.toml': toml,
    ...Object.fromEntries(Object.keys(feelFiles).map((id) => [`content/feels/${id}.json`, undefined])),
  }
}
