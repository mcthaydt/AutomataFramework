import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The jobs that make a new game from the packed package run only on GitHub, so these read the workflow's text.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
}
const jobs = ci.slice(ci.indexOf('\njobs:'))
/** One job's text, from its name to the next job's. */
function job(name: string): string {
  const start = jobs.indexOf(`\n  ${name}:`)
  expect(start, `${name} is a job`).toBeGreaterThan(-1)
  const next = jobs.slice(start + 1).search(/\n {2}[a-z-]+:\n/)
  return next === -1 ? jobs.slice(start) : jobs.slice(start, start + 1 + next)
}

test('the create job runs on Linux, Windows and macOS, and one failing does not stop the others', () => {
  const create = job('create')
  expect(create).toContain('os: [ubuntu-latest, windows-latest, macos-latest]')
  expect(create).toContain('fail-fast: false')
  expect(create).toMatch(/runs-on: \$\{\{ matrix\.os \}\}/)
})

test('the create matrix has one key, os, and the job no name, so the checks are named create (os)', () => {
  const create = job('create')
  expect(create).not.toMatch(/^ {4}name:/m)
  const matrix = create.slice(create.indexOf('matrix:'), create.indexOf('env:'))
  expect(matrix.match(/^ {8}[a-z]+:/gm)).toEqual(['        os:'])
})

test('both jobs install the packed package, never the working folder', () => {
  expect(job('create-pack')).toContain('pnpm pack --pack-destination')
  for (const name of ['create', 'create-play']) {
    const text = job(name)
    expect(text, name).toContain('needs: create-pack')
    expect(text, name).toContain('--name create-tarball')
  }
  expect(job('create')).toMatch(/node tests\/install\/create-smoke\.mjs "\$\{\{ runner\.temp \}\}\/tarball"/)
  expect(job('create-play')).toMatch(/CREATE_TARBALL: \$\{\{ runner\.temp \}\}\/tarball/)
})

test('create-pack makes the one tarball, and uploads it under the name the others ask for', () => {
  const pack = job('create-pack')
  expect(pack).toContain('name: create-tarball')
  expect(pack).toContain('pnpm build')
})

test('neither job may write, and neither holds a secret', () => {
  for (const name of ['create-pack', 'create', 'create-play']) {
    const text = job(name)
    expect(text, name).not.toContain('contents: write')
    expect(text, name).not.toContain('secrets.')
  }
})

test('the screens job waits for create-play too, and the pictures it makes are uploaded', () => {
  expect(job('screens')).toContain('needs: [engines, online, create-play]')
  const play = job('create-play')
  expect(play).toContain('name: screens-create')
  expect(play).toContain('tests/create/__screenshots__/**')
  expect(play).toContain('pnpm exec playwright install --with-deps chromium webkit firefox')
})

test('test:journeys never runs tests/create, and test:create runs nothing else', () => {
  expect(manifest.scripts['test:journeys']).toBe('vitest run --project journeys')
  expect(manifest.scripts['test:create']).toBe('vitest run --project create')
  const config = readFileSync(new URL('../../vitest.config.ts', import.meta.url), 'utf8')
  expect(config).toContain("include: ['tests/journeys/**/*.journey.test.ts']")
  expect(config).toContain("include: ['tests/create/**/*.journey.test.ts']")
})
