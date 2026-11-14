import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { main } from '#src/features/cli/cli.ts'
import { CliError } from '#src/features/cli/ports.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type MemoryOptions, memoryLayer } from '../../fixtures/cli/memory.ts'

const WITH_TESTS = { ...smallGame(), 'tests/hero.test.ts': 'export {}\n' }

async function check(files: Record<string, string>, options: MemoryOptions = {}, fix = false) {
  const memory = memoryLayer(under('game', files), options)
  const run = runCheck({ folder: 'game', fix }).pipe(Effect.provide(memory.layer))
  const report = await Effect.runPromise(run)
  return { report, memory }
}
const stateOf = (report: Awaited<ReturnType<typeof check>>['report']) =>
  Object.fromEntries(report.steps.map((s) => [s.step, s.state]))

test('each step starts its tool in the game folder with these arguments', async () => {
  const { memory } = await check(WITH_TESTS)
  expect(memory.ran.map((r) => [r.tool, r.args, r.cwd, r.how])).toEqual([
    ['biome', ['check', '.'], 'game', 'run'],
    ['tsc', ['-p', '.'], 'game', 'run'],
    ['vitest', ['run'], 'game', 'run'],
  ])
})

test('with --fix the style step lets biome write, and the others are the same', async () => {
  const { memory } = await check(WITH_TESTS, {}, true)
  expect(memory.ran.map((r) => [r.tool, r.args])).toEqual([
    ['biome', ['check', '--write', '.']],
    ['tsc', ['-p', '.']],
    ['vitest', ['run']],
  ])
})

test('a tool that exits 0 passes its step', async () => {
  const { report } = await check(WITH_TESTS)
  expect(stateOf(report)).toMatchObject({ lint: 'passed', types: 'passed', tests: 'passed' })
  expect(report.ok).toBe(true)
})

test('a tool that exits 1 fails the step and its last lines are printed under it, indented', async () => {
  const output = 'src/main.ts:3:1 lint/style/useConst\n  Use const.'
  const memory = memoryLayer(under('game', WITH_TESTS), { tools: { biome: { code: 1, output } } })
  expect(await main(['check', 'game'], memory.layer)).toBe(1)
  const lines = [
    'lint      failed',
    '  src/main.ts:3:1 lint/style/useConst',
    '    Use const.',
    'types     passed',
  ]
  expect(memory.out[0]).toContain(lines.join('\n'))
  expect(memory.out[0]).toContain('1 step needs fixing: lint. Fix the first and run automata check again.')
})

test('a failed step has the tool output and no problems of its own', async () => {
  const output = 'src/a.ts(1,1): error TS2322'
  const { report } = await check(WITH_TESTS, { tools: { tsc: { code: 2, output } } })
  const types = report.steps.find((s) => s.step === 'types')
  expect(types).toEqual({ step: 'types', state: 'failed', problems: [], notes: [], output })
})

test('a missing tool is could-not-run, and the check exits 2 when nothing else failed', async () => {
  const memory = memoryLayer(under('game', WITH_TESTS), { tools: { biome: 'missing' } })
  expect(await main(['check', 'game'], memory.layer)).toBe(2)
  const sentence = 'lint      could not run: biome is not installed in this game. Run npm install.'
  expect(memory.out[0]).toContain(sentence)
  expect(memory.out[0]).toContain('1 step could not run: lint.')
})

test('a missing tool does not hide a step that failed: the check exits 1', async () => {
  const memory = memoryLayer(under('game', WITH_TESTS), {
    tools: { biome: 'missing', vitest: { code: 1, output: '1 failed' } },
  })
  expect(await main(['check', 'game'], memory.layer)).toBe(1)
})

test('before npm install: files is still answered, the three tools could not run, exit 2', async () => {
  const advice = "This game's tools are not installed yet. Run npm install in game, then try again."
  const memory = memoryLayer(under('game', WITH_TESTS), {
    code: new CliError(advice),
    tools: { biome: 'missing', tsc: 'missing', vitest: 'missing' },
  })
  expect(await main(['check', 'game'], memory.layer)).toBe(2)
  const text = memory.out[0] ?? ''
  expect(text).toContain('files     passed')
  expect(text).toContain("This game is not installed, so its files were checked with automata's own copy")
  expect(text).toContain('lint      could not run: biome is not installed in this game. Run npm install.')
  expect(text).toContain('types     could not run: tsc is not installed in this game. Run npm install.')
  expect(text).toContain('tests     could not run: vitest is not installed in this game. Run npm install.')
  expect(text.split('\n').at(-1)).toBe(advice)
})

test('no tests folder: skipped, with the note, and vitest is not started', async () => {
  const { report, memory } = await check(smallGame())
  expect(report.steps.find((s) => s.step === 'tests')).toEqual({
    step: 'tests',
    state: 'skipped',
    problems: [],
    notes: ['This game has no tests yet.'],
  })
  expect(memory.ran.map((r) => r.tool)).toEqual(['biome', 'tsc'])
})

test('the steps run in order and a failed step does not stop the next', async () => {
  const failing = { code: 1, output: 'no' }
  const tools = { biome: failing, tsc: failing, vitest: failing }
  const { report, memory } = await check(WITH_TESTS, { tools })
  expect(report.steps.map((s) => s.step)).toEqual(['files', 'rules', 'lint', 'types', 'replays', 'tests'])
  expect(stateOf(report)).toMatchObject({ lint: 'failed', types: 'failed', tests: 'failed' })
  expect(memory.ran.map((r) => r.tool)).toEqual(['biome', 'tsc', 'vitest'])
})

test('--only types starts one tool', async () => {
  const memory = memoryLayer(under('game', WITH_TESTS))
  expect(await main(['check', 'game', '--only', 'types'], memory.layer)).toBe(0)
  expect(memory.ran.map((r) => r.tool)).toEqual(['tsc'])
})
