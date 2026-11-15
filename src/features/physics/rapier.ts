// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/rapier-2d.ts
// The Rapier adapter: the only file that calls Rapier. Loaded with a dynamic import from physics.ts, so the wasm loads
// inside createSim and never at import time.

import RAPIER from '@dimforge/rapier2d-deterministic'
import type { EntityRef } from '../sim/sim.ts'
import { checkBody, checkCollider, checkJoint } from './checks.ts'
import { Body, Collider, Joint, Transform } from './components.ts'
import { CollisionEnded, CollisionStarted } from './events.ts'
import { BodyKind, JointKind, ShapeKind } from './kinds.ts'
import type { PhysicsAdapter } from './physics-world.ts'
import { loadRapier } from './rapier-wasm.ts'
import { CORNER, type FeltContact } from './touching.ts'

type World = RAPIER.World

// One init per module: the wasm is compiled once per page or process however many sims use it.
let ready: Promise<void> | undefined

// Kinematic bodies get contacts with fixed and kinematic colliders; fixed against fixed never.
const COLLISION_TYPES =
  RAPIER.ActiveCollisionTypes.DEFAULT |
  RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED |
  RAPIER.ActiveCollisionTypes.KINEMATIC_KINEMATIC

/** How fast, in tiles a second, a body must be moving up for a ledge to let it through. A resting body's solver jitter is far under it. */
const LEDGE_RISE = 0.5

/** How far above a ledge's top the lowest point of something may be, in metres, and still stand on it. */
const LEDGE_SLOP = 0.05

/** How far, in tiles, a slope's high corner is let down below its box's top. */
const SLOPE_SINK = 0.005
/** How far, in tiles, a slope's line is carried on past its foot, under the ground. */
const SLOPE_SKIRT = 0.1

/**
 * The three corners of a slope's triangle about its box's centre: its high corner, and its two bottom ones. A triangle
 * that stopped exactly at the box would have a corner on the floor at its foot and one on the plateau's edge at its top,
 * and a body sliding along either surface would meet a corner with nothing to tell the contact which way to push (Rapier
 * takes a corner on a face as a wall and the body stops dead). So the line goes on past its foot, under the ground, and
 * the high corner is a hair under the surface it meets, which is a step too small to feel and one the contact can read.
 */
function slopeCorners(hx: number, hy: number, rises: 1 | -1): [number, number][] {
  const apex = -hy + SLOPE_SINK
  // How far the line falls over the skirt's run.
  const drop = (SLOPE_SKIRT * (hy - apex)) / (2 * hx)
  const side = rises === 1 ? 1 : -1
  return [
    [-side * (hx + SLOPE_SKIRT), hy + drop],
    [side * hx, hy + drop],
    [side * hx, apex],
  ]
}

function colliderDesc(entity: EntityRef): RAPIER.ColliderDesc {
  const c = entity.get(Collider)
  let desc: RAPIER.ColliderDesc | null
  if (c.shape === ShapeKind.ball) desc = RAPIER.ColliderDesc.ball(c.hx)
  else if (c.shape === ShapeKind.cuboid || c.shape === ShapeKind.ledge)
    desc = RAPIER.ColliderDesc.cuboid(c.hx, c.hy)
  else if (c.shape === ShapeKind.capsule) desc = RAPIER.ColliderDesc.capsule(c.hy, c.hx)
  else {
    desc = RAPIER.ColliderDesc.convexHull(
      new Float32Array(slopeCorners(c.hx, c.hy, c.shape === ShapeKind.slopeUp ? 1 : -1).flat()),
    )
    // Never a silent box: a triangle Rapier cannot make a shape of is the author's to see.
    if (desc === null)
      throw new Error(
        `entity ${entity.sid}: physics.collider is a slope ${c.hx * 2} by ${c.hy * 2} that Rapier cannot shape`,
      )
  }
  // A ledge is told about every contact it makes, so `holds` can say whether it holds what touches it.
  if (c.shape === ShapeKind.ledge) desc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS)
  return desc
    .setSensor(c.sensor)
    .setCollisionGroups(c.groups)
    .setFriction(c.friction)
    .setRestitution(c.restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    .setActiveCollisionTypes(COLLISION_TYPES)
}

/** True when the collider carries the flag that makes Rapier ask about each of its contacts: a ledge. */
const isLedge = (collider: RAPIER.Collider): boolean =>
  (collider.activeHooks() & RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS) !== 0

/** How far a collider reaches below its centre, in metres, upright; undefined for a shape this does not measure. */
function reachBelow(collider: RAPIER.Collider): number | undefined {
  switch (collider.shapeType()) {
    case RAPIER.ShapeType.Ball:
      return collider.radius()
    case RAPIER.ShapeType.Cuboid:
      return (collider.halfExtents() as RAPIER.Vector).y
    case RAPIER.ShapeType.Capsule:
      return collider.halfHeight() + collider.radius()
    default:
      return undefined
  }
}

/**
 * Whether `ledge` holds `other` now: only when `other` is not moving up and its lowest point is at or above the
 * ledge's top (less `LEDGE_SLOP`). A thing rising through it, or standing below it, passes. The lowest point is read
 * upright, so a turned box is judged by its upright one; a hero never turns, and slice 1 accepts that for the rest.
 * Reads the world, so never inside a step: during one Rapier has the world borrowed, and `ledgeFacts` is read before.
 */
function holds(world: World, ledge: RAPIER.Collider, other: RAPIER.Collider): boolean {
  const parent = world.colliders.raw.coParent(other.handle)
  const reach = reachBelow(other)
  // Something this cannot judge (no body, a shape it does not measure) is held as any ground holds it.
  if (parent === undefined || reach === undefined) return true
  if (world.getRigidBody(parent).linvel().y < -LEDGE_RISE) return false
  const top = ledge.translation().y - (ledge.halfExtents() as RAPIER.Vector).y
  return other.translation().y + reach <= top + LEDGE_SLOP
}

/**
 * What the contact hook knows of a step, read before it starts (Rapier has the world borrowed while it runs, so the hook
 * can read nothing from it): each ledge's top, and for everything else that can move, the height of its lowest point,
 * which is infinite for a thing moving up (no ledge holds it) and minus infinite for one this cannot judge (every ledge
 * holds it). Positions are those the step begins with. Empty when the world has no ledge.
 */
interface LedgeFacts {
  readonly tops: Map<number, number>
  readonly lows: Map<number, number>
}

function ledgeFacts(world: World): LedgeFacts {
  const tops = new Map<number, number>()
  const lows = new Map<number, number>()
  world.forEachCollider((collider) => {
    if (isLedge(collider))
      tops.set(collider.handle, collider.translation().y - (collider.halfExtents() as RAPIER.Vector).y)
  })
  if (tops.size === 0) return { tops, lows }
  world.forEachCollider((collider) => {
    if (isLedge(collider)) return
    const parent = world.colliders.raw.coParent(collider.handle)
    if (parent === undefined || world.getRigidBody(parent).isFixed()) return
    const reach = reachBelow(collider)
    if (reach === undefined) lows.set(collider.handle, Number.NEGATIVE_INFINITY)
    else if (world.getRigidBody(parent).linvel().y < -LEDGE_RISE) lows.set(collider.handle, Number.POSITIVE_INFINITY)
    else lows.set(collider.handle, collider.translation().y + reach)
  })
  return { tops, lows }
}

export async function createRapier(setup: {
  gravity: { x: number; y: number }
  dt: number
}): Promise<PhysicsAdapter<World>> {
  // A rejected init is not kept: the next createSim retries it (a wasm fetch can fail transiently).
  ready ??= loadRapier().catch((err: unknown) => {
    ready = undefined
    throw err
  })
  await ready
  const queue = new RAPIER.EventQueue(true)
  // Rapier has no getter for a body's rotation lock, so the adapter remembers what it applied. After a restore it
  // knows nothing about a body and takes the entity's value as the one the snapshot's world holds: asking Rapier to lock
  // again would wake every sleeping body and so change the state hash (the restore parity tests catch that). The one
  // case this misses is `fixedRotation` edited after the last sync-in and before the snapshot; that edit is then lost
  // for the restored sim until it is edited again.
  const rotationLocked = new Map<number, boolean>()
  // What the contact hook knows of the step under way: Rapier hands it two collider handles and nothing else, and has the
  // world borrowed while it runs, so the facts are read before the step. The flag a ledge carries is in the world and its
  // snapshot, so no handle outlives a step and a restored world needs nothing.
  let facts: LedgeFacts = { tops: new Map(), lows: new Map() }
  const hooks: RAPIER.PhysicsHooks = {
    filterContactPair(first, second) {
      const [ledge, other] = facts.tops.has(first) ? [first, second] : [second, first]
      const top = facts.tops.get(ledge)
      const low = facts.lows.get(other)
      // Not a ledge against something that moves: held as any ground holds.
      if (top === undefined || low === undefined) return RAPIER.SolverFlags.COMPUTE_IMPULSE
      return low <= top + LEDGE_SLOP ? RAPIER.SolverFlags.COMPUTE_IMPULSE : RAPIER.SolverFlags.EMPTY
    },
    filterIntersectionPair: () => true,
  }
  const adapter: PhysicsAdapter<World> = {
    Transform,
    RigidBody: Body,
    Collider,
    Joint,
    started: CollisionStarted,
    ended: CollisionEnded,

    createWorld() {
      const world = new RAPIER.World(setup.gravity)
      world.timestep = setup.dt
      return world
    },
    restoreWorld: (bytes) => RAPIER.World.restoreSnapshot(bytes),
    takeSnapshot: (world) => world.takeSnapshot(),
    step(world, onCollision) {
      facts = ledgeFacts(world)
      world.step(queue, hooks)
      queue.drainCollisionEvents(onCollision)
    },
    free(world) {
      world.free()
    },
    close() {
      queue.free()
      rotationLocked.clear()
    },
    handles(world) {
      const joints: number[] = []
      const bodies: number[] = []
      const colliders: number[] = []
      world.bodies.forEach((body) => {
        bodies.push(body.handle)
      })
      world.colliders.forEach((collider) => {
        colliders.push(collider.handle)
      })
      world.impulseJoints.raw.forEachJointHandle((handle: number) => {
        joints.push(handle)
      })
      return { bodies, colliders, joints }
    },

    validateJoint(entity) {
      checkJoint(entity.sid, 'physics.joint', entity.get(Joint))
    },
    // Rapier's first body is `b` and its second `a`, so a pin's limits are a's turn against b: with b the level,
    // simply how far a may turn. A pin lets its two things pass through each other (the hinge sits inside both);
    // a rope leaves their contacts on, so two things tied together still bump.
    createJoint(world, spec, bodyA, bodyB) {
      const first = { x: spec.bx, y: spec.by }
      const second = { x: spec.ax, y: spec.ay }
      const pin = spec.kind === JointKind.pin
      const data = pin
        ? RAPIER.JointData.revolute(first, second)
        : RAPIER.JointData.rope(spec.max, first, second)
      const joint = world.createImpulseJoint(data, world.getRigidBody(bodyB), world.getRigidBody(bodyA), true)
      if (pin) {
        joint.setContactsEnabled(false)
        // JointData's own limit fields are read only for prismatic joints, so a revolute's are set on the made joint.
        if (spec.limited) (joint as RAPIER.RevoluteImpulseJoint).setLimits(spec.min, spec.max)
      }
      return joint.handle
    },
    removeJoint(world, joint) {
      world.removeImpulseJoint(world.getImpulseJoint(joint), true)
    },
    // The raw handles, not `joint.body1().handle`: the wrapper resolves through the body set's map, and the joint
    // table compares exact bits (the lesson of `colliderParent`).
    jointBodies(world, joint) {
      const raw = world.impulseJoints.raw
      return { a: raw.jointBodyHandle2(joint), b: raw.jointBodyHandle1(joint) }
    },

    validate(entity) {
      if (entity.has(Body)) checkBody(entity.sid, 'physics.body', entity.get(Body).kind)
      if (entity.has(Collider)) {
        const c = entity.get(Collider)
        checkCollider(entity.sid, 'physics.collider', c.shape, c.hx, c.hy)
      }
    },

    createBody(world, entity) {
      const t = entity.get(Transform)
      const b = entity.get(Body)
      const desc = new RAPIER.RigidBodyDesc(b.kind as RAPIER.RigidBodyType)
        .setTranslation(t.x, t.y)
        .setRotation(t.rotation)
        .setLinvel(b.vx, b.vy)
        .setAngvel(b.angvel)
        .setLinearDamping(b.linearDamping)
        .setAngularDamping(b.angularDamping)
      if (b.fixedRotation) desc.lockRotations()
      const handle = world.createRigidBody(desc).handle
      rotationLocked.set(handle, b.fixedRotation)
      return handle
    },
    createCollider(world, entity, body) {
      const desc = colliderDesc(entity)
      if (body !== undefined) return world.createCollider(desc, world.getRigidBody(body)).handle
      const t = entity.get(Transform)
      desc.setTranslation(t.x, t.y).setRotation(t.rotation)
      return world.createCollider(desc).handle
    },
    removeBody(world, body) {
      world.removeRigidBody(world.getRigidBody(body))
      rotationLocked.delete(body)
    },
    removeCollider(world, collider) {
      world.removeCollider(world.getCollider(collider), true)
    },

    updateBody(world, handle, entity) {
      const body = world.getRigidBody(handle)
      const t = entity.get(Transform)
      const b = entity.get(Body)
      if (body.bodyType() !== b.kind) {
        checkBody(entity.sid, 'physics.body', b.kind)
        body.setBodyType(b.kind as RAPIER.RigidBodyType, true)
      }
      if (body.linearDamping() !== b.linearDamping) body.setLinearDamping(b.linearDamping)
      if (body.angularDamping() !== b.angularDamping) body.setAngularDamping(b.angularDamping)
      const locked = rotationLocked.get(handle)
      if (locked === undefined) rotationLocked.set(handle, b.fixedRotation)
      else if (locked !== b.fixedRotation) {
        body.lockRotations(b.fixedRotation, true)
        rotationLocked.set(handle, b.fixedRotation)
      }
      const p = body.translation()
      const samePosition = t.x === p.x && t.y === p.y
      const sameRotation = t.rotation === body.rotation()
      // sync-out wrote Rapier's own values, so a difference means game code moved the entity.
      if (b.kind === BodyKind.kinematicPosition) {
        if (!samePosition) body.setNextKinematicTranslation({ x: t.x, y: t.y })
        if (!sameRotation) body.setNextKinematicRotation(t.rotation)
      } else {
        if (!samePosition) body.setTranslation({ x: t.x, y: t.y }, true)
        if (!sameRotation) body.setRotation(t.rotation, true)
      }
      const v = body.linvel()
      if (v.x !== b.vx || v.y !== b.vy) body.setLinvel({ x: b.vx, y: b.vy }, true)
      if (body.angvel() !== b.angvel) body.setAngvel(b.angvel, true)
    },
    colliderMatches(world, handle, entity) {
      const collider = world.getCollider(handle)
      const c = entity.get(Collider)
      const slope = c.shape === ShapeKind.slopeUp || c.shape === ShapeKind.slopeDown
      // Our slope and ledge codes are not Rapier's: a slope is a convex polygon, and a ledge a box that Rapier asks about.
      const boxLike = c.shape === ShapeKind.ledge ? ShapeKind.cuboid : c.shape
      const shape = slope ? RAPIER.ShapeType.ConvexPolygon : boxLike
      if (collider.shapeType() !== (shape as number)) return false
      if (isLedge(collider) !== (c.shape === ShapeKind.ledge)) return false
      let sizeMatches: boolean
      if (c.shape === ShapeKind.ball) sizeMatches = collider.radius() === c.hx
      else if (c.shape === ShapeKind.cuboid || c.shape === ShapeKind.ledge) {
        const h = collider.halfExtents() as RAPIER.Vector
        sizeMatches = h.x === c.hx && h.y === c.hy
      } else if (slope) {
        // A hull may start at any of its corners, so the three are compared as a set.
        const vertices = collider.vertices()
        sizeMatches =
          vertices.length === 6 &&
          slopeCorners(c.hx, c.hy, c.shape === ShapeKind.slopeUp ? 1 : -1).every(([x, y]) =>
            [0, 2, 4].some((i) => vertices[i] === x && vertices[i + 1] === y),
          )
      } else sizeMatches = collider.radius() === c.hx && collider.halfHeight() === c.hy
      return (
        sizeMatches &&
        collider.isSensor() === c.sensor &&
        collider.collisionGroups() === c.groups &&
        collider.friction() === c.friction &&
        collider.restitution() === c.restitution
      )
    },
    updateLoneCollider(world, handle, entity) {
      const collider = world.getCollider(handle)
      const t = entity.get(Transform)
      const p = collider.translation()
      if (t.x !== p.x || t.y !== p.y) collider.setTranslation({ x: t.x, y: t.y })
      if (t.rotation !== collider.rotation()) {
        // Rapier keeps the angle as (cos, sin) and reads it back with atan2, which can differ from the authored
        // f32 angle; writing the read-back angle into the ECS makes the next comparison equal, so the collider
        // is not re-rotated (and marked modified) every tick.
        collider.setRotation(t.rotation)
        entity.set(Transform, { rotation: collider.rotation() })
      }
    },
    writeBack(world, handle, entity, wasAsleep) {
      const body = world.getRigidBody(handle)
      const asleep = body.isSleeping()
      // Rapier zeroes a body's velocity as it falls asleep, so that tick is still written; after it, nothing moves.
      if (asleep && wasAsleep) return true
      const p = body.translation()
      const rotation = body.rotation()
      const v = body.linvel()
      const angvel = body.angvel()
      // Only write what moved, so a resting body does not appear in every render delta.
      const t = entity.get(Transform)
      if (t.x !== p.x || t.y !== p.y || t.rotation !== rotation)
        entity.set(Transform, { x: p.x, y: p.y, rotation })
      const b = entity.get(Body)
      if (b.vx !== v.x || b.vy !== v.y || b.angvel !== angvel) entity.set(Body, { vx: v.x, vy: v.y, angvel })
      return asleep
    },
    isSensor: (world, handle) => world.getCollider(handle).isSensor(),
    // Rapier's `Collider.parent()` is a JS-side cache that a restored world fills by looking up the raw parent,
    // and for a lone collider that lookup returns a body; the raw set reports the true parent handle.
    colliderParent: (world, handle) => world.colliders.raw.coParent(handle),
    // The normals Rapier's solver used, read from its narrow phase: it works on a seesaw or a swinging platform, and
    // needs no query of its own. A manifold has no contact points for two boxes whose bounds overlap and no more, and
    // it keeps a zero normal; it is skipped here so `felt` never sees one.
    contactsOf(world, handle) {
      const found: FeltContact[] = []
      const narrow = world.narrowPhase
      const mine = world.getCollider(handle)
      if (mine.isSensor()) return found
      // Only a box has corners.
      const half =
        mine.shapeType() === (ShapeKind.cuboid as number)
          ? (mine.halfExtents() as RAPIER.Vector).x
          : undefined
      // Collected first: the manifolds are read after the enumeration has finished, never inside it.
      const others: number[] = []
      narrow.contactPairsWith(handle, (other) => {
        others.push(other)
      })
      for (const other of others) {
        const theirs = world.getCollider(other)
        if (theirs.isSensor()) continue
        // A ledge that lets this body pass makes no contact it stands on or leans on.
        if (isLedge(theirs) && !holds(world, theirs, mine)) continue
        const parent = world.colliders.raw.coParent(other)
        // A wall is something that does not move, so a kinematic platform's side is not one: only a fixed body, or a
        // collider with no body at all, is. A body that moves (dynamic or kinematic) is still ground under a foot.
        const moves = parent !== undefined && !world.getRigidBody(parent).isFixed()
        narrow.contactPair(handle, other, world.bodies, (manifold, flipped) => {
          const points = manifold.numContacts()
          if (points === 0) return
          let dist = manifold.contactDist(0)
          for (let i = 1; i < points; i++) dist = Math.min(dist, manifold.contactDist(i))
          // The manifold's normal runs from its first shape to its second; `flipped` says the first is `other`. This
          // is the other way round: from the other collider toward this one.
          const n = manifold.normal()
          // Where the points are on this body: in its own frame, which is the second shape's when `flipped`.
          let corner: -1 | 0 | 1 = 0
          if (half !== undefined) {
            let low = true
            let high = true
            for (let i = 0; i < points; i++) {
              const p = flipped ? manifold.localContactPoint2(i) : manifold.localContactPoint1(i)
              if (p === null || p === undefined) {
                low = false
                high = false
                break
              }
              if (p.x > CORNER - half) low = false
              if (p.x < half - CORNER) high = false
            }
            corner = low ? -1 : high ? 1 : 0
          }
          found.push({ nx: flipped ? n.x : -n.x, ny: flipped ? n.y : -n.y, dist, moves, corner })
        })
      }
      return found
    },
  }
  return adapter
}
