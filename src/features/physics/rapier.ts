// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/rapier-2d.ts
// The Rapier adapter: the only file that calls Rapier. Loaded with a dynamic import from physics.ts, so the wasm loads
// inside createSim and never at import time.

import RAPIER from '@dimforge/rapier2d-deterministic-compat'
import type { EntityRef } from '../sim/sim.ts'
import { checkBody, checkCollider } from './checks.ts'
import { Body, Collider, Transform } from './components.ts'
import { CollisionEnded, CollisionStarted } from './events.ts'
import { BodyKind, ShapeKind } from './kinds.ts'
import type { PhysicsAdapter } from './physics-world.ts'

type World = RAPIER.World

// One init per module: the wasm is compiled once per page or process however many sims use it.
let ready: Promise<void> | undefined

// Kinematic bodies get contacts with fixed and kinematic colliders; fixed against fixed never.
const COLLISION_TYPES =
  RAPIER.ActiveCollisionTypes.DEFAULT |
  RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED |
  RAPIER.ActiveCollisionTypes.KINEMATIC_KINEMATIC

function colliderDesc(entity: EntityRef): RAPIER.ColliderDesc {
  const c = entity.get(Collider)
  const desc =
    c.shape === ShapeKind.ball
      ? RAPIER.ColliderDesc.ball(c.hx)
      : c.shape === ShapeKind.cuboid
        ? RAPIER.ColliderDesc.cuboid(c.hx, c.hy)
        : RAPIER.ColliderDesc.capsule(c.hy, c.hx)
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
}): Promise<PhysicsAdapter<World>> {
  // A rejected init is not kept: the next createSim retries it (a wasm fetch can fail transiently).
  ready ??= RAPIER.init().catch((err: unknown) => {
    ready = undefined
    throw err
  })
  await ready
  const queue = new RAPIER.EventQueue(true)
  const adapter: PhysicsAdapter<World> = {
    Transform,
    RigidBody: Body,
    Collider,
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
    },
    handles(world) {
      const bodies: number[] = []
      const colliders: number[] = []
      world.bodies.forEach((body) => {
        bodies.push(body.handle)
      })
      world.colliders.forEach((collider) => {
        colliders.push(collider.handle)
      })
      return { bodies, colliders }
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
      return world.createRigidBody(desc).handle
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
  }
  return adapter
}
