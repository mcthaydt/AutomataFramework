// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/rapier-2d.ts
// The Rapier adapter: the only file that calls Rapier. Loaded with a dynamic import from physics.ts, so the wasm loads
// inside createSim and never at import time.

import RAPIER from '@dimforge/rapier2d-deterministic'
import type { EntityRef } from '../sim/sim.ts'
import { checkBody, checkCollider, checkJoint, checkMass } from './checks.ts'
import { Body, Collider, Joint, Mass, Transform } from './components.ts'
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

/** The entity's weight in kilograms, or undefined for one that weighs what its shape does (or a sim with no weights). */
function kilosOf(entity: EntityRef, weights: boolean): number | undefined {
  return weights && entity.has(Mass) ? entity.get(Mass).kilos : undefined
}

function colliderDesc(entity: EntityRef, weights: boolean): RAPIER.ColliderDesc {
  const c = entity.get(Collider)
  const desc =
    c.shape === ShapeKind.ball
      ? RAPIER.ColliderDesc.ball(c.hx)
      : c.shape === ShapeKind.cuboid
        ? RAPIER.ColliderDesc.cuboid(c.hx, c.hy)
        : RAPIER.ColliderDesc.capsule(c.hy, c.hx)
  const kilos = kilosOf(entity, weights)
  if (kilos !== undefined) desc.setMass(kilos)
  return desc
    .setSensor(c.sensor)
    .setCollisionGroups(c.groups)
    .setFriction(c.friction)
    .setRestitution(c.restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    .setActiveCollisionTypes(COLLISION_TYPES)
}

export async function createRapier(setup: {
  gravity: { x: number; y: number }
  dt: number
  /** Whether the sim has the `Mass` component (`physics({ weights: true })`): an entity may ask Mass of it only then. */
  weights?: boolean
}): Promise<PhysicsAdapter<World>> {
  // A rejected init is not kept: the next createSim retries it (a wasm fetch can fail transiently).
  ready ??= loadRapier().catch((err: unknown) => {
    ready = undefined
    throw err
  })
  await ready
  const queue = new RAPIER.EventQueue(true)
  const weights = setup.weights === true
  // Rapier has no getter for a body's rotation lock, so the adapter remembers what it applied. After a restore it
  // knows nothing about a body and takes the entity's value as the one the snapshot's world holds: asking Rapier to lock
  // again would wake every sleeping body and so change the state hash (the restore parity tests catch that). The one
  // case this misses is `fixedRotation` edited after the last sync-in and before the snapshot; that edit is then lost
  // for the restored sim until it is edited again.
  const rotationLocked = new Map<number, boolean>()
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
      world.step(queue)
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
      const kilos = kilosOf(entity, weights)
      if (kilos !== undefined) checkMass(entity.sid, 'physics.mass', kilos)
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
      const desc = colliderDesc(entity, weights)
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
      const kilos = kilosOf(entity, weights)
      if (collider.shapeType() !== (c.shape as number)) return false
      let sizeMatches: boolean
      if (c.shape === ShapeKind.ball) sizeMatches = collider.radius() === c.hx
      else if (c.shape === ShapeKind.cuboid) {
        const h = collider.halfExtents() as RAPIER.Vector
        sizeMatches = h.x === c.hx && h.y === c.hy
      } else sizeMatches = collider.radius() === c.hx && collider.halfHeight() === c.hy
      return (
        sizeMatches &&
        collider.isSensor() === c.sensor &&
        collider.collisionGroups() === c.groups &&
        collider.friction() === c.friction &&
        collider.restitution() === c.restitution &&
        // A weighed collider must still weigh what Mass says; a changed weight rebuilds it.
        (kilos === undefined || collider.mass() === kilos)
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
        if (world.getCollider(other).isSensor()) continue
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
