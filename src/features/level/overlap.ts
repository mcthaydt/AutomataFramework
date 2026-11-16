// Two boxes that overlap (plan W): the one pure test a press and a gate's wait are worked out from. It holds no count of
// what stands where, so a restore, a despawn and a rebuilt collider can never leave a switch stuck.
import { cos, sin } from '../sim/sim.ts'

/** A box by its middle, its half sizes and its turn in radians. */
export interface TurnedBox {
  readonly x: number
  readonly y: number
  readonly hw: number
  readonly hh: number
  readonly rotation: number
}

/** How far two boxes must overlap, in tiles, to count: boxes that only touch, or graze, do not. */
const SLOP = 0.01

/**
 * True when the two boxes overlap by more than `SLOP` on every one of their four edge directions (the separating axes of
 * two rectangles). Boxes that only touch do not. The turn goes through the sim's own `sin` and `cos`, which round the same
 * in every engine, so the answer is the same everywhere; swapping `a` and `b` gives the same answer.
 */
export function boxesOverlap(a: TurnedBox, b: TurnedBox): boolean {
  const ca = cos(a.rotation)
  const sa = sin(a.rotation)
  const cb = cos(b.rotation)
  const sb = sin(b.rotation)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const axes: ReadonlyArray<readonly [number, number]> = [
    [ca, sa],
    [-sa, ca],
    [cb, sb],
    [-sb, cb],
  ]
  for (const [ux, uy] of axes) {
    // Each box's reach along the axis: its half sizes projected on the axis.
    const reachA = a.hw * Math.abs(ca * ux + sa * uy) + a.hh * Math.abs(-sa * ux + ca * uy)
    const reachB = b.hw * Math.abs(cb * ux + sb * uy) + b.hh * Math.abs(-sb * ux + cb * uy)
    if (reachA + reachB - Math.abs(dx * ux + dy * uy) <= SLOP) return false
  }
  return true
}
