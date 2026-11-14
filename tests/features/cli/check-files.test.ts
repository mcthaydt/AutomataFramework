import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { main } from '#src/features/cli/cli.ts'
import { CliError } from '#src/features/cli/ports.ts'
import type { CheckReport } from '#src/features/cli/report.ts'
import {
  type Language,
  loadGame,
  markRead,
  READ_MARKS_FILE,
  writeContent,
  writeReadMarks,
} from '#src/features/content/content.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, type MemoryOptions, memoryLayer } from '../../fixtures/cli/memory.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const LEVEL = 'content/levels/level-1.json'

/** The files step on a game in the folder `game/`, with some files replaced (or taken out, with `undefined`). */
async function filesStep(
  changes: Readonly<Record<string, string | undefined>> = {},
  options: { fix?: boolean; memory?: MemoryOptions } = {},
): Promise<{ report: CheckReport; memory: Memory }> {
  const files: Record<string, string | undefined> = { ...smallGame(), ...changes }
  const present = Object.fromEntries(
    Object.entries(files).filter((e): e is [string, string] => e[1] !== undefined),
  )
  const memory = memoryLayer(under('game', present), options.memory)
  const report = await Effect.runPromise(
    runCheck({ folder: 'game', only: 'files', fix: options.fix === true }).pipe(Effect.provide(memory.layer)),
  )
  return { report, memory }
}
const levelWith = (change: Record<string, unknown>): string =>
  JSON.stringify({ ...(JSON.parse(fixtureFiles[LEVEL] as string) as Record<string, unknown>), ...change })

test('the files step passes on a sound game', async () => {
  const { report } = await filesStep()
  expect(report).toEqual({
    ok: true,
    steps: [{ step: 'files', state: 'passed', problems: [], notes: [] }],
  })
})

test("it prints loadGame's problems as they are", async () => {
  const things = [{ id: 'crate-1', character: 'crate', x: 'far', y: 7.5 }]
  const { report } = await filesStep({ [LEVEL]: levelWith({ things }) })
  const [step] = report.steps
  expect(step?.state).toBe('failed')
  expect(step?.problems).toEqual([{ file: LEVEL, path: 'things[0].x', message: 'This must be a number.' }])
  expect(report.ok).toBe(false)
})

test('a file not in the standard form is a problem, and --fix rewrites it', async () => {
  // The same level with its keys in another order: it reads, but it is not what writeContent writes.
  const level = JSON.parse(fixtureFiles[LEVEL] as string) as Record<string, unknown>
  const shuffled = JSON.stringify({
    starts: level.starts,
    things: level.things,
    tiles: level.tiles,
    id: level.id,
    format: 1,
  })
  const without = await filesStep({ [LEVEL]: shuffled })
  expect(without.report.steps[0]?.state).toBe('failed')
  expect(without.report.steps[0]?.problems).toEqual([
    { file: LEVEL, path: '', message: 'This file is not in the standard form. Run automata check --fix.' },
  ])
  expect(without.memory.files.get(`game/${LEVEL}`)).toBe(shuffled)

  const fixed = await filesStep({ [LEVEL]: shuffled }, { fix: true })
  expect(fixed.memory.files.get(`game/${LEVEL}`)).toBe(fixtureFiles[LEVEL])
  expect(fixed.report.steps[0]).toEqual({
    step: 'files',
    state: 'passed',
    problems: [],
    notes: [`Rewrote ${LEVEL} in the standard form.`],
  })
})

test('--fix never rewrites a file that does not read', async () => {
  const broken = '{ "format": 1, "id": "level-1", '
  const { report, memory } = await filesStep({ [LEVEL]: broken }, { fix: true })
  expect(memory.files.get(`game/${LEVEL}`)).toBe(broken)
  expect(report.steps[0]?.state).toBe('failed')
  expect(report.steps[0]?.notes).toEqual([])
})

test('a .json under content/ that automata.toml does not list is a problem', async () => {
  const { report } = await filesStep({ 'content/levels/level-2.json': fixtureFiles[LEVEL] as string })
  expect(report.steps[0]?.problems).toEqual([
    {
      file: 'content/levels/level-2.json',
      path: '',
      message:
        'This file is not listed in automata.toml, so the game does not use it. List it, or delete it.',
    },
  ])
})

test('a file under content/ that is not json is left alone', async () => {
  const { report } = await filesStep({ 'content/levels/notes.txt': 'a note' })
  expect(report.steps[0]?.state).toBe('passed')
})

test("a game that is not installed is checked with the command's own copy, and the report says so", async () => {
  const { report } = await filesStep(
    {},
    {
      memory: {
        code: new CliError(
          "This game's tools are not installed yet. Run npm install in game, then try again.",
        ),
      },
    },
  )
  expect(report.steps[0]).toEqual({
    step: 'files',
    state: 'passed',
    problems: [],
    notes: [
      "This game is not installed, so its files were checked with automata's own copy of the framework.",
    ],
  })
})

test('--only files runs that step alone', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await main(['check', 'game', '--only', 'files'], memory.layer)).toBe(0)
  expect(memory.out).toEqual(['files     passed\n\nEverything passed.'])
})

test('--only wat names the steps', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await main(['check', 'game', '--only', 'wat'], memory.layer)).toBe(2)
  expect(memory.err).toEqual([
    'There is no step called "wat". The steps are: files, rules, lint, types, replays, tests.',
  ])
})

test('without --only every step has its place in the report, in order', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  const report = await Effect.runPromise(runCheck({ folder: 'game' }).pipe(Effect.provide(memory.layer)))
  expect(report.steps.map((s) => s.step)).toEqual(['files', 'rules', 'lint', 'types', 'replays', 'tests'])
  expect(report.steps[0]?.state).toBe('passed')
})

test('--json prints the CheckReport and nothing else', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await main(['check', 'game', '--only', 'files', '--json'], memory.layer)).toBe(0)
  const expected = await Effect.runPromise(
    runCheck({ folder: 'game', only: 'files' }).pipe(
      Effect.provide(memoryLayer(under('game', smallGame())).layer),
    ),
  )
  expect(JSON.parse(memory.out.join(''))).toEqual(expected)
  expect(memory.err).toEqual([])
})

test('a failed step is exit 1, and the report says what to fix', async () => {
  const memory = memoryLayer(under('game', { ...smallGame(), [LEVEL]: '{ not json' }))
  expect(await main(['check', 'game', '--only', 'files'], memory.layer)).toBe(1)
  expect(memory.out[0]).toContain('1 step needs fixing: files. Fix the first and run automata check again.')
  expect(memory.out[0]).toContain(`${LEVEL}: This file is not valid JSON.`)
})

// The words: a game with messages is checked in every language, and what no native speaker has read is a note.
const messages = (id: Language, words: Record<string, string>): string =>
  writeContent('messages', { format: 1, id, messages: words })
/** The fixture game with English and Spanish words (Spanish short of "hello" when `lacking`), and the files listing them. */
function withWords(lacking: boolean): Record<string, string> {
  const toml = (fixtureFiles['automata.toml'] as string).trimEnd()
  const listed = ['en', 'es'].map(
    (id) => `\n[[content]]\ntype = "messages"\npath = "content/messages/${id}.json"\n`,
  )
  return {
    'automata.toml': `${toml}\n${listed.join('')}`,
    'content/messages/en.json': messages('en', { 'controls.jump': 'Jump', 'keeper.hello': 'Hello there!' }),
    'content/messages/es.json': messages(
      'es',
      lacking ? { 'controls.jump': 'Saltar' } : { 'controls.jump': 'Saltar', 'keeper.hello': '¡Hola!' },
    ),
  }
}
test('a word a language lacks is a problem that names the file, the key and what English says', async () => {
  const { report } = await filesStep(withWords(true))
  const [step] = report.steps
  expect(step?.state).toBe('failed')
  expect(step?.problems.map((p) => p.message)).toContain(
    'This file has no "keeper.hello". English says "Hello there!". Write it in Spanish.',
  )
  expect(step?.problems.some((p) => p.file === 'content/messages/es.json')).toBe(true)
})

test('words nobody has read yet are a note with the count for each language, and never a failure', async () => {
  const { report } = await filesStep(withWords(false))
  const [step] = report.steps
  const words = step?.notes.filter((note) => note.startsWith('Words no native speaker has read yet')) ?? []
  expect(words).toEqual(['Words no native speaker has read yet (a first draft plays fine): Spanish 2.'])
  expect(step?.problems.filter((p) => p.file === 'content/messages/es.json')).toEqual([])
})

test('a read mark takes a word off the note, and a marks file that does not read is a problem', async () => {
  const content = await loadGame(async (path) => {
    const text = withWords(false)[path] ?? fixtureFiles[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  })
  if (!content.ok) throw new Error('the fixture words do not load')
  const marks = markRead(content.value, {}, 'es')
  const read = await filesStep({ ...withWords(false), [READ_MARKS_FILE]: writeReadMarks(marks) })
  expect(read.report.steps[0]?.notes).toEqual([])
  const broken = await filesStep({ ...withWords(false), [READ_MARKS_FILE]: 'format = 2' })
  expect(broken.report.steps[0]?.state).toBe('failed')
  expect(broken.report.steps[0]?.problems.map((p) => p.file)).toContain(READ_MARKS_FILE)
})

test('a game with no words says nothing about them', async () => {
  const { report } = await filesStep()
  expect(report.steps[0]).toEqual({ step: 'files', state: 'passed', problems: [], notes: [] })
})
