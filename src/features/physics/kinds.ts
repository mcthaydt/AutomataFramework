// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/shared/kinds.ts
// Codes stored in Body.kind and Collider.shape. A body's kind and the first three shapes equal Rapier's own RigidBodyType
// and ShapeType values; the shapes from 16 up are ours, and the adapter says what Rapier shape each is.

/**
 * The codes a rigid body's `kind` field holds: `dynamic` (moved by gravity and contacts), `fixed` (never
 * moves), `kinematicPosition` (moved by writing its transform) and `kinematicVelocity` (moved by its
 * velocity). `BodyKind` is also the type of those values.
 */
export const BodyKind: {
  readonly dynamic: 0
  readonly fixed: 1
  readonly kinematicPosition: 2
  readonly kinematicVelocity: 3
} = { dynamic: 0, fixed: 1, kinematicPosition: 2, kinematicVelocity: 3 }
export type BodyKind = (typeof BodyKind)[keyof typeof BodyKind]

/**
 * The codes a collider's `shape` field holds: `ball`, `cuboid` and `capsule`, which equal Rapier's own ShapeType
 * values, and three of ours that the adapter maps: `slopeUp` and `slopeDown` (a right triangle filling half its box,
 * rising to the right or to the left) and `ledge` (a box that only holds what comes from above). `ShapeKind` is also
 * the type of those values.
 */
export const ShapeKind: {
  readonly ball: 0
  readonly cuboid: 1
  readonly capsule: 2
  readonly slopeUp: 16
  readonly slopeDown: 17
  readonly ledge: 18
} = {
  ball: 0,
  cuboid: 1,
  capsule: 2,
  slopeUp: 16,
  slopeDown: 17,
  ledge: 18,
}
export type ShapeKind = (typeof ShapeKind)[keyof typeof ShapeKind]

/** Options every collider helper takes. The defaults are Rapier's: every group, friction 0.5, no bounce. */
export interface ColliderOptions {
  readonly sensor?: boolean
  readonly groups?: number
  readonly friction?: number
  readonly restitution?: number
}

export function colliderDefaults(opts: ColliderOptions): {
  sensor: boolean
  groups: number
  friction: number
  restitution: number
} {
  return {
    sensor: opts.sensor ?? false,
    groups: opts.groups ?? 0xffffffff,
    friction: opts.friction ?? 0.5,
    restitution: opts.restitution ?? 0,
  }
}

/**
 * The codes a joint's `kind` field holds: `pin` (the first thing turns about a point, as a seesaw does on its
 * pin) and `rope` (the first thing can go no further from the second than the rope reaches, as a swing does).
 * `JointKind` is also the type of those values.
 */
export const JointKind: { readonly pin: 0; readonly rope: 1 } = { pin: 0, rope: 1 }
export type JointKind = (typeof JointKind)[keyof typeof JointKind]
