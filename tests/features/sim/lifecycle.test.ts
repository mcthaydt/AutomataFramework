// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/lifecycle.test.ts
import { expect, test } from 'vitest'
import { z } from 'zod'
import { createSim, SimDisposedError } from '#src/features/sim/create-sim.ts'
import {
  definePlugin,
  defineResource,
  defineSystem,
  type PluginState,
} from '#src/features/sim/definitions.ts'
import { SnapshotFormatError } from '#src/features/sim/snapshot.ts'
import { Body, fixturePlugin } from '../../fixtures/fixture-world.ts'

// Lifecycle (M2.1 spec §3.1, §10.6): a failed createSim, dispose and a failed restore release everything they
// took, so Koota's 16 worlds and a plugin's engine (a Rapier world) never leak.

function trackedPlugin(name: string, log: string[], restore: 'ok' | 'reject' = 'ok') {
  return definePlugin({
    name,
    state: async (): Promise<PluginState> => {
      log.push(`${name}:create`)
      return {
        snapshot: () => Uint8Array.of(1),
        prepareRestore() {
          if (restore === 'reject') throw new SnapshotFormatError(`${name}: rejected`)
          log.push(`${name}:prepare`)
          return {
            commit: () => log.push(`${name}:commit`),
            discard: () => log.push(`${name}:discard`),
          }
        },
        dispose: () => log.push(`${name}:dispose`),
      }
    },
  })
}

const reservedName = definePlugin({
  name: 'bad-systems',
  systems: [defineSystem({ name: 'commands.apply', phase: 'input', run: () => {} })],
})
const BadInit = defineResource('bad-init', z.object({ n: z.number() }), () => ({ n: 'x' }) as never)
const badResource = definePlugin({ name: 'bad-resource', resources: [BadInit] })

test.each([
  ['a reserved system name', reservedName],
  ['a resource whose init fails its schema', badResource],
])('createSim failing on %s disposes the plugin states and frees its Koota world', async (_, bad) => {
  const log: string[] = []
  for (let i = 0; i < 20; i++) {
    await expect(
      createSim({ seed: 1, plugins: [fixturePlugin, trackedPlugin('engine', log), bad] }),
    ).rejects.toThrow()
  }
  // Each failure either never created the state or disposed it.
  const created = log.filter((l) => l === 'engine:create').length
  expect(log.filter((l) => l === 'engine:dispose').length).toBe(created)
  // More than 16 failures, and a sim can still be created.
  const sim = await createSim({ seed: 1, plugins: [fixturePlugin] })
  sim.dispose()
})

test('dispose is idempotent and disposes each plugin state once', async () => {
  const log: string[] = []
  const sim = await createSim({ seed: 1, plugins: [fixturePlugin, trackedPlugin('engine', log)] })
  sim.dispose()
  sim.dispose()
  expect(log).toEqual(['engine:create', 'engine:dispose'])
})

test('every call after dispose throws SimDisposedError', async () => {
  const sim = await createSim({ seed: 1, plugins: [fixturePlugin] })
  const bytes = sim.snapshot()
  sim.dispose()
  const calls: Array<() => unknown> = [
    () => sim.step([]),
    () => sim.spawn([[Body, {}]]),
    () => sim.entity(1),
    () => sim.query(Body),
    () => sim.resource(BadInit),
    () => sim.snapshot(),
    () => sim.restore(bytes),
    () => sim.hash(),
  ]
  for (const call of calls) expect(call).toThrow(SimDisposedError)
  expect(sim.tick).toBe(0) // plain fields stay readable
})

test('a restore one plugin rejects discards what the others prepared and commits nothing', async () => {
  const log: string[] = []
  const plugins = [fixturePlugin, trackedPlugin('a', log), trackedPlugin('b', log, 'reject')]
  const sim = await createSim({ seed: 1, plugins })
  const bytes = sim.snapshot()
  log.length = 0
  expect(() => sim.restore(bytes)).toThrow(SnapshotFormatError)
  expect(log).toEqual(['a:prepare', 'a:discard'])
  sim.dispose()
})

test('a successful restore commits every plugin and discards nothing', async () => {
  const log: string[] = []
  const sim = await createSim({ seed: 1, plugins: [trackedPlugin('a', log), trackedPlugin('b', log)] })
  const bytes = sim.snapshot()
  log.length = 0
  sim.restore(bytes)
  expect(log).toEqual(['a:prepare', 'b:prepare', 'a:commit', 'b:commit'])
  sim.dispose()
})

test('a plugin state whose dispose throws does not stop the others being disposed; the error still surfaces', async () => {
  const log: string[] = []
  const throwing = definePlugin({
    name: 'a-throwing', // sorts between a and b, so its dispose runs before b's
    state: async (): Promise<PluginState> => ({
      snapshot: () => Uint8Array.of(1),
      prepareRestore: () => ({ commit: () => {}, discard: () => {} }),
      dispose: () => {
        throw new Error('engine fault on free')
      },
    }),
  })
  const sim = await createSim({
    seed: 1,
    plugins: [fixturePlugin, trackedPlugin('a', log), throwing, trackedPlugin('b', log)],
  })
  expect(() => sim.dispose()).toThrow('engine fault on free')
  expect(log).toEqual(['a:create', 'b:create', 'a:dispose', 'b:dispose'])
  expect(() => sim.step([])).toThrow(SimDisposedError)
  sim.dispose() // still idempotent: nothing is disposed twice and nothing throws again
  expect(log.filter((l) => l.endsWith(':dispose'))).toEqual(['a:dispose', 'b:dispose'])
})
