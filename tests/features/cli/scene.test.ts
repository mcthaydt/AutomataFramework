import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { loadGame } from '#src/features/content/content.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'

/** The small game (one level of `#` and `.`) in the folder `game`. */
const game = (more: Record<string, string> = {}): Memory =>
  memoryLayer(under('game', { ...smallGame(), ...more }))

/** Runs `automata scene <args>` on a memory and gives what it said and its exit code. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(['scene', ...args], memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

const text = (memory: Memory, path: string): string => String(memory.files.get(`game/${path}`))

/** The files of the game in `memory` as `loadGame` reads them. */
async function loaded(memory: Memory): ReturnType<typeof loadGame> {
  return loadGame(async (path) => {
    const found = memory.files.get(`game/${path}`)
    if (found === undefined) throw new Error(`${path}: no such file`)
    return String(found)
  })
}

test('from-level writes the scene, changes the level, lists the scene and paints its picture; the game still loads', async () => {
  const memory = game()
  const before = text(memory, 'automata.toml')
  const said = await run(memory, 'from-level', 'level-1', 'game')
  expect(said).toEqual({
    code: 0,
    out: [
      'Wrote content/scenes/scene-1.json',
      'Wrote content/levels/level-1.json',
      'Wrote automata.toml',
      'Painted content/scenes/scene-1.png',
      'Painted content/scenes/scene-1.atlas.json',
      'Level "level-1" now takes its ground from the scene "scene-1". It plays as it did.',
    ],
    err: [],
  })
  const result = await loaded(memory)
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.value.levels['level-1']?.scene).toBe('scene-1')
  expect(result.value.levels['level-1']?.tiles).toBeUndefined()
  expect(result.value.scenes?.['scene-1']?.ground.rows).toHaveLength(9)
  // Everything automata.toml had is still there, and the new block is last.
  expect(text(memory, 'automata.toml').startsWith(before.trimEnd())).toBe(true)
  expect(text(memory, 'automata.toml')).toContain('path = "content/scenes/scene-1.json"')
  expect(memory.files.get('game/content/scenes/scene-1.png')).toBeInstanceOf(Uint8Array)
})

test('--as names the scene, and the scene goes beside the scenes the game already lists', async () => {
  const memory = game()
  expect((await run(memory, 'from-level', 'level-1', 'game', '--as', 'meadow')).code).toBe(0)
  expect(memory.files.has('game/content/scenes/meadow.json')).toBe(true)
  expect(JSON.parse(text(memory, 'content/levels/level-1.json')).scene).toBe('meadow')
})

test('--json prints the report', async () => {
  const memory = game()
  const said = await run(memory, 'from-level', 'level-1', 'game', '--json')
  expect(said.code).toBe(0)
  expect(JSON.parse(said.out.join('\n'))).toEqual({
    ok: true,
    wrote: ['content/scenes/scene-1.json', 'content/levels/level-1.json', 'automata.toml'],
    painted: ['content/scenes/scene-1.png', 'content/scenes/scene-1.atlas.json'],
    problems: [],
  })
})

test('a level that is not there is said, with the levels there are, and nothing is written', async () => {
  const memory = game()
  const files = new Map(memory.files)
  expect(await run(memory, 'from-level', 'level-9', 'game')).toEqual({
    code: 1,
    out: [],
    err: ['There is no level called "level-9". This game has: level-1.'],
  })
  expect(memory.files).toEqual(files)
})

test('a level that already has a scene is refused', async () => {
  const memory = game()
  await run(memory, 'from-level', 'level-1', 'game')
  const files = new Map(memory.files)
  const again = await run(memory, 'from-level', 'level-1', 'game')
  expect(again.code).toBe(1)
  expect(again.err).toEqual([
    'Level "level-1" already has a scene, "scene-1". Change that scene, or take its "scene" out of the level first.',
  ])
  expect(memory.files).toEqual(files)
})

test('a file already at the scene’s path is refused, and --as is the way out', async () => {
  const memory = game({ 'content/scenes/scene-1.json': '{}' })
  const files = new Map(memory.files)
  expect(await run(memory, 'from-level', 'level-1', 'game')).toEqual({
    code: 1,
    out: [],
    err: ['There is already a file at content/scenes/scene-1.json. Pick another name with --as.'],
  })
  expect(memory.files).toEqual(files)
  expect((await run(memory, 'from-level', 'level-1', 'game', '--as', 'other')).code).toBe(0)
})

test('a scene name the format refuses is a sentence, and nothing is written', async () => {
  const memory = game()
  const files = new Map(memory.files)
  const said = await run(memory, 'from-level', 'level-1', 'game', '--as', 'Not A Name')
  expect(said.code).toBe(1)
  expect(said.err.length).toBeGreaterThan(0)
  expect(memory.files).toEqual(files)
})

test('a game that does not load is not changed', async () => {
  const memory = game({ 'content/levels/level-1.json': '{ "format": 1' })
  const files = new Map(memory.files)
  const said = await run(memory, 'from-level', 'level-1', 'game')
  expect(said.code).toBe(1)
  expect(said.err.at(-1)).toBe(
    'The game does not load, so nothing was written. Fix the problems above, then run this again.',
  )
  expect(memory.files).toEqual(files)
})

test('a folder that is not a game is a sentence and exit 2', async () => {
  const memory = memoryLayer({})
  const said = await run(memory, 'from-level', 'level-1', 'nowhere')
  expect(said.code).toBe(2)
  expect(said.err[0]).toContain('is not a game')
})

test('words after the folder are not dropped', async () => {
  const memory = game()
  const said = await run(memory, 'from-level', 'level-1', 'game', 'more')
  expect(said.code).toBe(2)
  expect(said.err[0]).toContain('takes one folder')
})
