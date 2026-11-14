// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/spawn-2d.ts
import type { SpawnPart } from '../sim/sim.ts'
import { Body, Collider, Joint, Transform } from './components.ts'
import { type BodyKind, type ColliderOptions, colliderDefaults, JointKind, ShapeKind } from './kinds.ts'

// Spawn helpers: component fields default to zero, which is a collider in no group, so
// these give Rapier's defaults instead.

/**
 * The spawn part that places an entity: `x` and `y` in metres and `rotation` in radians, each 0 unless given.
 */
export function transform(at: { x?: number; y?: number; rotation?: number } = {}): SpawnPart {
  const { x = 0, y = 0, rotation = 0 } = at
  return [Transform, { x, y, rotation }]
}

/**
 * The spawn part that gives an entity a rigid body of a `BodyKind`. Damping and velocities (`vx`, `vy` in
 * m/s, `angvel` in rad/s) are 0 unless given; `fixedRotation` keeps the body upright and is false unless given.
 */
export function body(
  kind: BodyKind,
  opts: {
    linearDamping?: number
    angularDamping?: number
    vx?: number
    vy?: number
    angvel?: number
    fixedRotation?: boolean
  } = {},
): SpawnPart {
  const { linearDamping = 0, angularDamping = 0, vx = 0, vy = 0, angvel = 0, fixedRotation = false } = opts
  return [Body, { kind, linearDamping, angularDamping, vx, vy, angvel, fixedRotation }]
}

/**
 * The spawn parts that give an entity a collider: `ball(radius)`, `cuboid(hx, hy)` with half extents, and
 * `capsule(halfHeight, radius)`. Each takes `ColliderOptions`, whose defaults are Rapier's (every group,
 * friction 0.5, no bounce, not a sensor).
 */
export const collider: {
  ball(radius: number, opts?: ColliderOptions): SpawnPart
  cuboid(hx: number, hy: number, opts?: ColliderOptions): SpawnPart
  capsule(halfHeight: number, radius: number, opts?: ColliderOptions): SpawnPart
} = {
  ball: (radius, opts = {}) => [
    Collider,
    { shape: ShapeKind.ball, hx: radius, hy: 0, ...colliderDefaults(opts) },
  ],
  cuboid: (hx, hy, opts = {}) => [Collider, { shape: ShapeKind.cuboid, hx, hy, ...colliderDefaults(opts) }],
  capsule: (halfHeight, radius, opts = {}) => [
    Collider,
    { shape: ShapeKind.capsule, hx: radius, hy: halfHeight, ...colliderDefaults(opts) },
  ],
}

/** The two ends of a joint: where it holds `a` (`ax`, `ay`) and `b` (`bx`, `by`), in metres from each one's centre. */
interface JointEnds {
  readonly ax?: number
  readonly ay?: number
  readonly bx?: number
  readonly by?: number
}

/**
 * The spawn parts for a joint between entities `a` and `b` (their StableIds). Put one on an entity of its own, once
 * both exist; it waits, without an error, for an end that is not alive yet. `pin` holds the two ends at one point,
 * and is limited to `min`..`max` radians when both are given. `rope` keeps them no further apart than `length`
 * metres. Only a sim made with `physics({ joints: true })` has the `Joint` component.
 */
export const joint: {
  pin(a: number, b: number, opts?: JointEnds & { min?: number; max?: number }): SpawnPart
  rope(a: number, b: number, length: number, opts?: JointEnds): SpawnPart
} = {
  pin: (a, b, opts = {}) => {
    const { ax = 0, ay = 0, bx = 0, by = 0, min, max } = opts
    const limited = min !== undefined && max !== undefined
    return [
      Joint,
      { kind: JointKind.pin, a, b, ax, ay, bx, by, limited, min: limited ? min : 0, max: limited ? max : 0 },
    ]
  },
  rope: (a, b, length, opts = {}) => {
    const { ax = 0, ay = 0, bx = 0, by = 0 } = opts
    return [Joint, { kind: JointKind.rope, a, b, ax, ay, bx, by, limited: false, min: 0, max: length }]
  },
}
