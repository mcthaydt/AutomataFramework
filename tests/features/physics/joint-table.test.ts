import { expect, test } from 'vitest'
import {
  Body,
  Collider,
  CollisionEnded,
  CollisionStarted,
  Joint,
  Transform,
} from '#src/features/physics/physics.ts'
import { type PhysicsAdapter, PhysicsWorld } from '#src/features/physics/physics-world.ts'
import type { ComponentDef, EntityRef, SimContext } from '#src/features/sim/sim.ts'

// The joint table's order of work and its bytes, proven against a pretend Rapier that writes every call it gets to
// a log, as physics-world.test.ts proves the event contract. The pretend joint's `ax` carries the sid of the entity
// that holds it, so the log can name the joint by its entity.

interface Pretend {
  body?: boolean
  collider?: boolean
  joint?: { a: number; b: number; max: number }
}

function pretend(initial: Record<number, Pretend>, options?: { joints?: boolean }) {
  const things = new Map<number, Pretend>(Object.entries(initial).map(([sid, p]) => [Number(sid), { ...p }]))
  const log: string[] = []
  let nextBody = 100
  let nextJoint = 500
  const bodySid = new Map<number, number>()
  const jointSid = new Map<number, number>()
  const liveBodies = new Set<number>()
  const liveColliders = new Set<number>()
  const parent = new Map<number, number | undefined>()
  const liveJoints = new Map<number, { a: number; b: number }>()
  const ref = (sid: number): EntityRef | undefined => {
    const p = things.get(sid)
    if (!p) return undefined
    return {
      sid,
      has: (c: ComponentDef) =>
        (c === Transform && (p.body === true || p.collider === true)) ||
        (c === Body && p.body === true) ||
        (c === Collider && p.collider === true) ||
        (c === Joint && p.joint !== undefined),
      get: () => ({ kind: 1, ...p.joint, ax: sid, ay: 0, bx: 0, by: 0, limited: false, min: 0 }),
    } as unknown as EntityRef
  }
  const ctx = {
    query: (c: ComponentDef) =>
      [...things.keys()]
        .sort((x, y) => x - y)
        .map((sid) => ref(sid) as EntityRef)
        .filter((e) => e.has(c)),
    entity: ref,
  } as unknown as SimContext
  const adapter = {
    Transform,
    RigidBody: Body,
    Collider,
    Joint,
    started: CollisionStarted,
    ended: CollisionEnded,
    createWorld: () => ({}),
    restoreWorld: () => ({}),
    takeSnapshot: () => Uint8Array.of(9, 9),
    free: () => {},
    close: () => {},
    handles: () => ({
      bodies: [...liveBodies],
      colliders: [...liveColliders],
      joints: [...liveJoints.keys()],
    }),
    validate: () => {},
    validateJoint: () => {},
    createBody: (_: unknown, e: EntityRef) => {
      log.push(`createBody ${e.sid}`)
      const handle = nextBody--
      bodySid.set(handle, e.sid)
      liveBodies.add(handle)
      return handle
    },
    createCollider: (_: unknown, e: EntityRef, body: number | undefined) => {
      log.push(`createCollider ${e.sid}`)
      const handle = nextBody--
      liveColliders.add(handle)
      parent.set(handle, body)
      return handle
    },
    removeBody: (_: unknown, handle: number) => {
      log.push(`removeBody ${bodySid.get(handle)}`)
      liveBodies.delete(handle)
      for (const [collider, owner] of parent) if (owner === handle) liveColliders.delete(collider)
    },
    removeCollider: () => {},
    updateBody: () => {},
    colliderMatches: () => true,
    updateLoneCollider: () => {},
    isSensor: () => false,
    colliderParent: (_: unknown, collider: number) => parent.get(collider),
    createJoint: (_: unknown, spec: { ax: number; a: number; b: number }, bodyA: number, bodyB: number) => {
      log.push(`createJoint ${spec.ax}`)
      const handle = nextJoint--
      jointSid.set(handle, spec.ax)
      liveJoints.set(handle, { a: bodyA, b: bodyB })
      return handle
    },
    removeJoint: (_: unknown, handle: number) => {
      log.push(`removeJoint ${jointSid.get(handle)}`)
      liveJoints.delete(handle)
    },
    jointBodies: (_: unknown, handle: number) => liveJoints.get(handle),
  } as unknown as PhysicsAdapter<object>
  const world = new PhysicsWorld(adapter, options ?? { joints: true })
  const sync = (): string[] => {
    log.length = 0
    world.syncIn(ctx)
    return [...log]
  }
  return { world, things, sync, bodySid }
}

const BOTH: Record<number, Pretend> = {
  1: { body: true, collider: true },
  2: { body: true, collider: true },
}

test('bodies first, then the joint, lowest sid first', () => {
  const { sync } = pretend({
    ...BOTH,
    5: { joint: { a: 1, b: 2, max: 1 } },
    4: { joint: { a: 1, b: 2, max: 1 } },
  })
  expect(sync()).toEqual([
    'createBody 1',
    'createCollider 1',
    'createBody 2',
    'createCollider 2',
    'createJoint 4',
    'createJoint 5',
  ])
})

test('a joint is removed before a body it holds', () => {
  const { sync, things } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  things.set(1, { body: true }) // its row is rebuilt as a body alone
  expect(sync()).toEqual(['removeJoint 4', 'removeBody 1', 'createBody 1', 'createJoint 4'])
})

test('a joint whose thing is gone waits and does not throw', () => {
  const { sync, things } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  things.delete(2)
  expect(sync()).toEqual(['removeJoint 4', 'removeBody 2'])
  expect(sync()).toEqual([])
  things.set(2, { body: true, collider: true })
  expect(sync()).toEqual(['createBody 2', 'createCollider 2', 'createJoint 4'])
})

test('a changed field rebuilds the joint in one sync-in', () => {
  const { sync, things } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  things.set(4, { joint: { a: 1, b: 2, max: 2 } })
  expect(sync()).toEqual(['removeJoint 4', 'createJoint 4'])
})

test('a joint that has not changed is left alone', () => {
  const { sync } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  expect(sync()).toEqual([])
})

test('removing the Joint component removes the joint and nothing else', () => {
  const { sync, things } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  things.set(4, {})
  expect(sync()).toEqual(['removeJoint 4'])
})

test('a joint to a thing that is alive and has no body is an error naming the field', () => {
  const { sync } = pretend({
    1: { body: true, collider: true },
    3: { collider: true },
    4: { joint: { a: 1, b: 3, max: 1 } },
  })
  expect(sync).toThrow(
    'entity 4: physics.joint.b is 3; entity 3 has no physics.body, so nothing can be joined to it',
  )
})

test('a world without joints writes version 2, exactly as before', () => {
  const { world, sync } = pretend({ 1: { body: true } }, { joints: false })
  sync()
  const f64 = (n: number) => [...new Uint8Array(new Float64Array([n]).buffer)]
  expect([...world.snapshot()]).toEqual([
    ...[2, 1, 0, 0, 0], // version, one row
    ...[1, 0, 0, 0, 1], // sid 1, a body and no collider
    ...f64(100),
    ...[0, 0, 0, 0], // no contacts
    ...[2, 0, 0, 0, 9, 9], // the world's two bytes
  ])
})

test('a world with joints writes version 3 and reads it back to the same bytes', () => {
  const { world, sync } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  const bytes = world.snapshot()
  expect(bytes[0]).toBe(3)
  const prepared = world.prepareRestore(bytes)
  prepared.commit()
  expect([...world.snapshot()]).toEqual([...bytes])
})

// Where the first joint's row starts in the bytes of two body-and-collider rows: version 1, count 4, two rows of
// 4 + 1 + 8 + 8, the contact count 4, the joint count 4. Inside a row: bodyA is at +12.
const FIRST_JOINT = 1 + 4 + 2 * 21 + 4 + 4

test('bytes that pair a joint with the wrong bodies are refused', () => {
  const { world, sync } = pretend({ ...BOTH, 4: { joint: { a: 1, b: 2, max: 1 } } })
  sync()
  const bytes = world.snapshot()
  const view = new DataView(bytes.buffer)
  view.setFloat64(FIRST_JOINT + 12, view.getFloat64(FIRST_JOINT + 20, true), true) // bodyA := bodyB
  expect(() => world.prepareRestore(bytes)).toThrow(
    'physics: joint 4: is not attached to the bodies of 1 and 2',
  )
})

test('joints out of sid order, a cut-off table and another version are refused', () => {
  const two = pretend({
    ...BOTH,
    4: { joint: { a: 1, b: 2, max: 1 } },
    5: { joint: { a: 1, b: 2, max: 1 } },
  })
  two.sync()
  const bytes = two.world.snapshot()
  const view = new DataView(bytes.buffer)
  view.setUint32(FIRST_JOINT, 6, true) // 6 then 5
  expect(() => two.world.prepareRestore(bytes)).toThrow(
    'physics: joints must be in strictly ascending sid order',
  )
  expect(() => two.world.prepareRestore(two.world.snapshot().subarray(0, FIRST_JOINT + 30))).toThrow(
    /physics: truncated at byte \d+/,
  )
  const plain = pretend(BOTH, { joints: false })
  plain.sync()
  expect(() => two.world.prepareRestore(plain.world.snapshot())).toThrow('physics: unsupported version 2')
  expect(() => plain.world.prepareRestore(two.world.snapshot())).toThrow('physics: unsupported version 3')
})
