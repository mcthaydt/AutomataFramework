// Loading a whole game, every kind of file, builds no code from strings. It has its own file because it must be the first
// thing to load the headless entry, as the other two checks of this folder are for theirs.
import { expect, test } from 'vitest'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { attemptsToBuildCode } from '../../fixtures/strict-csp.ts'

test('loading a whole game through the headless entry builds no code from strings', async () => {
  const attempts = await attemptsToBuildCode(async () => {
    const { loadGame } = await import('#src/headless.ts')
    const loaded = await loadGame(readFullGame())
    if (!loaded.ok) throw new Error('the full game did not load')
  })
  expect(attempts).toEqual([])
})
