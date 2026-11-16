// `automata check --ship`: what is fine to play with and wrong to hand to a stranger, and the list only a game's makers
// can judge. One test per row of what the step finds, then the command, the report and the tool around it.
import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { BY_HAND, saveMark } from '#src/features/cli/check-ship.ts'
import { main } from '#src/features/cli/cli.ts'
import type { GameCode } from '#src/features/cli/ports.ts'
import type { CheckReport, StepReport } from '#src/features/cli/report.ts'
import { writeContent } from '#src/features/content/content.ts'
import * as framework from '#src/headless.ts'
import { gamePlugins } from '../../../template/src/headless.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, type MemoryOptions, memoryLayer } from '../../fixtures/cli/memory.ts'
import { templateInMemory } from '../../fixtures/cli/template.ts'
import { wordsGame } from '../../fixtures/cli/words.ts'

/** The whole check with `--ship` on a game at `game/`, and its last step. */
async function shipped(
  files: Record<string, string | Uint8Array>,
  options?: MemoryOptions,
): Promise<{ report: CheckReport; ship: StepReport; memory: Memory }> {
  const memory = memoryLayer(under('game', files as Record<string, string>), options)
  const report = await Effect.runPromise(
    runCheck({ folder: 'game', ship: true }).pipe(Effect.provide(memory.layer)),
  )
  const ship = report.steps.at(-1)
  if (ship?.step !== 'ship') throw new Error('The last step is not the ship step.')
  return { report, ship, memory }
}

const messages = (hello: string): string =>
  writeContent('messages', {
    format: 1,
    id: 'en',
    messages: { 'controls.jump': 'Jump', 'keeper.bye': 'Goodbye!', 'keeper.hello': hello },
  })

test('check --ship on a new game passes and prints the list', async () => {
  const code: GameCode = { framework, rules: { plugins: gamePlugins } }
  const made = memoryLayer(templateInMemory(), { code })
  expect(await main(['create', 'my-game', '--source', 'en'], made.layer)).toBe(0)
  const report = await Effect.runPromise(
    runCheck({ folder: 'my-game', ship: true }).pipe(Effect.provide(made.layer)),
  )
  const ship = report.steps.at(-1)
  expect(ship?.step).toBe('ship')
  expect(ship?.problems).toEqual([])
  expect(ship?.state).toBe('passed')
  expect(report.byHand).toEqual(BY_HAND)
})

test('a TODO in a message is a note in check and a problem in --ship', async () => {
  const files = { ...wordsGame('en', ['en']), 'content/messages/en.json': messages('TODO') }
  const { report, ship } = await shipped(files)
  expect(report.steps[0]?.notes).toContain('1 word is not finished. See them with automata check --ship.')
  expect(report.steps[0]?.state).toBe('passed')
  expect(ship.state).toBe('failed')
  expect(ship.problems).toEqual([
    {
      file: 'content/messages/en.json',
      path: 'messages.keeper.hello',
      message: '"keeper.hello" in English still says "TODO". Write what the player should read.',
    },
  ])
  expect(report.ok).toBe(false)
})

test('without --ship there is no ship step and no list', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  const report = await Effect.runPromise(runCheck({ folder: 'game' }).pipe(Effect.provide(memory.layer)))
  expect(report.steps.map((s) => s.step)).not.toContain('ship')
  expect(report.byHand).toBeUndefined()
})

test('a picture over 512 KB is a problem, and one at 512 KB is not', async () => {
  const picture = (kb: number): Uint8Array => new Uint8Array(kb * 1024)
  const heavy = await shipped({ ...smallGame(), 'content/art/big.png': picture(600) })
  expect(heavy.ship.problems).toEqual([
    {
      file: 'content/art/big.png',
      path: '',
      message: 'content/art/big.png is 600 KB. A picture over 512 KB makes the game slow to open. Make it smaller.',
    },
  ])
  const light = await shipped({ ...smallGame(), 'content/art/ok.png': picture(512) })
  expect(light.ship.problems).toEqual([])
})

test.each([
  ['a .css file', 'src/style.css', 'body {\n  color: red;\n  font-size: 12px;\n}\n'],
  ['a .svelte file', 'src/screen.svelte', '<p>hi</p>\n<style>\n  p { font-size: 10.5px }\n</style>\n'],
])('words under 14 pixels in %s are a problem at their line', async (_name, file, text) => {
  const { ship } = await shipped({ ...smallGame(), [file]: text })
  const line = text.split('\n').findIndex((l) => l.includes('font-size')) + 1
  const size = /(\d+\.?\d*)px/.exec(text)?.[1]
  expect(ship.problems).toEqual([
    {
      file,
      path: `line ${line}`,
      message: `${file} has words ${size} pixels tall. Under 14 a phone cannot read them.`,
    },
  ])
})

test('words 14 pixels tall or more, and a size in rem, are not small', async () => {
  const css = 'a { font-size: 14px }\nb { font-size: 1.2rem }\nc { font-size: 24px }\n'
  expect((await shipped({ ...smallGame(), 'src/style.css': css })).ship.problems).toEqual([])
})

// The save: the shape changed and the version did not.
const OLD = framework.z.object({ coins: framework.z.number() })
const NEW = framework.z.object({ coins: framework.z.number(), gems: framework.z.number() })
const saveWith = (schema: typeof OLD, version: number): GameCode => ({
  framework,
  rules: {
    plugins: [],
    save: framework.defineSave({ game: 'crate-game', version, schema, slots: 1 }),
  },
})
const recorded = (mark: string): Record<string, string> => ({
  ...smallGame(),
  'replays/level-1.json': JSON.stringify({ format: 2, meta: { save: mark }, commands: [], ticks: 0 }),
})
const markOf = (schema: typeof OLD, version: number): string =>
  saveMark(framework, framework.defineSave({ game: 'crate-game', version, schema, slots: 1 }))
const SAVE_PROBLEM = {
  file: 'src/headless.ts',
  path: '',
  message:
    "The saved game's shape changed and its version did not, so players would lose their saves. Raise version in defineSave and add the step that upgrades the old one.",
}

test('a save whose shape changed and whose version did not is a problem', async () => {
  const code = saveWith(NEW, 1)
  const { ship } = await shipped(recorded(markOf(OLD, 1)), { code })
  expect(ship.problems).toEqual([SAVE_PROBLEM])
})

test('a save with the same shape, a raised version, or no recording that knows it is fine', async () => {
  const same = saveWith(OLD, 1)
  expect((await shipped(recorded(markOf(OLD, 1)), { code: same })).ship.problems).toEqual([])
  const raised = saveWith(NEW, 2)
  expect((await shipped(recorded(markOf(OLD, 1)), { code: raised })).ship.problems).toEqual([])
  const unknown = saveWith(NEW, 1)
  expect((await shipped(smallGame(), { code: unknown })).ship.problems).toEqual([])
})

test('a save's mark is stable, follows its fields in the hash and its version in the version', () => {
  const [version, hash] = markOf(OLD, 1).split(':')
  expect(markOf(OLD, 1)).toBe(markOf(OLD, 1))
  expect(markOf(NEW, 1).split(':')[1]).not.toBe(hash)
  expect(markOf(NEW, 1).split(':')[0]).toBe(version)
  expect(markOf(OLD, 2)).toBe(`2:${hash}`)
  expect(hash).toMatch(/^[0-9a-f]{16}$/)
})

test('a level with no goal line is a note under --ship and does not fail it', async () => {
  const { ship } = await shipped(smallGame())
  expect(ship.state).toBe('passed')
  expect(ship.notes).toEqual([
    'level-1 has no goal line. Add "level.level-1.goal" to your messages, so a new player is told what to do.',
  ])
})

test('a level with a goal line has no such note', async () => {
  const goal = writeContent('messages', {
    format: 1,
    id: 'en',
    messages: {
      'controls.jump': 'Jump',
      'keeper.bye': 'Bye!',
      'keeper.hello': 'Hello!',
      'level.level-1.goal': 'Push the crate.',
    },
  })
  const { ship } = await shipped({ ...wordsGame('en', ['en']), 'content/messages/en.json': goal })
  expect(ship.notes).toEqual([])
})

test('--ship --only files is refused with its sentence', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await main(['check', 'game', '--ship', '--only', 'files'], memory.layer)).toBe(2)
  expect(memory.err).toEqual(['--ship checks everything. Leave out --only.'])
})

test('--only ship is not a step to pick', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  expect(await main(['check', 'game', '--only', 'ship'], memory.layer)).toBe(2)
  expect(memory.err[0]).toContain('There is no step called "ship".')
})

test('--json carries ship findings and byHand', async () => {
  const files = { ...wordsGame('en', ['en']), 'content/messages/en.json': messages('TODO') }
  const memory = memoryLayer(under('game', files))
  expect(await main(['check', 'game', '--ship', '--json'], memory.layer)).toBe(1)
  const report = JSON.parse(memory.out.join('\n')) as CheckReport
  expect(report.byHand).toEqual(BY_HAND)
  expect(report.steps[0]?.ship?.map((f) => f.rule)).toEqual(['words'])
  expect(report.steps.at(-1)?.step).toBe('ship')
})

test('the printed report lists what to try yourself', async () => {
  const memory = memoryLayer(under('game', smallGame()))
  await main(['check', 'game', '--ship'], memory.layer)
  const text = memory.out.join('\n')
  expect(text).toContain('Try these yourself:')
  for (const line of BY_HAND) expect(text).toContain(`  ${line}`)
})
