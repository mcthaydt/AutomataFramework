// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/features/2d/physics-2d.component.ts
import { type ComponentDef, defineComponent } from '../sim/sim.ts'

// Physics components. Every number is f32: Rapier computes in f32, so values read back
// from Rapier are exact and sync-in can compare them with ===.

const transformFields = { x: 'f32', y: 'f32', rotation: 'f32' } as const
/** Position in metres and rotation in radians. Rendered. */
export const Transform: ComponentDef<typeof transformFields> = defineComponent('transform', transformFields)

const bodyFields = {
  kind: 'u32',
  linearDamping: 'f32',
  angularDamping: 'f32',
  vx: 'f32',
  vy: 'f32',
  angvel: 'f32',
  fixedRotation: 'bool',
} as const
/**
 * A Rapier rigid body: its kind (`BodyKind`), damping, linear (m/s) and angular (rad/s) velocity, and whether it is
 * kept upright (`fixedRotation`: it never turns, so a hero can stand on a corner).
 */
export const Body: ComponentDef<typeof bodyFields> = defineComponent('physics.body', bodyFields, {
  render: false,
})

const colliderFields = {
  shape: 'u32',
  hx: 'f32',
  hy: 'f32',
  sensor: 'bool',
  groups: 'u32',
  friction: 'f32',
  restitution: 'f32',
} as const
/**
 * One collider. `shape` is a `ShapeKind`; sizes are halves: ball radius `hx`; cuboid half extents `hx, hy`;
 * capsule radius `hx` and half-height `hy`. `groups` is Rapier's packed membership << 16 | filter.
 */
export const Collider: ComponentDef<typeof colliderFields> = defineComponent(
  'physics.collider',
  colliderFields,
  { render: false },
)

const jointFields = {
  kind: 'u32',
  a: 'u32',
  b: 'u32',
  ax: 'f32',
  ay: 'f32',
  bx: 'f32',
  by: 'f32',
  limited: 'bool',
  min: 'f32',
  max: 'f32',
} as const
/**
 * One joint between two entities, each of which needs a `Transform` and a `Body`. `kind` is a `JointKind`; `a` and
 * `b` are the entities' StableIds. `ax, ay` is where the joint holds `a`, in metres from a's centre and in a's own
 * turn, and `bx, by` is the same on `b`. A `pin` turns `a` about the shared point; when `limited`, `min` and `max`
 * are how far `a` may turn against `b`, in radians. A `rope` keeps the two points no further apart than `max`
 * metres. Rendered: the renderer reads it to draw ropes and pins. Only a sim made with `physics({ joints: true })`
 * has it.
 */
export const Joint: ComponentDef<typeof jointFields> = defineComponent('physics.joint', jointFields)
