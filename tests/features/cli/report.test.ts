import { expect, test } from 'vitest'
import { type CheckReport, exitCodeOf, formatReport, type StepReport } from '#src/features/cli/report.ts'

const step = (name: StepReport['step'], state: StepReport['state'], extra: Partial<StepReport> = {}): StepReport => ({
  step: name,
  state,
  problems: [],
  notes: [],
  ...extra,
})
const report = (...steps: StepReport[]): CheckReport => ({
  ok: steps.every((s) => s.state === 'passed' || s.state === 'skipped'),
  steps,
})

test('formatReport lines the steps up and ends with the count', () => {
  const text = formatReport(
    report(
      step('files', 'failed', {
        problems: [{ file: 'content/levels/level-1.json', path: 'things[0].x', message: 'This must be a number.' }],
        notes: ['Rewrote content/characters/hero.json in the standard form.'],
      }),
      step('rules', 'passed'),
      step('lint', 'failed', { output: 'src/main.ts:3:1 lint/style\n  A long line.' }),
      step('replays', 'skipped'),
    ),
  )
  expect(text).toBe(
    [
      'files     failed',
      '  content/levels/level-1.json: things[0].x: This must be a number.',
      '  Rewrote content/characters/hero.json in the standard form.',
      'rules     passed',
      'lint      failed',
      '  src/main.ts:3:1 lint/style',
      '    A long line.',
      'replays   skipped',
      '',
      '2 steps need fixing: files, lint. Fix the first and run automata check again.',
    ].join('\n'),
  )
})

test('one failed step is "1 step needs fixing"', () => {
  expect(formatReport(report(step('files', 'passed'), step('types', 'failed'))).split('\n').at(-1)).toBe(
    '1 step needs fixing: types. Fix the first and run automata check again.',
  )
})

test('a report where everything passed or was skipped says so', () => {
  const text = formatReport(report(step('files', 'passed'), step('tests', 'skipped', { notes: ['This game has no tests yet.'] })))
  expect(text).toBe(
    ['files     passed', 'tests     skipped', '  This game has no tests yet.', '', 'Everything passed.'].join('\n'),
  )
})

test('a step that could not run says why on its own line, and the count says so when nothing failed', () => {
  const text = formatReport(
    report(
      step('files', 'passed'),
      step('lint', 'could-not-run', { notes: ['biome is not installed in this game. Run npm install.'] }),
      step('types', 'could-not-run', { notes: ['tsc is not installed in this game. Run npm install.'] }),
    ),
  )
  expect(text).toBe(
    [
      'files     passed',
      'lint      could not run: biome is not installed in this game. Run npm install.',
      'types     could not run: tsc is not installed in this game. Run npm install.',
      '',
      '2 steps could not run: lint, types.',
    ].join('\n'),
  )
  expect(formatReport(report(step('lint', 'could-not-run', { notes: ['x'] }))).split('\n').at(-1)).toBe(
    '1 step could not run: lint.',
  )
})

test('exitCodeOf: 0 all passed or skipped, 1 any failed, 2 none failed and one could not run', () => {
  expect(exitCodeOf(report(step('files', 'passed'), step('lint', 'skipped')))).toBe(0)
  expect(exitCodeOf(report(step('files', 'failed'), step('lint', 'passed')))).toBe(1)
  expect(exitCodeOf(report(step('files', 'failed'), step('lint', 'could-not-run')))).toBe(1)
  expect(exitCodeOf(report(step('files', 'passed'), step('lint', 'could-not-run')))).toBe(2)
})
