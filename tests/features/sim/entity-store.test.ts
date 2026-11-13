// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/entity-store.test.ts
import { afterEach, expect, test } from 'vitest'
import { defineComponent } from '#src/features/sim/definitions.ts'
import { EntityStore } from '#src/features/sim/entity-store.ts'

const Position = defineComponent('position', { x: 'f32', y: 'f32' })
const Health = defineComponent('health', { hp: 'i32' })
const Velocity = defineComponent('velocity', { x: 'f32', y: 'f32' }, { render: false })
const Unregistered = defineComponent('ghost', { x: 'f32' })

const stores: EntityStore[] = []
const make = () => {
  const s = new EntityStore([Position, Health, Velocity])
  stores.push(s)
  return s
}
afterEach(() => {
  for (const s of stores.splice(0)) s.dispose()
})

test('spawn returns monotonic StableIds starting at 1; values are coerced; defaults fill the rest', () => {
  const s = make()
  const a = s.spawn([[Position, { x: 0.1 }]])
  const b = s.spawn([Health])
  expect([a, b]).toEqual([1, 2])
  expect(s.ref(a)?.get(Position)).toEqual({ x: Math.fround(0.1), y: 0 })
  expect(s.ref(b)?.get(Health)).toEqual({ hp: 0 })
})

test('query returns live entities with all listed components, in ascending StableId order', () => {
  const s = make()
  const a = s.spawn([Position, Health])
  s.spawn([Position])
  const c = s.spawn([Position, Health])
  expect(s.query([Position, Health]).map((e) => e.sid)).toEqual([a, c])
  s.despawn(a)
  expect(s.query([Position, Health]).map((e) => e.sid)).toEqual([c])
  expect(s.liveSids()).toEqual([2, 3])
})

test('StableIds are never reused, even though Koota recycles its own ids', () => {
  const s = make()
  const a = s.spawn([Position])
  s.despawn(a)
  expect(s.spawn([Position])).toBe(2)
})

test('set merges, coerces and validates; unknown fields and wrong types throw', () => {
  const s = make()
  const e = s.ref(s.spawn([Position])) as NonNullable<ReturnType<EntityStore['ref']>>
  // A partial set leaves the other fields alone. The store passes Koota only the given keys, so this pins
  // Koota's behaviour for that (undocumented) case across upgrades.
  e.set(Position, { x: 1.5 })
  e.set(Position, { y: 2.5 })
  expect(e.get(Position)).toEqual({ x: 1.5, y: 2.5 })
  expect(() => e.set(Position, { z: 1 } as never)).toThrow(/unknown field "z"/)
  expect(() => e.set(Health, { hp: 1 })).toThrow(/does not have "health"/)
  expect(() => e.set(Position, { x: Number.NaN })).toThrow(RangeError)
})

test('add and remove components; has() reflects them; adding twice throws', () => {
  const s = make()
  const e = s.ref(s.spawn([Position])) as NonNullable<ReturnType<EntityStore['ref']>>
  e.add(Health, { hp: 3 })
  expect(e.has(Health)).toBe(true)
  expect(() => e.add(Health)).toThrow(/already has "health"/)
  e.remove(Health)
  expect(e.has(Health)).toBe(false)
})

test('components must be registered by a plugin', () => {
  const s = make()
  expect(() => s.spawn([Unregistered])).toThrow(/unknown component "ghost"/)
})

test('a despawned entity ref throws on use', () => {
  const s = make()
  const sid = s.spawn([Position])
  const e = s.ref(sid) as NonNullable<ReturnType<EntityStore['ref']>>
  s.despawn(sid)
  expect(s.ref(sid)).toBeUndefined()
  expect(() => e.get(Position)).toThrow(/not alive/)
})

test('render delta: added rows carry only render-flagged components; delta clears after take', () => {
  const s = make()
  s.spawn([[Position, { x: 1 }], Velocity])
  s.spawn([Velocity]) // no render-flagged component: not a render row
  const d = s.takeDelta(false)
  expect(d).toEqual({
    resync: false,
    added: [{ sid: 1, components: { position: { x: 1, y: 0 } } }],
    changed: [],
    removed: [],
  })
  expect(s.takeDelta(false)).toEqual({ resync: false, added: [], changed: [], removed: [] })
})

test('render delta: changed rows carry the full render state, so removals show as absence', () => {
  const s = make()
  const sid = s.spawn([Position, Health, Velocity])
  s.takeDelta(false)
  const e = s.ref(sid) as NonNullable<ReturnType<EntityStore['ref']>>
  e.set(Velocity, { x: 5 }) // not render-flagged: no row
  expect(s.takeDelta(false).changed).toEqual([])
  e.set(Health, { hp: 9 })
  e.remove(Position)
  expect(s.takeDelta(false).changed).toEqual([{ sid, components: { health: { hp: 9 } } }])
})

test('render delta: spawn+despawn in one tick is invisible; removed lists only pre-existing render entities', () => {
  const s = make()
  const old = s.spawn([Position])
  s.takeDelta(false)
  s.despawn(s.spawn([Position]))
  s.despawn(old)
  expect(s.takeDelta(false)).toEqual({ resync: false, added: [], changed: [], removed: [old] })
})

test('resync delta lists every live render entity as added, sorted', () => {
  const s = make()
  s.spawn([Position])
  s.spawn([Velocity])
  s.spawn([Health])
  s.takeDelta(false)
  const d = s.takeDelta(true)
  expect(d.resync).toBe(true)
  expect(d.added.map((r) => r.sid)).toEqual([1, 3])
})

test('get() returns a frozen copy: mutating it throws instead of silently doing nothing (use set)', () => {
  const s = make()
  const e = s.ref(s.spawn([Position])) as NonNullable<ReturnType<EntityStore['ref']>>
  const p = e.get(Position) as { x: number }
  expect(() => {
    p.x = 5
  }).toThrow(TypeError)
  expect(e.get(Position).x).toBe(0)
})

test('losing the last render component emits removed', () => {
  const s = make()
  const sid = s.spawn([Position, Velocity])
  s.takeDelta(false)
  const e = s.ref(sid) as NonNullable<ReturnType<EntityStore['ref']>>
  e.remove(Position)
  expect(s.takeDelta(false)).toEqual({ resync: false, added: [], changed: [], removed: [sid] })
})

test('gaining the first render component emits added', () => {
  const s = make()
  const sid = s.spawn([Velocity])
  s.takeDelta(false)
  const e = s.ref(sid) as NonNullable<ReturnType<EntityStore['ref']>>
  e.add(Position, { x: 1 })
  const d = s.takeDelta(false)
  expect(d.added).toEqual([{ sid, components: { position: { x: 1, y: 0 } } }])
  expect(d.changed).toEqual([])
})

test('remove-then-despawn in one tick emits removed', () => {
  const s = make()
  const sid = s.spawn([Position])
  s.takeDelta(false)
  const e = s.ref(sid) as NonNullable<ReturnType<EntityStore['ref']>>
  e.remove(Position)
  s.despawn(sid)
  expect(s.takeDelta(false).removed).toEqual([sid])
})
