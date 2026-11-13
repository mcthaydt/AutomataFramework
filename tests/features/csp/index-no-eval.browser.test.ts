// The same promise for the browser entry (the headless entry plus render, input, host and game). Its own file, so it is
// the first thing to load the entry; see headless-no-eval.browser.test.ts.
import { expect, test } from 'vitest'
import { attemptsToBuildCode } from '../../fixtures/strict-csp.ts'

test('loading the browser entry builds no code from strings', async () => {
  const attempts = await attemptsToBuildCode(() => import('#src/index.ts'))
  expect(attempts).toEqual([])
})
