import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { listContent } from '#src/features/content/content.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

const KEEPER = 'content/figures/keeper.json'
const KEEPER_JSON = fullGameFiles[KEEPER] ?? ''

/** The small game in the folder `game`, with a keeper figure written beside it but not listed. */
const game = (more: Record<string, string> = {}): Memory =>
  memoryLayer(under('game', { ...smallGame(), [KEEPER]: KEEPER_JSON, ...more }))

/** Runs `automata add game <args>` and gives what it said and its exit code. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(['add', 'game', ...args], memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

const project = (memory: Memory): string => String(memory.files.get('game/automata.toml'))

test('a figure that is there is listed, and the words say so and what to run next', async () => {
  const memory = game()
  const before = project(memory)
  const said = await run(memory, '--type', 'figure', '--path', KEEPER, '--about', "The keeper's picture.")
  expect(said).toEqual({
    code: 0,
    out: [`Listed ${KEEPER} as a figure.`, 'Run "automata art" to paint its picture.'],
    err: [],
  })
  // The bytes written are the framework's own, and every one that was there is still there.
  const listed = listContent(before, { type: 'figure', path: KEEPER }, "The keeper's picture.")
  expect(listed.ok && listed.value).toBe(project(memory))
  expect(project(memory).startsWith(before)).toBe(true)
})

test('listing it again says it is already listed, writes nothing and exits 0', async () => {
  const memory = game()
  await run(memory, '--type', 'figure', '--path', KEEPER)
  const once = project(memory)
  expect(await run(memory, '--type', 'figure', '--path', KEEPER)).toEqual({
    code: 0,
    out: [`${KEEPER} is already listed.`, 'Run "automata art" to paint its picture.'],
    err: [],
  })
  expect(project(memory)).toBe(once)
})

test('a kind with no picture to paint has no sentence about painting', async () => {
  const memory = game({ 'content/levels/level-2.json': smallGame()['content/levels/level-1.json'] ?? '' })
  expect(await run(memory, '--type', 'level', '--path', 'content/levels/level-2.json')).toEqual({
    code: 0,
    out: ['Listed content/levels/level-2.json as a level.'],
    err: [],
  })
})

test('a file that is not there is not listed: it says to write it first, and the exit is 2', async () => {
  const memory = game()
  const before = project(memory)
  expect(await run(memory, '--type', 'figure', '--path', 'content/figures/nobody.json')).toEqual({
    code: 2,
    out: [],
    err: ['There is no file at content/figures/nobody.json. Write it first, then run this again.'],
  })
  expect(project(memory)).toBe(before)
})

test('a file that does not read as its kind has its problems printed, nothing is written, exit 1', async () => {
  const memory = game({ [KEEPER]: '{ "format": 1 }' })
  const before = project(memory)
  const said = await run(memory, '--type', 'figure', '--path', KEEPER)
  expect(said.code).toBe(1)
  expect(said.out).toEqual([])
  expect(said.err.length).toBeGreaterThan(0)
  expect(said.err.every((line) => line.startsWith(`${KEEPER}: `))).toBe(true)
  expect(project(memory)).toBe(before)
})

test('a kind or a path the project refuses is a sentence and exit 2, and nothing is written', async () => {
  const memory = game()
  const before = project(memory)
  const kind = await run(memory, '--type', 'monster', '--path', KEEPER)
  expect(kind.code).toBe(2)
  expect(kind.err[0]).toMatch(/^automata\.toml: There is no kind of file called "monster"\. The kinds are: /)
  const path = await run(memory, '--type', 'figure', '--path', '../keeper.json')
  expect(path).toEqual({
    code: 2,
    out: [],
    err: ['automata.toml: Use a path inside the game, like content/levels/level-1.json.'],
  })
  expect(project(memory)).toBe(before)
})

test('--type or --path left out is a sentence that shows the whole command', async () => {
  const memory = game()
  const shown = 'automata add --type figure --path content/figures/keeper.json'
  for (const args of [[], ['--type', 'figure'], ['--path', KEEPER]]) {
    const said = await run(memory, ...args)
    expect(said.code).toBe(2)
    expect(said.err).toHaveLength(1)
    expect(said.err[0]).toContain(shown)
  }
})

test('a folder with no automata.toml is not a game', async () => {
  const memory = memoryLayer({})
  const code = await main(['add', 'nowhere', '--type', 'figure', '--path', KEEPER], memory.layer)
  expect(code).toBe(2)
  expect(memory.err[0]).toMatch(/is not a game: it has no automata\.toml\./)
})

test('--json prints the report and nothing else', async () => {
  const memory = game()
  const first = await run(memory, '--type', 'figure', '--path', KEEPER, '--json')
  expect(first.code).toBe(0)
  expect(JSON.parse(first.out.join('\n'))).toEqual({ ok: true, listed: true, problems: [] })
  const again = await run(memory, '--type', 'figure', '--path', KEEPER, '--json')
  expect(JSON.parse(again.out.join('\n'))).toEqual({ ok: true, listed: false, problems: [] })
})
