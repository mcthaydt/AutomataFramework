import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The online job only runs on GitHub, so these read its text: it has to build the package first (the room server is
// `dist/`), install every browser (each engine plays), run the journeys, and keep the repository read-only.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const jobs = ci.slice(ci.indexOf('\njobs:'))
const start = jobs.indexOf('\n  online:')
const online = jobs.slice(start, jobs.indexOf('\n  # The same pictures', start))

test('the online job builds the package, installs all three browsers and runs the journeys', () => {
  expect(online).toContain('pnpm exec playwright install --with-deps chromium webkit firefox')
  expect(online.indexOf('pnpm build')).toBeGreaterThan(-1)
  expect(online.indexOf('pnpm test:journeys')).toBeGreaterThan(online.indexOf('pnpm build'))
})

test('the online job never writes to the repository', () => {
  expect(online).not.toContain('contents: write')
})

test('its pictures are kept as screens-online, which the screens job waits for and copies', () => {
  expect(online).toContain('name: screens-online')
  expect(jobs.slice(jobs.indexOf('\n  screens:'), jobs.indexOf('\n  package:'))).toContain(
    'needs: [engines, online, create-play]',
  )
})

test('the journeys have a project of their own, which the fast Node one leaves out', () => {
  const config = readFileSync(new URL('../../vitest.config.ts', import.meta.url), 'utf8')
  expect(config).toContain("name: 'journeys'")
  expect(config).toContain("'**/*.journey.test.ts'")
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    scripts: Record<string, string>
  }
  expect(manifest.scripts['test:journeys']).toBe('vitest run --project journeys')
})
