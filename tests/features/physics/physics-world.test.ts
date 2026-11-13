// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/shared/physics-world.test.ts

import { expect, test } from 'vitest'
import { Body, Collider, CollisionEnded, CollisionStarted, Transform } from '#src/features/physics/physics.ts'
import { type PhysicsAdapter, PhysicsWorld } from '#src/features/physics/physics-world.ts'
import type { EntityRef, EventDef, SimContext } from '#src/features/sim/sim.ts'

// The event contract (spec §3.4) on its own, with a fake Rapier that reports pairs in whatever order the
// test chooses, so the sort and `a < b` are proven independent of Rapier's internal pair order.
function fakeWorld(...steps: Array<Array<[number, number, boolean]>>) {
  let next = 100
  let stepIndex = 0
  const adapter = {
    Transform: Transform,
    RigidBody: Body,
    Collider: Collider,
    started: CollisionStarted,
    ended: CollisionEnded,
    createWorld: () => ({}),
    validate: () => {},
    createCollider: () => next--, // handles count down while sids count up
    step: (_: unknown, on: (a: number, b: number, s: boolean) => void) => {
      for (const [a, b, s] of steps[stepIndex++] ?? []) on(a, b, s)
    },
    updateLoneCollider: () => {},
    colliderMatches: () => true,
    isSensor: () => false,
  } as unknown as PhysicsAdapter<object>
  const entities = [1, 2, 3].map(
    (sid) => ({ sid, has: (c: unknown) => c === Transform || c === Collider }) as unknown as EntityRef,
  )
  const emitted: Array<{ type: string; payload: unknown }> = []
  const ctx = {
    query: () => entities,
    entity: (sid: number) => entities[sid - 1],
    emit: (def: EventDef, payload: unknown) => emitted.push({ type: def.id, payload }),
  } as unknown as SimContext
  return { world: new PhysicsWorld(adapter), ctx, emitted }
}

test('events are sorted ended-first, then by sid, with a < b, whatever order Rapier reports them in', () => {
  // sid 1 -> handle 100, sid 2 -> 99, sid 3 -> 98.
  const { world, ctx, emitted } = fakeWorld(
    [[98, 100, true]],
    [
      [99, 100, true],
      [98, 99, true],
      [98, 100, false],
    ],
  )
  for (let t = 0; t < 2; t++) {
    world.syncIn(ctx)
    world.step()
    world.emitEvents(ctx)
  }
  expect(emitted).toEqual([
    { type: 'physics.collision-started', payload: { a: 1, b: 3, sensor: false } },
    { type: 'physics.collision-ended', payload: { a: 1, b: 3, sensor: false } },
    { type: 'physics.collision-started', payload: { a: 1, b: 2, sensor: false } },
    { type: 'physics.collision-started', payload: { a: 2, b: 3, sensor: false } },
  ])
})

test('an event naming a collider that has no owner is dropped', () => {
  const { world, ctx, emitted } = fakeWorld([[7, 100, true]])
  world.syncIn(ctx)
  world.step()
  world.emitEvents(ctx)
  expect(emitted).toEqual([])
})

/** A fake engine that records which worlds are freed, for the lifecycle rules (spec §3.1, §10.6). */
function lifecycleWorld() {
  const freed: string[] = []
  let closed = 0
  let made = 0
  const adapter = {
    createWorld: () => ({ id: `world-${made++}` }),
    restoreWorld: () => ({ id: `world-${made++}` }),
    takeSnapshot: () => new Uint8Array(),
    handles: () => ({ bodies: [], colliders: [] }),
    free: (world: { id: string }) => freed.push(world.id),
    close: () => {
      closed += 1
    },
  } as unknown as PhysicsAdapter<object>
  return { world: new PhysicsWorld(adapter), freed, closed: () => closed }
}

test('dispose frees the world and closes the adapter once, however often it is called', () => {
  const { world, freed, closed } = lifecycleWorld()
  world.dispose()
  world.dispose()
  expect(freed).toEqual(['world-0'])
  expect(closed()).toBe(1)
})

test('a discarded restore frees the world it prepared and keeps the live one', () => {
  const { world, freed } = lifecycleWorld()
  world.prepareRestore(world.snapshot()).discard()
  expect(freed).toEqual(['world-1'])
  world.dispose()
  expect(freed).toEqual(['world-1', 'world-0'])
})

test('a committed restore frees the world it replaces', () => {
  const { world, freed } = lifecycleWorld()
  world.prepareRestore(world.snapshot()).commit()
  expect(freed).toEqual(['world-0'])
  world.dispose()
  expect(freed).toEqual(['world-0', 'world-1'])
})

test('Rapier reporting a started for a pair already touching emits nothing more', () => {
  const { world, ctx, emitted } = fakeWorld([[98, 100, true]], [[98, 100, true]])
  for (let t = 0; t < 2; t++) {
    world.syncIn(ctx)
    world.step()
    world.emitEvents(ctx)
  }
  expect(emitted).toEqual([{ type: 'physics.collision-started', payload: { a: 1, b: 3, sensor: false } }])
})

test('a lone collider row whose collider the world attaches to a body is refused', () => {
  // version 2 | one row: sid 1, collider only, handle 5 | no contacts | empty world bytes
  const bytes = new Uint8Array(1 + 4 + 5 + 8 + 4 + 4)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, 2)
  view.setUint32(1, 1, true)
  view.setUint32(5, 1, true)
  view.setUint8(9, 2)
  view.setFloat64(10, 5, true)
  const adapter = {
    createWorld: () => ({}),
    restoreWorld: () => ({}),
    handles: () => ({ bodies: [], colliders: [5] }),
    colliderParent: () => 9,
    free: () => {},
  } as unknown as PhysicsAdapter<object>
  expect(() => new PhysicsWorld(adapter).prepareRestore(bytes)).toThrow(/row 1: lone collider is attached/)
})

test('Rapier returning no world for the bytes is a SnapshotFormatError that says so', () => {
  const { world: live } = lifecycleWorld()
  const adapter = {
    createWorld: () => ({}),
    restoreWorld: () => null, // what Rapier's restoreSnapshot gives for bytes it cannot decode
  } as unknown as PhysicsAdapter<object>
  const world = new PhysicsWorld(adapter)
  expect(() => world.prepareRestore(live.snapshot())).toThrow(
    expect.objectContaining({ name: 'SnapshotFormatError', message: expect.stringMatching(/no world/) }),
  )
})

test('dispose closes the adapter even when freeing the world throws', () => {
  let closed = 0
  const adapter = {
    createWorld: () => ({}),
    free: () => {
      throw new Error('wasm trap on free')
    },
    close: () => {
      closed += 1
    },
  } as unknown as PhysicsAdapter<object>
  const world = new PhysicsWorld(adapter)
  expect(() => world.dispose()).toThrow('wasm trap on free')
  expect(closed).toBe(1)
  world.dispose() // already disposed: nothing runs again
  expect(closed).toBe(1)
})
