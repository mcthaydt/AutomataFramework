// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/snapshot.test.ts
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import { createSim, type Sim } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineResource } from '#src/features/sim/definitions.ts'
import {
  decodeSnapshot,
  encodeSnapshot,
  type SnapshotData,
  SnapshotFormatError,
  SnapshotMismatchError,
} from '#src/features/sim/snapshot.ts'
import { Body, fixturePlugin, Hidden, Stats, Tag } from '../../fixtures/fixture-world.ts'

const sims: Sim[] = []
async function make(opts: Partial<Parameters<typeof createSim>[0]> = {}) {
  const sim = await createSim({ seed: 9, plugins: [fixturePlugin], content: { level: 'a' }, ...opts })
  sims.push(sim)
  return sim
}
afterEach(() => {
  for (const s of sims.splice(0)) s.dispose()
})

const push = (tick: number, sid: number) => [
  { tick, source: 0, seq: 1, type: 'push', payload: { sid, dx: 0.25 } },
]

async function seeded() {
  const sim = await make()
  for (let i = 0; i < 6; i++)
    sim.spawn([
      [Body, { x: i }],
      [Tag, { name: `n${i}`, team: i }],
    ])
  return sim
}

test('snapshot -> restore into a fresh sim -> continue is identical to an uninterrupted run', async () => {
  const straight = await seeded()
  for (let t = 0; t < 120; t++) straight.step(t % 7 === 0 ? push(t, 1 + (t % 5)) : [])

  const first = await seeded()
  for (let t = 0; t < 60; t++) first.step(t % 7 === 0 ? push(t, 1 + (t % 5)) : [])
  const bytes = first.snapshot()
  const resumed = await make()
  resumed.restore(bytes)
  expect(resumed.tick).toBe(60)
  for (let t = 60; t < 120; t++) resumed.step(t % 7 === 0 ? push(t, 1 + (t % 5)) : [])

  expect(resumed.hash()).toBe(straight.hash())
  expect(resumed.resource(Stats)).toEqual(straight.resource(Stats))
  expect(resumed.query(Tag).length).toBeGreaterThan(6)
})

test('snapshot bytes are canonical: restore then snapshot reproduces them exactly', async () => {
  const sim = await seeded()
  for (let t = 0; t < 30; t++) sim.step([])
  const bytes = sim.snapshot()
  const other = await make()
  other.restore(bytes)
  expect(other.snapshot()).toEqual(bytes)
  expect(other.hash()).toBe(sim.hash())
})

test('hash is 16 hex digits and changes when state changes', async () => {
  const sim = await seeded()
  const h0 = sim.hash()
  expect(h0).toMatch(/^[0-9a-f]{16}$/)
  sim.step([])
  expect(sim.hash()).not.toBe(h0)
})

test('the first step after restore is a full render resync', async () => {
  const sim = await seeded()
  sim.step([])
  sim.step([])
  const other = await make()
  other.restore(sim.snapshot())
  const r = other.step([])
  expect(r.render.resync).toBe(true)
  expect(r.render.added.length).toBe(other.query(Body).length)
})

test('restore refuses a different schema, content or tickHz, naming the field', async () => {
  const bytes = (await seeded()).snapshot()
  const otherSchema = await make({ plugins: [fixturePlugin, definePlugin({ name: 'extra' })] })
  expect(() => otherSchema.restore(bytes)).toThrow(SnapshotMismatchError)
  expect(() => otherSchema.restore(bytes)).toThrow(/schemaHash/)
  const otherContent = await make({ content: { level: 'b' } })
  expect(() => otherContent.restore(bytes)).toThrow(/contentHash/)
  const otherHz = await make({ tickHz: 30 })
  expect(() => otherHz.restore(bytes)).toThrow(/tickHz/)
})

test('restore rejects garbage and truncated input with SnapshotFormatError, leaving the sim usable', async () => {
  const sim = await seeded()
  const bytes = sim.snapshot()
  const before = sim.hash()
  expect(() => sim.restore(new Uint8Array([1, 2, 3]))).toThrow(SnapshotFormatError)
  expect(() => sim.restore(bytes.slice(0, bytes.length - 5))).toThrow(SnapshotFormatError)
  const wrongVersion = bytes.slice()
  wrongVersion[4] = 99
  expect(() => sim.restore(wrongVersion)).toThrow(/version/)
  expect(sim.hash()).toBe(before)
  sim.step([])
})

test('restore reports malformed UTF-8 in the string table as SnapshotFormatError, leaving the sim usable', async () => {
  const sim = await make()
  sim.spawn([[Tag, { name: 'wxyz', team: 1 }]])
  const bytes = sim.snapshot()
  const before = sim.hash()
  // Locate the string-table entry for 'wxyz' (u32 length 4, then the bytes) and overwrite it with F4 90 80 80,
  // which is U+110000: well-formed length, invalid code point.
  const needle = [4, 0, 0, 0, ...'wxyz'].map((c) => (typeof c === 'string' ? c.charCodeAt(0) : c))
  const at = bytes.findIndex((_, i) => needle.every((b, j) => bytes[i + j] === b))
  expect(at).toBeGreaterThan(0)
  const bad = bytes.slice()
  bad.set([0xf4, 0x90, 0x80, 0x80], at + 4)
  expect(() => sim.restore(bad)).toThrow(SnapshotFormatError)
  expect(sim.hash()).toBe(before)
  sim.step([])
})

test('snapshot fails loudly, naming the resource, when a system left a resource outside its schema', async () => {
  const sim = await seeded()
  ;(sim.resource(Stats) as { spawned: unknown }).spawned = 'not a number'
  expect(() => sim.snapshot()).toThrow(/resource "stats"/)
})

test('an empty sim (no entities, no resources) round-trips', async () => {
  const empty = await make({ plugins: [definePlugin({ name: 'empty' })] })
  const other = await make({ plugins: [definePlugin({ name: 'empty' })] })
  other.restore(empty.snapshot())
  expect(other.hash()).toBe(empty.hash())
  expect(other.step([]).render).toEqual({ resync: true, added: [], changed: [], removed: [] })
})

test('snapshot rejects a resource that does not round-trip through JSON, naming it', async () => {
  const MapRes = defineResource('mapres', z.object({ m: z.map(z.string(), z.number()) }), () => ({
    m: new Map<string, number>(),
  }))
  const sim = await make({ plugins: [definePlugin({ name: 'maps', resources: [MapRes] })] })
  sim.resource(MapRes).m.set('a', 1)
  expect(() => sim.snapshot()).toThrow(/resource "mapres"/)
})

test('snapshot rejects a resource with keys outside its schema, naming it', async () => {
  const Plain = defineResource('plain', z.object({ n: z.number() }), () => ({ n: 1 }))
  const plugins = [definePlugin({ name: 'plain', resources: [Plain] })]
  const sim = await make({ plugins })
  ;(sim.resource(Plain) as Record<string, unknown>).extra = 'not in the schema'
  expect(() => sim.snapshot()).toThrow(/resource "plain"/)
})

describe('restore rejects structurally corrupt snapshots atomically', () => {
  type Mutate = (d: SnapshotData) => SnapshotData
  const withSids = (d: SnapshotData, sids: number[]): SnapshotData => ({
    ...d,
    entities: sids.map((sid) => ({
      sid,
      components: (d.entities[0] as SnapshotData['entities'][number]).components,
    })),
  })
  const cases: Array<[string, Mutate]> = [
    ['duplicate sid', (d) => withSids(d, [1, 2, 2, 3])],
    ['descending sids', (d) => withSids(d, [3, 2, 1])],
    ['sid 0', (d) => withSids(d, [0, 1, 2])],
    ['nextId equal to the largest sid', (d) => ({ ...withSids(d, [1, 2, 9]), nextId: 9 })],
    ['nextId 0', (d) => ({ ...d, nextId: 0 })],
    ['a missing resource row', (d) => ({ ...d, resources: [] })],
    ['a duplicate resource row', (d) => ({ ...d, resources: [...d.resources, ...d.resources] })],
    ['an unknown resource row', (d) => ({ ...d, resources: [...d.resources, { id: 'zzz', json: '{}' }] })],
  ]
  for (const [name, mutate] of cases) {
    test(name, async () => {
      const sim = await seeded()
      sim.step([])
      const defs = [Body, Tag, Hidden]
      const bad = encodeSnapshot(mutate(decodeSnapshot(sim.snapshot(), defs)), defs)
      const target = await seeded()
      const before = target.hash()
      expect(() => target.restore(bad)).toThrow(SnapshotFormatError)
      expect(target.hash()).toBe(before)
      target.step([])
    })
  }
})

test('two sims given the same content in another key order share the hash and restore each other (M2.2)', async () => {
  const a = await make({ content: { tuning: { g: 1, h: 2 }, level: 'a' } })
  const b = await make({ content: { level: 'a', tuning: { h: 2, g: 1 } } })
  expect(a.contentHash).toMatch(/^[0-9a-f]{16}$/)
  expect(b.contentHash).toBe(a.contentHash)
  a.step([])
  b.restore(a.snapshot())
  expect(b.hash()).toBe(a.hash())
  a.restore(b.snapshot())
})
