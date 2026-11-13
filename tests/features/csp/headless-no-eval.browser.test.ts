// Loading the headless entry, as a game's bundler first runs it, builds no code from strings. Zod tries to (a probe with
// `new Function`) the first time a schema needs it, and the headless entry builds its schemas as it loads, so the
// switch that stops the probe has to be set before anything else in the entry runs. Under a strict CSP Firefox reports
// the probe even though it is caught; this test counts it in every engine. It has its own file because it must be the
// first thing to load the entry.
import { expect, test } from 'vitest'
import { attemptsToBuildCode } from '../../fixtures/strict-csp.ts'

test('loading the headless entry builds no code from strings', async () => {
  const attempts = await attemptsToBuildCode(() => import('#src/headless.ts'))
  expect(attempts).toEqual([])
})
