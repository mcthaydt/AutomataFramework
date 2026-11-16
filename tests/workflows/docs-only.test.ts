import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

// The docs-only fast path (the Owner, 2026-11-15): a pull request that changes only Markdown that people read runs no
// tests, and the `docs` job passes every check main requires under its exact name. The workflow only runs on GitHub,
// so these checks run the `plan` step's own script here, with a stand-in for `gh` that names the changed files.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const jobs = ci.slice(ci.indexOf('\njobs:'))

/** One job's text: from its id (two spaces in) to the next job's id. */
const job = (id: string): string => {
  const rest = jobs.slice(jobs.indexOf(`\n  ${id}:\n`) + 1)
  const next = rest.slice(1).search(/\n {2}[\w-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

/** The `plan` step's script as GitHub runs it: the lines under `run: |`, their indent taken off. */
const script = (() => {
  const lines = job('plan').split('run: |\n')[1]?.split('\n') ?? []
  const end = lines.findIndex((line) => line !== '' && !line.startsWith(' '.repeat(10)))
  return (end < 0 ? lines : lines.slice(0, end)).map((line) => line.slice(10)).join('\n')
})()

/** What `plan` decides for a pull request that changes these files. */
function plan(files: string[], { draft = true, labels = '' } = {}): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), 'plan-'))
  const gh = join(dir, 'gh')
  writeFileSync(gh, `#!/bin/sh\nprintf '%s\\n' ${files.map((file) => `'${file}'`).join(' ')}\n`)
  chmodSync(gh, 0o755)
  const output = join(dir, 'output')
  writeFileSync(output, '')
  execFileSync('bash', ['-c', script], {
    stdio: 'pipe',
    env: {
      PATH: `${dir}:${process.env.PATH ?? ''}`,
      EVENT: 'pull_request',
      DRAFT: String(draft),
      LABELS: labels,
      PR: '1',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_OUTPUT: output,
    },
  })
  const pairs = readFileSync(output, 'utf8').trim().split('\n')
  return Object.fromEntries(pairs.map((pair) => [pair.split('=')[0] ?? '', pair.split('=')[1] ?? '']))
}

test('a pull request that changes only Markdown that people read is docs-only, draft or not', () => {
  const files = [
    'CLAUDE.md',
    'docs/superpowers/progress.md',
    'docs/superpowers/plans/2026-11-15-a-plan.md',
    '.claude/skills/review-graph/SKILL.md',
  ]
  expect(plan(files)).toMatchObject({ docs: 'true' })
  expect(plan(files, { draft: false })).toMatchObject({ docs: 'true' })
})

test.each([
  'README.md',
  'docs/api/framework.api.md',
  'skills/automata/SKILL.md',
  'template/README.md',
  'docs/notes.txt',
  '.claude/hooks/guard.mjs',
  '.claude/settings.json',
  'src/index.ts',
])('%s, which a test reads or is not Markdown, is tested', (file) => {
  expect(plan(['CLAUDE.md', file])).toMatchObject({ docs: 'false' })
  expect(plan(['CLAUDE.md', file], { draft: false })).toMatchObject({ docs: 'false', full: 'true' })
})

test('the `full-tests` label runs everything, Markdown or not', () => {
  expect(plan(['CLAUDE.md'], { labels: 'full-tests' })).toMatchObject({ docs: 'false', full: 'true' })
})

test('a draft that changes code still gets the quick run', () => {
  expect(plan(['CLAUDE.md', 'src/index.ts'])).toMatchObject({ docs: 'false', full: 'false' })
})

test('the `docs` job stands in for exactly the checks main requires, and only on a docs-only run', () => {
  const docs = job('docs')
  expect(docs).toContain("if: needs.plan.outputs.docs == 'true'")
  const names = [...docs.matchAll(/^ {10}- '([^']+)'$/gm)].map((match) => match[1])
  expect(names).toEqual([
    'check',
    'package',
    'engines (chromium)',
    'engines (webkit)',
    'engines (firefox)',
    'online',
    'create (ubuntu-latest)',
    'create (windows-latest)',
    'create (macos-latest)',
    'create-play',
  ])
})

test('every job that tests is left out of a docs-only run, so no skipped job wears a required name', () => {
  for (const id of ['check', 'browsers', 'engines', 'online', 'package', 'create-pack']) {
    expect(job(id), id).toMatch(/^ {4}if: .*needs\.plan\.outputs\.docs != 'true'/m)
  }
  expect(job('plan')).toContain("'skipped '")
})
