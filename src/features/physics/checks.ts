// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/src/shared/checks.ts
import { BodyKind, ShapeKind } from './kinds.ts'

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
