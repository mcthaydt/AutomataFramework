#!/usr/bin/env node
// The review graph's merge step (.claude/skills/review-graph/SKILL.md): a script, because joining, deduplicating and
// sorting have one right answer each and need no judgement.
//
//   node .claude/tools/findings.mjs <lens report.md>... > <cycle>-findings.md
//
// It reads the findings table at the end of every lens's report, drops a row whose `file:line` and finding repeat
// one already seen (saying which lens also found it), sorts by severity and prints one table. It fails on a row that
// is not in the table's shape, or on two different findings with the same id, so a broken report stops the loop
// before any fix starts. `merge` is exported for tests/agent/findings.test.ts.
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const COLUMNS = ['id', 'severity', 'file:line', 'finding', 'evidence', 'check']
const SEVERITIES = ['high', 'medium', 'low']

/** The cells of one table row, or null when the line is not a row. */
function cells(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

const key = (row) => `${row['file:line']}\u0000${row.finding.toLowerCase().replace(/\W+/g, ' ').trim()}`

/** Every finding in the given reports, merged. `reports` is a list of { name, text }. */
export function merge(reports) {
  const rows = []
  const errors = []
  for (const { name, text } of reports) {
    for (const line of text.split('\n')) {
      const row = cells(line)
      if (!row || row[0] === 'id' || row.every((cell) => /^:?-+:?$/.test(cell))) continue
      if (row.length !== COLUMNS.length || !SEVERITIES.includes(row[1])) {
        errors.push(`${name}: not a findings row: ${line.trim()}`)
        continue
      }
      rows.push({ ...Object.fromEntries(COLUMNS.map((column, i) => [column, row[i]])), lens: name, also: [] })
    }
  }
  const kept = new Map()
  const ids = new Map()
  for (const row of rows) {
    const same = kept.get(key(row))
    if (same) {
      same.also.push(row.lens)
      continue
    }
    const other = ids.get(row.id)
    if (other) errors.push(`${row.id} names two findings, in ${other.lens} and ${row.lens}: give one a new id`)
    ids.set(row.id, row)
    kept.set(key(row), row)
  }
  const order = (row) => SEVERITIES.indexOf(row.severity)
  const sorted = [...kept.values()].sort((a, b) => order(a) - order(b))
  return { rows: sorted, errors }
}

/** The merged findings as the table the fix session reads. */
export function table(rows) {
  const lines = [`| ${[...COLUMNS, 'lens'].join(' | ')} |`, `|${' --- |'.repeat(COLUMNS.length + 1)}`]
  for (const row of rows) {
    const lens = [row.lens, ...row.also].join(', ')
    lines.push(`| ${[...COLUMNS.map((column) => row[column]), lens].join(' | ')} |`)
  }
  return `${lines.join('\n')}\n`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2)
  const reports = files.map((file) => ({ name: basename(file, '.md'), text: readFileSync(file, 'utf8') }))
  const { rows, errors } = merge(reports)
  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`# Findings\n\nMerged from ${files.length} lens report(s).\n\n${table(rows)}`)
  }
}
