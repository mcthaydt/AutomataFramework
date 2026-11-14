import { expect, test, vi } from 'vitest'
import { onlineSim } from '../../fixtures/online/game.ts'

// Loading the package must load no Colyseus SDK: a game that never goes online should not pay for it. The SDK is
// fetched by `import()` inside `joinSession`, as Rapier is fetched inside `createSim`.
test('importing the headless entry loads no SDK until a game joins a room', async () => {
  vi.resetModules()
  const loads: string[] = []
  vi.doMock('@colyseus/sdk', async (importOriginal) => {
    loads.push('@colyseus/sdk')
    return importOriginal()
  })
  const mod = await import('#src/headless.ts')
  expect(loads).toEqual([])
  const confirmed = await onlineSim(2)
  const predicted = await onlineSim(2)
  // Nothing listens on port 1, so the join fails; it is the SDK's loading that is being looked at.
  await expect(
    mod.joinSession({ server: 'ws://127.0.0.1:1', level: 'level-1', seats: 2, confirmed, predicted }),
  ).rejects.toMatchObject({ problem: 'no-server' })
  expect(loads).toEqual(['@colyseus/sdk'])
  confirmed.dispose()
  predicted.dispose()
  vi.doUnmock('@colyseus/sdk')
})
