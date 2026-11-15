import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { sceneGameInMemory } from '../../fixtures/cli/scene-game.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

/** A memory with the full game (figures, a backdrop, a keeper) in the folder `game`. */
const game = (changes: Record<string, string> = {}): Memory =>
  memoryLayer(under('game', { ...fullGameFiles, ...changes }))

/** Runs `automata art game <args>` on a memory and gives what it said and its exit code. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(['art', 'game', ...args], memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

test('the command paints a game, says what it painted, and paints nothing the second time', async () => {
  const memory = game()
  const first = await run(memory)
  expect(first.code).toBe(0)
  expect(first.out).toEqual([
    'Painted content/figures/hero.png',
    'Painted content/figures/hero.atlas.json',
    'Painted content/figures/keeper.png',
    'Painted content/figures/keeper.atlas.json',
    'Painted content/figures/meadow.png',
    'Painted content/figures/meadow.atlas.json',
    'Painted content/figures/tree.png',
    'Painted content/figures/tree.atlas.json',
    'Painted content/backdrops/valley.png',
    'Painted content/backdrops/valley.atlas.json',
  ])
  const hero = memory.files.get('game/content/figures/hero.png')
  expect([...(hero as Uint8Array).slice(0, 4)]).toEqual([137, 80, 78, 71])
  const second = await run(memory)
  expect(second).toEqual({ code: 0, out: ['Every picture is already painted and up to date.'], err: [] })
})

test('--check passes after painting, and after a picture is changed names it and exits 1', async () => {
  const memory = game()
  expect((await run(memory, '--check')).code).toBe(1)
  await run(memory)
  expect(await run(memory, '--check')).toEqual({
    code: 0,
    out: ['Every picture is painted and up to date.'],
    err: [],
  })
  const path = 'game/content/figures/tree.png'
  const bytes = (memory.files.get(path) as Uint8Array).slice()
  bytes[bytes.length - 20] = (bytes[bytes.length - 20] as number) ^ 1
  memory.files.set(path, bytes)
  expect(await run(memory, '--check')).toEqual({
    code: 1,
    out: [],
    err: ['content/figures/tree.png: This picture is older than its figure file. Run "automata art".'],
  })
})

test('--check paints nothing', async () => {
  const memory = game()
  const check = await run(memory, '--check')
  expect(check.err).toContain(
    'content/figures/hero.png: This picture has not been painted. Run "automata art".',
  )
  expect(memory.files.has('game/content/figures/hero.png')).toBe(false)
})

test('a game that does not load is not painted', async () => {
  const memory = game({ 'content/figures/hero.json': '{ "format": 1 }' })
  const result = await run(memory)
  expect(result.code).toBe(1)
  expect(result.out).toEqual([])
  expect(result.err.at(-1)).toBe(
    'The game does not load, so nothing was painted. Fix the problems above, then run this again.',
  )
  expect(memory.files.has('game/content/figures/keeper.png')).toBe(false)
})

test('--json answers the files painted and what is still wrong, and nothing else', async () => {
  const memory = game()
  const first = await run(memory, '--json')
  const painted = JSON.parse(first.out.join('\n')) as { ok: boolean; painted: string[]; problems: unknown[] }
  expect(painted.ok).toBe(true)
  expect(painted.painted).toHaveLength(10)
  expect(painted.problems).toEqual([])
  const check = await run(game(), '--check', '--json')
  expect(check.code).toBe(1)
  expect(JSON.parse(check.out.join('\n'))).toMatchObject({ ok: false, painted: [] })
})

test('a folder that is not a game is the one sentence, exit 2', async () => {
  const memory = memoryLayer({})
  expect(await main(['art', 'nowhere'], memory.layer)).toBe(2)
  expect(memory.err[0]).toContain('nowhere is not a game')
})

test('automata play paints before it starts, and says so', async () => {
  const memory = game()
  expect(await main(['play', 'game'], memory.layer)).toBe(0)
  expect(memory.out).toContain('Painted content/figures/hero.png')
  expect(memory.files.has('game/content/figures/hero.atlas.json')).toBe(true)
})

test('the check has an art step after files: it fails for a missing picture, and passes once painted', async () => {
  const memory = game()
  expect(await main(['check', 'game', '--only', 'art', '--json'], memory.layer)).toBe(1)
  const report = JSON.parse(memory.out.join('\n')) as {
    steps: { step: string; state: string; problems: { file: string }[] }[]
  }
  expect(report.steps.map((s) => [s.step, s.state])).toEqual([['art', 'failed']])
  expect(report.steps[0]?.problems.map((p) => p.file)).toContain('content/figures/hero.png')
  await run(memory)
  const after = memoryLayer(
    under('game', Object.fromEntries([...memory.files].map(([k, v]) => [k.slice(5), v])) as never),
  )
  expect(await main(['check', 'game', '--only', 'art'], after.layer)).toBe(0)
})

test('the files step does not call a painted atlas unlisted, and still names a json nobody lists', async () => {
  const memory = game()
  await run(memory)
  const clean = await main(['check', 'game', '--only', 'files', '--json'], memory.layer)
  expect(clean).toBe(0)
  memory.files.set('game/content/figures/stray.json', '{}')
  const stray = memoryLayer(
    under('game', Object.fromEntries([...memory.files].map(([k, v]) => [k.slice(5), v])) as never),
  )
  expect(await main(['check', 'game', '--only', 'files'], stray.layer)).toBe(1)
  expect(stray.out.join('\n')).toContain('content/figures/stray.json')
})

test('a game with a scene is painted: the scene’s picture and atlas are written beside its file, and then checked', async () => {
  const memory = memoryLayer(await sceneGameInMemory())
  const painted = await run(memory)
  expect(painted.code).toBe(0)
  expect(painted.out).toContain('Painted content/scenes/meadow.png')
  expect(painted.out).toContain('Painted content/scenes/meadow.atlas.json')
  expect([...(memory.files.get('game/content/scenes/meadow.png') as Uint8Array).slice(0, 4)]).toEqual([
    137, 80, 78, 71,
  ])
  expect(await run(memory, '--check')).toEqual({
    code: 0,
    out: ['Every picture is painted and up to date.'],
    err: [],
  })
})

test('a scene whose own photo has no picture paints nothing and says which file to fix', async () => {
  const mossy = (sceneGameFiles['content/scenes/meadow.json'] ?? '').replaceAll(
    '"photo": "dirt"',
    '"photo": "moss"',
  )
  const memory = memoryLayer(await sceneGameInMemory('game', { 'content/scenes/meadow.json': mossy }))
  memory.files.delete('game/content/photos/moss.png')
  const said = await run(memory)
  expect(said.code).toBe(1)
  expect(said.out).toEqual([])
  expect(said.err).toEqual([
    'content/photos/moss.json: There is no picture at "content/photos/moss.png". Put the photo there.',
  ])
  expect(memory.files.has('game/content/scenes/meadow.png')).toBe(false)
})
