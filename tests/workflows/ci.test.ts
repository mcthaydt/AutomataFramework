import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// CI's pictures are kept only as artifacts of each run (the Owner, 2026-11-15: no ci-screens branch here). These
// checks read the workflow's text because the workflow only runs on GitHub.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const jobs = ci.slice(ci.indexOf('\njobs:'))

test('the workflow as a whole can only read the repository', () => {
  expect(ci.slice(0, ci.indexOf('\njobs:'))).toMatch(/^permissions:\n {2}contents: read$/m)
})

test('no job may write to the repository, and nothing pushes a branch', () => {
  expect(jobs).not.toContain('contents: write')
  expect(jobs).not.toContain('git push')
  expect(jobs).not.toContain('\n  screens:')
})

test('the package job copies the full game, so the packed install loads every kind of file', () => {
  const pack = jobs.slice(jobs.indexOf('\n  package:'))
  expect(pack).toContain('cp -r tests/fixtures/full-game "$smoke/full-game"')
})

test("the package job copies the art golden and the plain hash, so the packed install checks the full game's pictures", () => {
  const pack = jobs.slice(jobs.indexOf('\n  package:'))
  expect(pack).toContain('tests/golden/art.json')
  expect(pack).toContain('tests/fixtures/xxhash64-reference.ts')
})

test('the package job copies the playground and its golden, so the packed install loads ropes and touch', () => {
  const pack = jobs.slice(jobs.indexOf('\n  package:'))
  expect(pack).toContain('cp -r tests/fixtures/playground "$smoke/playground"')
  expect(pack).toContain('tests/golden/playground.json')
})

test('the package job also typechecks the consumer with TypeScript 6 and NodeNext, and checks what the tarball holds', () => {
  const pack = jobs.slice(jobs.indexOf('\n  package:'))
  expect(pack).toContain('node "$GITHUB_WORKSPACE/node_modules/typescript-6/bin/tsc" -p tsconfig.ts6.json')
  expect(pack).toContain('node tests/install/tarball.mjs "$RUNNER_TEMP"/pack/*.tgz')
})
