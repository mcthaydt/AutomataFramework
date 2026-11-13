// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/describe.test.ts
import { afterEach, expect, test } from 'vitest'
import { createSim, type Sim, SimDisposedError, SimFaultedError } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineSystem, type PluginState } from '#src/features/sim/definitions.ts'
import { SNAPSHOT_VERSION, SnapshotFormatError, SnapshotMismatchError } from '#src/features/sim/snapshot.ts'
import { canonicalJson, utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { Body, fixturePlugin, Hidden, Stats, Tag } from '../../fixtures/fixture-world.ts'

const sims: Sim[] = []
async function make(plugins = [fixturePlugin], content: unknown = { level: 'a' }) {
  const sim = await createSim({ seed: 3, plugins, content })
  sims.push(sim)
  return sim
}
afterEach(() => {
  for (const s of sims.splice(0)) s.dispose()
})

/** Engine state of three fixed bytes, so section 6 is present and its hash is known. */
const opaque = definePlugin({
  name: 'opaque',
  state: async () => {
    let bytes = Uint8Array.of(1, 2, 3)
    const state: PluginState = {
      snapshot: () => bytes.slice(),
      prepareRestore: (next) => ({
        commit: () => {
          bytes = next.slice()
        },
        discard: () => {},
      }),
      dispose: () => {},
    }
    return state
  },
})

async function described() {
  const sim = await make([fixturePlugin, opaque])
  sim.spawn([[Body, { x: 1, vx: 2 }]])
  sim.spawn([
    [Tag, { name: 'ant', team: 2 }],
    [Hidden, { secret: 0.5 }],
  ])
  for (let t = 0; t < 3; t++) sim.step([])
  return sim
}

test('the view of the current state: header, rng, resources, entities and plugin bytes', async () => {
  const sim = await described()
  const view = sim.describeSnapshot()
  expect(view.header).toEqual({
    formatVersion: SNAPSHOT_VERSION,
    schemaHash: expect.stringMatching(/^[0-9a-f]{16}$/),
    contentHash: expect.stringMatching(/^[0-9a-f]{16}$/),
    tick: 3,
    tickHz: 60,
  })
  // One stream per system, including the built-ins, four state words each.
  expect(Object.keys(view.rng).sort()).toEqual(
    ['churn', 'commands.apply', 'entities.flush', 'move', 'push', 'render.collect'].sort(),
  )
  for (const words of Object.values(view.rng)) expect(words).toHaveLength(4)
  expect(view.resources).toEqual({ stats: sim.resource(Stats) })
  expect(view.nextId).toBeGreaterThan(2)
  // Ascending sid; the first entity has only Body, so Tag and Hidden are absent rather than defaulted.
  const sids = view.entities.map((e) => e.sid)
  expect(sids).toEqual([...sids].sort((a, b) => a - b))
  expect(Object.keys(view.entities[0]?.components ?? {})).toEqual(['body'])
  expect(view.entities[0]?.components.body).toEqual({ vx: 2, vy: 0, x: expect.any(Number), y: 0 })
  expect(view.entities[1]?.components).toEqual({
    hidden: { secret: 0.5 },
    tag: { alive: false, hp: 0, name: 'ant', target: 0, team: 2 },
  })
  expect(view.plugins).toEqual({
    opaque: { byteLength: 3, hash: hex64(xxhash64(Uint8Array.of(1, 2, 3))) },
  })
})

test('describing bytes equals describing the state they restore to, and changes nothing', async () => {
  const sim = await described()
  const bytes = sim.snapshot()
  const before = sim.hash()
  const view = sim.describeSnapshot(bytes)
  expect(sim.hash()).toBe(before)
  expect(sim.describeSnapshot()).toEqual(view)

  const other = await make([fixturePlugin, opaque])
  other.restore(bytes)
  expect(other.describeSnapshot()).toEqual(view)
})

test('bad bytes throw what restore throws', async () => {
  const sim = await described()
  const bytes = sim.snapshot()
  expect(() => sim.describeSnapshot(bytes.subarray(0, 20))).toThrow(SnapshotFormatError)

  const otherSchema = await make([fixturePlugin])
  expect(() => otherSchema.describeSnapshot(bytes)).toThrow(SnapshotMismatchError)
  const otherContent = await make([fixturePlugin, opaque], { level: 'b' })
  let caught: unknown
  try {
    otherContent.describeSnapshot(bytes)
  } catch (err) {
    caught = err
  }
  expect(caught).toBeInstanceOf(SnapshotMismatchError)
  expect((caught as SnapshotMismatchError).field).toBe('contentHash')
})

test('resource bytes that are not JSON throw SnapshotFormatError, as restore does', async () => {
  const sim = await described()
  const bytes = sim.snapshot()
  const json = utf8(canonicalJson(sim.resource(Stats)))
  const at = bytes.findIndex((_, i) => json.every((b, j) => bytes[i + j] === b))
  expect(at).toBeGreaterThan(0)
  const broken = bytes.slice()
  broken[at] = 0x5b // "{" becomes "[": no longer JSON
  expect(() => sim.restore(broken)).toThrow(SnapshotFormatError)
  expect(() => sim.describeSnapshot(broken)).toThrow(SnapshotFormatError)
})

test('without bytes, a faulted sim throws SimFaultedError and a disposed one SimDisposedError', async () => {
  const boom = definePlugin({
    name: 'boom',
    systems: [
      defineSystem({
        name: 'boom',
        phase: 'gameplay',
        run: () => {
          throw new Error('kaboom')
        },
      }),
    ],
  })
  const faulted = await make([fixturePlugin, boom])
  expect(() => faulted.step([])).toThrow(SimFaultedError)
  expect(() => faulted.describeSnapshot()).toThrow(SimFaultedError)

  const disposed = await createSim({ seed: 1, plugins: [fixturePlugin] })
  disposed.dispose()
  expect(() => disposed.describeSnapshot()).toThrow(SimDisposedError)
})
