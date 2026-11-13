// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/plugin-state.test.ts
import { expect, test } from 'vitest'
import { createSim } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineSystem, type PluginState } from '#src/features/sim/definitions.ts'
import { SnapshotFormatError, SnapshotMismatchError } from '#src/features/sim/snapshot.ts'
import { Body, fixturePlugin, Tag } from '../../fixtures/fixture-world.ts'

/** A plugin whose engine state is one counter, stepped by its own system: a stand-in for a Rapier world. */
function counterPlugin(name = 'counter', log: string[] = []) {
  return definePlugin({
    name,
    state: async (setup) => {
      log.push(`${name}:setup:${setup.dt}`)
      let count = 0
      const state: PluginState & { readonly count: number; bump(): void } = {
        get count() {
          return count
        },
        bump() {
          count += 1
        },
        snapshot: () => Uint8Array.of(count),
        prepareRestore(bytes) {
          if (bytes.length !== 1) throw new SnapshotFormatError(`${name}: expected 1 byte`)
          const next = bytes[0] as number
          return {
            commit: () => {
              count = next
            },
            discard: () => {},
          }
        },
        dispose: () => log.push(`${name}:dispose`),
      }
      return state
    },
    systems: [
      defineSystem({
        name: `${name}.bump`,
        phase: 'physics',
        run: (ctx) => (ctx.pluginState as { bump(): void }).bump(),
      }),
    ],
  })
}

test('each sim gets its own plugin state, visible only to that plugin’s systems', async () => {
  const seen: unknown[] = []
  const other: unknown[] = []
  const watcher = definePlugin({
    name: 'watcher',
    systems: [
      defineSystem({
        name: 'watch',
        phase: 'cleanup',
        run: (ctx) => {
          other.push(ctx.pluginState)
        },
      }),
    ],
  })
  const spy = definePlugin({
    name: 'spy',
    state: async () => ({
      snapshot: () => new Uint8Array(),
      prepareRestore: () => ({ commit: () => {}, discard: () => {} }),
      dispose: () => {},
    }),
    systems: [
      defineSystem({
        name: 'spy.look',
        phase: 'gameplay',
        run: (ctx) => {
          seen.push(ctx.pluginState)
        },
      }),
    ],
  })
  const a = await createSim({ seed: 1, plugins: [spy, watcher] })
  const b = await createSim({ seed: 1, plugins: [spy, watcher] })
  a.step([])
  b.step([])
  expect(seen[0]).toBeDefined()
  expect(seen[0]).not.toBe(seen[1])
  expect(other).toEqual([undefined, undefined])
})

test('states are set up in canonical plugin order with the fixed dt, and disposed with the sim', async () => {
  const log: string[] = []
  const sim = await createSim({
    seed: 1,
    tickHz: 50,
    plugins: [counterPlugin('zeta', log), counterPlugin('alpha', log)],
  })
  expect(log).toEqual(['alpha:setup:0.02', 'zeta:setup:0.02'])
  sim.dispose()
  expect(log.slice(2)).toEqual(['alpha:dispose', 'zeta:dispose'])
})

test('a sim without stateful plugins keeps its snapshot format (no section 6)', async () => {
  const sim = await createSim({ seed: 2026, plugins: [fixturePlugin] })
  const bytes = sim.snapshot()
  // The last section must be the entities section (tag 4); find tags by walking the sections.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tags: number[] = []
  for (let at = 4 + 2 + 8 + 8 + 4 + 2; at < bytes.length; ) {
    tags.push(view.getUint8(at))
    at += 5 + view.getUint32(at + 1, true)
  }
  expect(tags).toEqual([1, 2, 3, 4])
})

test('a stateful plugin changes the schema hash, so its snapshots never restore into a stateless sim', async () => {
  const plain = definePlugin({ name: 'counter' })
  const withState = await createSim({ seed: 1, plugins: [counterPlugin()] })
  const without = await createSim({ seed: 1, plugins: [plain] })
  expect(() => without.restore(withState.snapshot())).toThrow(SnapshotMismatchError)
})

test('plugin state round-trips through section 6 and the restored sim continues identically', async () => {
  const make = () => createSim({ seed: 3, plugins: [counterPlugin(), fixturePlugin] })
  const a = await make()
  for (let t = 0; t < 5; t++) a.step([])
  const bytes = a.snapshot()
  const b = await make()
  b.restore(bytes)
  expect(b.snapshot()).toEqual(bytes)
  a.step([])
  b.step([])
  expect(b.hash()).toBe(a.hash())
})

test('a failing prepareRestore leaves the whole sim unchanged and commits no other plugin', async () => {
  let failing = false
  const fragile = definePlugin({
    name: 'fragile',
    state: async () => ({
      snapshot: () => Uint8Array.of(7),
      prepareRestore: () => {
        if (failing) throw new SnapshotFormatError('fragile: refused')
        return { commit: () => {}, discard: () => {} }
      },
      dispose: () => {},
    }),
  })
  // "counter" sorts before "fragile", so its prepareRestore runs first and must not be committed.
  const make = () => createSim({ seed: 9, plugins: [counterPlugin(), fragile, fixturePlugin] })
  const source = await make()
  source.spawn([[Tag, { name: 'source', hp: 2 }]])
  for (let t = 0; t < 4; t++) source.step([])
  const bytes = source.snapshot()

  const target = await make()
  target.spawn([
    [Body, { x: 3 }],
    [Tag, { name: 'keep', hp: 1 }],
  ])
  target.step([])
  const before = target.snapshot()
  failing = true
  expect(() => target.restore(bytes)).toThrow(SnapshotFormatError)
  expect(target.snapshot()).toEqual(before)
  failing = false
  target.restore(bytes)
  expect(target.snapshot()).toEqual(bytes)
})

test('section 6 framing errors are SnapshotFormatError and leave the sim unchanged', async () => {
  const make = () => createSim({ seed: 3, plugins: [counterPlugin()] })
  const a = await make()
  a.step([])
  const good = a.snapshot()
  const b = await make()
  const before = b.snapshot()
  expect(() => b.restore(good.subarray(0, good.length - 1))).toThrow(SnapshotFormatError)
  const renamed = good.slice()
  renamed[renamed.lastIndexOf(0x72)] = 0x52 // "counter" -> "counteR"
  expect(() => b.restore(renamed)).toThrow(SnapshotFormatError)
  const trailing = new Uint8Array(good.length + 1)
  trailing.set(good)
  expect(() => b.restore(trailing)).toThrow(SnapshotFormatError)
  expect(b.snapshot()).toEqual(before)
})

test('a section 6 on a stateless sim, or an empty one, is a format error', async () => {
  const sim = await createSim({ seed: 2026, plugins: [fixturePlugin] })
  const base = sim.snapshot()
  const withSection = (payload: number[]) => {
    const out = new Uint8Array(base.length + 5 + payload.length)
    out.set(base)
    const view = new DataView(out.buffer)
    view.setUint8(base.length, 6)
    view.setUint32(base.length + 1, payload.length, true)
    out.set(payload, base.length + 5)
    return out
  }
  expect(() => sim.restore(withSection([0, 0]))).toThrow(/empty plugin state section/)
  // One row: name "x", one byte of state.
  expect(() => sim.restore(withSection([1, 0, 1, 0, 0x78, 1, 0, 0, 0, 9]))).toThrow(
    /plugin state rows do not match/,
  )
  expect(sim.snapshot()).toEqual(base)
})

test('a rejected state setup disposes the states already created and rejects createSim', async () => {
  const log: string[] = []
  const broken = definePlugin({
    name: 'zz-broken',
    state: async () => {
      throw new Error('wasm failed to load')
    },
  })
  await expect(createSim({ seed: 1, plugins: [counterPlugin('alpha', log), broken] })).rejects.toThrow(
    'wasm failed to load',
  )
  expect(log).toEqual(['alpha:setup:0.016666666666666666', 'alpha:dispose'])
})
