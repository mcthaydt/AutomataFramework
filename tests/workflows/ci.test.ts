import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// CI's pictures are copied to the `ci-screens` branch so a cloud session, which cannot reach the artifact
// store, can read them through the GitHub API. These checks read the workflow's text because the workflow
// only runs on GitHub.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const jobs = ci.slice(ci.indexOf('\njobs:'))
const screens = jobs.slice(jobs.indexOf('\n  screens:'), jobs.indexOf('\n  package:'))

test('the workflow as a whole can only read the repository', () => {
  expect(ci.slice(0, ci.indexOf('\njobs:'))).toMatch(/^permissions:\n {2}contents: read$/m)
})

test('only the screens job may write, and only after the engines made the pictures', () => {
  expect(jobs.match(/contents: write/g)).toHaveLength(1)
  expect(screens).toMatch(/^ {6}contents: write$/m)
  expect(screens).toMatch(/needs: \[engines, online, create-play\]/)
  expect(screens).toContain('if: always() &&')
})

test('pull requests from forks never get to write', () => {
  expect(screens).toContain('github.event.pull_request.head.repo.full_name == github.repository')
})

test('the pictures go only to the ci-screens branch, one writer at a time', () => {
  expect(screens).toContain('git push -q origin ci-screens')
  expect(screens.match(/git push/g)).toHaveLength(1)
  expect(screens).toMatch(/group: ci-screens\n {6}cancel-in-progress: false/)
})

test('the package job copies the full game, so the packed install loads every kind of file', () => {
  const pack = jobs.slice(jobs.indexOf('\n  package:'))
  expect(pack).toContain('cp -r tests/fixtures/full-game "$smoke/full-game"')
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
