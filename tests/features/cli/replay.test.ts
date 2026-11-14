import { Effect } from 'effect'
import { expect, test, vi } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { main } from '#src/features/cli/cli.ts'
import { CliError, type GameCode } from '#src/features/cli/ports.ts'
import { parseReplay, writeReplay } from '#src/features/commands/commands.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import {
  codeWith,
  failingHero,
  fasterHero,
  nobodysPlay,
  noisyHero,
  RECORDED_CODE,
  recordedPlay,
} from '../../fixtures/cli/recording.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const FILE = 'replays/level-1.json'
const LEVEL = 'content/levels/level-1.json'
const ACCEPT = `npm run accept -- ${FILE}`
const CODE_CHANGED = `The game's rules have changed since this was recorded: its code, or the framework's version. If the play was meant to change, run: ${ACCEPT}`
const NO_RECORDINGS = 'This game has no recordings in replays/.'
const NOT_LOADED = "This file is missing. It lists the game's rules: export const gamePlugins = [ ... ]."

interface Setup {
  /** What the game's code is: the rules the play was recorded with unless said. */
  readonly code?: GameCode | CliError
  /** Files of the game to change (a content file, say) beside its recordings. */
  readonly changes?: Record<string, string>
}

/** A game folder `game/` with these recordings (by path; the recorded play when none) and `code` as its rules. */
async function replays(recordings?: Record<string, string>, setup: Setup = {}): Promise<Memory> {
  const played = recordings ?? { [FILE]: await recordedPlay() }
  const files = { ...smallGame(), ...setup.changes, ...played }
  return memoryLayer(under('game', files), { code: setup.code ?? RECORDED_CODE })
}
/** The level file with its crate moved: content that is not the recorded content. */
const movedCrate = (): Record<string, string> => {
  const level = JSON.parse(fixtureFiles[LEVEL] as string) as { things: { x: number }[] }
  ;(level.things[0] as { x: number }).x = 9.5
  return { [LEVEL]: `${JSON.stringify(level, null, 2)}\n` }
}
const play = async (memory: Memory, ...flags: string[]): Promise<number> =>
  main(['replay', 'game', ...flags], memory.layer)
const hashOf = (text: string): string => parseReplay(text).finalHash

test('a recording that still plays says so', async () => {
  const text = await recordedPlay()
  const memory = await replays({ [FILE]: text })
  expect(await play(memory)).toBe(0)
  expect(memory.out).toEqual([`${FILE}: Played 300 ticks and ended on ${hashOf(text)}, as recorded.`])
})

test('changed content is not a failure: its hashes are not compared, and the sentence says what to run', async () => {
  const memory = await replays(undefined, { changes: movedCrate() })
  expect(await play(memory)).toBe(0)
  const [line] = memory.out
  expect(line).toMatch(/^replays\/level-1\.json: The game's content has changed since this was recorded, /)
  expect(line).toMatch(/ so its hashes were not compared\. It played 300 ticks and ended on [0-9a-f]{16}\. /)
  expect(line).toMatch(/To record how the game plays now, run: npm run accept -- replays\/level-1\.json$/)
})

test('changed content and changed rules say so together (audit M7)', async () => {
  const memory = await replays(undefined, { changes: movedCrate(), code: codeWith([]) })
  expect(await play(memory)).toBe(0)
  expect(memory.out[0]).toContain('Its rules have changed too. To record how the game plays now, run:')
})

test('changed rules are code-changed, and exit 1', async () => {
  const memory = await replays(undefined, { code: codeWith([]) })
  expect(await play(memory)).toBe(1)
  expect(memory.out).toEqual([`${FILE}: ${CODE_CHANGED}`])
})

test('a play that ends somewhere else says where it first differs, and exits 1', async () => {
  const memory = await replays(undefined, { code: codeWith([fasterHero]) })
  expect(await play(memory)).toBe(1)
  const sentence = `The game no longer plays the way it was recorded: it first differs at tick 60. Look at what changed in src/. If the new play is right, run: ${ACCEPT}`
  expect(memory.out).toEqual([`${FILE}: ${sentence}`])
})

test('a level the game does not have cannot be played, and says so', async () => {
  const recorded = JSON.parse(await recordedPlay()) as object
  const text = JSON.stringify({ ...recorded, meta: { level: 'level-9', players: '1' } })
  const memory = await replays({ [FILE]: text })
  expect(await play(memory)).toBe(1)
  const detail = 'it was recorded on the level "level-9", which this game does not have'
  expect(memory.out).toEqual([`${FILE}: This cannot be played on this game: ${detail}.`])
})

test('a file that is not a replay is named with its sentence, and the others are still played', async () => {
  const memory = await replays({ 'replays/bad.json': '{"nope": 1}', [FILE]: await recordedPlay() })
  expect(await play(memory)).toBe(1)
  expect(memory.out).toHaveLength(2)
  expect(memory.out[0]).toMatch(/^replays\/bad\.json: This is not a replay/)
  expect(memory.out[1]).toContain('as recorded.')
})

test('a rule that throws while playing is reported, not thrown', async () => {
  const memory = await replays(undefined, { code: codeWith([failingHero]) })
  expect(await play(memory)).toBe(1)
  expect(memory.out).toHaveLength(1)
  expect(memory.out[0]).toMatch(/^replays\/level-1\.json: The game stopped at tick \d+: .*boom.*\.$/)
})

test('--accept writes format 2 with the new hashes and keeps the commands and the meta', async () => {
  const original = await recordedPlay()
  const accept = await replays({ [FILE]: original }, { code: codeWith([fasterHero]) })
  expect(await play(accept, '--accept')).toBe(0)
  expect(accept.out).toHaveLength(1)
  expect(accept.out[0]).toMatch(
    /^replays\/level-1\.json: Recorded again: 300 ticks, ending on [0-9a-f]{16}\.$/,
  )
  const written = accept.files.get(`game/${FILE}`) as string
  const again = parseReplay(written)
  const before = parseReplay(original)
  expect(again.format).toBe(2)
  expect(again.commands).toEqual(before.commands)
  expect(again.meta).toEqual(before.meta)
  expect(again.finalHash).not.toBe(before.finalHash)
  expect(written).toBe(writeReplay(again))

  // Played again with the same rules, it ends where it was recorded.
  const kept = Object.fromEntries(accept.files) as Record<string, string>
  const second = memoryLayer(kept, { code: codeWith([fasterHero]) })
  expect(await play(second)).toBe(0)
  expect(second.out).toEqual([`${FILE}: Played 300 ticks and ended on ${again.finalHash}, as recorded.`])
})

test('--accept leaves out a command the game now refuses', async () => {
  const original = JSON.parse(await recordedPlay()) as { commands: unknown[] }
  original.commands.unshift({ tick: 5, source: 1, seq: 7, type: 'no-such-command', payload: {} })
  const memory = await replays({ [FILE]: JSON.stringify(original) })
  expect(await play(memory, '--accept')).toBe(0)
  const written = parseReplay(memory.files.get(`game/${FILE}`) as string)
  expect(written.commands.map((c) => c.type)).not.toContain('no-such-command')
  expect(written.commands).toHaveLength(original.commands.length - 1)
})

test('a game with no recordings says so, and that is not a failure', async () => {
  const memory = memoryLayer(under('game', smallGame()), { code: RECORDED_CODE })
  expect(await play(memory)).toBe(0)
  expect(memory.out).toEqual([NO_RECORDINGS])
})

test('a recording named by its path is the only one played', async () => {
  const text = await recordedPlay()
  const memory = await replays({ [FILE]: text, 'replays/bad.json': '{}' })
  expect(await main(['replay', `game/${FILE}`], memory.layer)).toBe(0)
  expect(memory.out).toEqual([`${FILE}: Played 300 ticks and ended on ${hashOf(text)}, as recorded.`])
})

test('rules that will not load: nothing can be played, and the sentence names src/headless.ts', async () => {
  const problem = { file: 'src/headless.ts', path: '', message: NOT_LOADED }
  const memory = await replays(undefined, { code: { ...RECORDED_CODE, rules: { problem } } })
  expect(await play(memory)).toBe(2)
  expect(memory.err).toEqual([`src/headless.ts: ${NOT_LOADED}`])
})

test('sims are disposed: twenty recordings in a row do not run Koota out of worlds', async () => {
  const text = await recordedPlay()
  const names = Array.from({ length: 20 }, (_, i) => `replays/r${String(i).padStart(2, '0')}.json`)
  const memory = await replays(Object.fromEntries(names.map((name) => [name, text])))
  expect(await play(memory)).toBe(0)
  expect(memory.out).toHaveLength(20)
  expect(memory.out.every((line) => line.endsWith('as recorded.'))).toBe(true)
})

test('--json prints each result as data', async () => {
  const text = await recordedPlay()
  const memory = await replays({ [FILE]: text })
  expect(await play(memory, '--json')).toBe(0)
  expect(JSON.parse(memory.out.join(''))).toEqual([
    {
      file: FILE,
      verdict: 'ok',
      message: `Played 300 ticks and ended on ${hashOf(text)}, as recorded.`,
      ticks: 300,
      finalHash: hashOf(text),
    },
  ])
})

test('--json is the only thing on stdout: what the rules print goes to stderr, and console is put back after', async () => {
  const memory = await replays(undefined, { code: codeWith([noisyHero]) })
  const before = console.log
  const said: string[] = []
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    said.push(String(chunk))
    return true
  })
  try {
    // What matters is where the words went, not the verdict: stdout is one JSON value, the rules' line is on stderr.
    await play(memory, '--json')
    expect(said.join('')).toContain('the rules said hello\n')
    expect(JSON.parse(memory.out.join(''))).toMatchObject([{ file: FILE }])
    expect(console.log).toBe(before)
  } finally {
    spy.mockRestore()
  }
})

test("a recording that started with nobody is played with nobody, and one that does not say is player 1's (audit M16)", async () => {
  const nobody = await nobodysPlay()
  const empty = await replays({ [FILE]: nobody })
  expect(await play(empty)).toBe(0)
  expect(empty.out).toEqual([`${FILE}: Played 120 ticks and ended on ${hashOf(nobody)}, as recorded.`])

  const recorded = JSON.parse(await recordedPlay()) as { meta: Record<string, string> }
  const unsaid = { ...recorded, meta: { level: 'level-1' } }
  const one = await replays({ [FILE]: JSON.stringify(unsaid) })
  expect(await play(one)).toBe(0)
  expect(one.out[0]).toContain('as recorded.')
})

test('a recording in a folder under replays/ is named by its path, and found from it', async () => {
  const text = await recordedPlay()
  const nested = 'replays/runs/first.json'
  const memory = await replays({ [nested]: text })
  expect(await main(['replay', `game/${nested}`], memory.layer)).toBe(0)
  expect(memory.out).toEqual([`${nested}: Played 300 ticks and ended on ${hashOf(text)}, as recorded.`])
})

test('--state adds where everything is after the last tick', async () => {
  const memory = await replays()
  expect(await play(memory, '--state')).toBe(0)
  const text = memory.out.join('\n')
  expect(text).toContain('At tick 300 on level-1, with player 1:')
  expect(text).toMatch(/crate-1 \(crate\) is at [-\d.]+, [-\d.]+ and moving [-\d.]+, [-\d.]+/)
  expect(text).toMatch(/player-1 \(hero\) is at [-\d.]+, [-\d.]+ and moving [-\d.]+, [-\d.]+/)
})

test('--state --json carries the state', async () => {
  interface Shown {
    readonly state: { tick: number; level: string; players: number[]; things: { id: string }[] }
  }
  const memory = await replays()
  expect(await play(memory, '--state', '--json')).toBe(0)
  const [result] = JSON.parse(memory.out.join('')) as Shown[]
  expect(result?.state).toMatchObject({ tick: 300, level: 'level-1', players: [1] })
  expect(result?.state.things.map((t) => t.id)).toEqual(['crate-1', 'player-1'])
})

// The step in `check`.
const replaysStep = async (memory: Memory) => {
  const check = runCheck({ folder: 'game', only: 'replays' }).pipe(Effect.provide(memory.layer))
  return (await Effect.runPromise(check)).steps[0]
}

test('in check, changed content is a note and the step passes', async () => {
  const step = await replaysStep(await replays(undefined, { changes: movedCrate() }))
  expect(step?.state).toBe('passed')
  expect(step?.notes[0]).toMatch(/^replays\/level-1\.json: The game's content has changed since /)
})

test('in check, changed rules and a diverged play fail the step', async () => {
  const rules = await replaysStep(await replays(undefined, { code: codeWith([]) }))
  expect(rules?.state).toBe('failed')
  expect(rules?.problems).toEqual([{ file: FILE, path: '', message: CODE_CHANGED }])

  const diverged = await replaysStep(await replays(undefined, { code: codeWith([fasterHero]) }))
  expect(diverged?.state).toBe('failed')
  expect(diverged?.problems[0]?.message).toContain('it first differs at tick 60')
})

test('in check, a game with no recordings is skipped with the note', async () => {
  const step = await replaysStep(memoryLayer(under('game', smallGame()), { code: RECORDED_CODE }))
  expect(step).toEqual({ step: 'replays', state: 'skipped', problems: [], notes: [NO_RECORDINGS] })
})

test('in check, rules that will not load: replays could not run', async () => {
  const problem = { file: 'src/headless.ts', path: '', message: NOT_LOADED }
  const step = await replaysStep(await replays(undefined, { code: { ...RECORDED_CODE, rules: { problem } } }))
  expect(step).toEqual({
    step: 'replays',
    state: 'could-not-run',
    problems: [],
    notes: [`src/headless.ts: ${NOT_LOADED}`],
  })
})

test('in check, a game that is not installed: replays could not run, with the sentence for it', async () => {
  const advice = "This game's tools are not installed yet. Run npm install in game, then try again."
  const step = await replaysStep(await replays(undefined, { code: new CliError(advice) }))
  expect(step).toEqual({ step: 'replays', state: 'could-not-run', problems: [], notes: [advice] })
})

test('in check, a game whose files do not read cannot have its recordings played', async () => {
  const step = await replaysStep(await replays(undefined, { changes: { [LEVEL]: '{ not json' } }))
  expect(step?.state).toBe('could-not-run')
  expect(step?.notes[0]).toBe(
    "The game's files have problems, so its recordings cannot be played. Run automata check --only files.",
  )
})
