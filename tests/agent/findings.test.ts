import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { node } from './run.ts'

// The review graph's merge step (.claude/tools/findings.mjs), over lens reports written for each test.
function merge(reports: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'findings-'))
  const files = Object.entries(reports).map(([name, text]) => {
    writeFileSync(join(dir, `${name}.md`), text)
    return join(dir, `${name}.md`)
  })
  return node('.claude/tools/findings.mjs', files)
}

const HEAD = `| id | severity | file:line | finding | evidence | check |\n|${' --- |'.repeat(6)}\n`

/** A report: some words, then the findings table with these rows. */
const report = (...rows: string[]) => `# A lens\n\nSome notes.\n\n${HEAD}${rows.join('\n')}\n`

test('rows from every lens are joined, repeats dropped, and the high ones come first', () => {
  const result = merge({
    words: report(
      '| W1 | low | a.ts:1 | Typo here | seen | test |',
      '| W2 | high | b.ts:2 | Button too small | 40px | layout test |',
    ),
    journey: report(
      '| J1 | high | b.ts:2 | Button too small! | 40 px | layout test |',
      '| J2 | medium | c.ts:3 | No way back | stuck | journey |',
    ),
  })
  expect(result.status).toBe(0)
  const rows = result.stdout.split('\n').filter((line) => /^\| [WJ]\d/.test(line))
  expect(rows.map((row) => row.split(' | ')[0])).toEqual(['| W2', '| J2', '| W1'])
  expect(rows[0]).toContain('words, journey')
})

test('a row in the wrong shape, or two findings with one id, stops the merge', () => {
  expect(merge({ a: report('| A1 | urgent | a.ts:1 | x | y | z |') }).status).toBe(1)
  const twice = merge({
    a: report('| A1 | low | a.ts:1 | x | y | z |'),
    b: report('| A1 | low | b.ts:9 | w | y | z |'),
  })
  expect(twice.status).toBe(1)
  expect(twice.stderr).toContain('A1 names two findings')
})
