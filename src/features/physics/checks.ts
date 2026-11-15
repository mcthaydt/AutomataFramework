// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/shared/checks.ts
import type { JointSpec } from './joint-table.ts'
import { BodyKind, JointKind, ShapeKind } from './kinds.ts'

// Field checks for sync-in. An invalid value is a programming error in game code, so each
// throws an Error naming the entity and the field rather than letting Rapier panic inside wasm.

function invalid(sid: number, component: string, field: string, why: string): never {
  throw new Error(`entity ${sid}: ${component}.${field} ${why}`)
}

export function checkBody(sid: number, component: string, kind: number): void {
  if (kind > BodyKind.kinematicVelocity)
    invalid(sid, component, 'kind', `is ${kind}; expected a BodyKind (0..3)`)
}

/** The sizes the shape uses must be positive (ball: hx; cuboid and capsule: hx and hy). */
export function checkCollider(sid: number, component: string, shape: number, hx: number, hy: number): void {
  if (shape > ShapeKind.capsule) invalid(sid, component, 'shape', `is ${shape}; expected a ShapeKind (0..2)`)
  if (!(hx > 0)) invalid(sid, component, 'hx', `is ${hx}; sizes must be positive`)
  if (shape === ShapeKind.ball) return
  if (!(hy > 0)) invalid(sid, component, 'hy', `is ${hy}; sizes must be positive`)
}

/**
 * A joint's kind must be a `JointKind`, its two ends two different entities, every number a number, a rope's length
 * positive and a limited pin's `min` no more than its `max`. The sim's own fields refuse NaN and Infinity when they
 * are written, so the number check is a second line of defence for a caller that bypasses them.
 */
export function checkJoint(sid: number, component: string, joint: JointSpec): void {
  if (joint.kind > JointKind.rope)
    invalid(sid, component, 'kind', `is ${joint.kind}; expected a JointKind (0..1)`)
  if (joint.b === joint.a) invalid(sid, component, 'b', `is ${joint.b}; a joint needs two different entities`)
  for (const field of ['ax', 'ay', 'bx', 'by'] as const)
    if (!Number.isFinite(joint[field]))
      invalid(sid, component, field, `is ${joint[field]}; it must be a number`)
  if (joint.kind === JointKind.rope) {
    if (!(joint.max > 0 && Number.isFinite(joint.max)))
      invalid(sid, component, 'max', `is ${joint.max}; a rope's length must be positive`)
    return
  }
  if (!joint.limited) return
  for (const field of ['min', 'max'] as const)
    if (!Number.isFinite(joint[field]))
      invalid(sid, component, field, `is ${joint[field]}; it must be a number`)
  if (joint.min > joint.max)
    invalid(sid, component, 'min', `is ${joint.min}; it must not be more than max (${joint.max})`)
}
