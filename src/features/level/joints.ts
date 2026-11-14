import type { LevelJoint } from '../content/content.ts'
import { joint } from '../physics/physics.ts'
import { hypot, type SpawnPart } from '../sim/sim.ts'

/** A spawned thing, or the level's own anchor: its StableId and where its centre is, in tiles. */
export interface Placed {
  readonly sid: number
  readonly x: number
  readonly y: number
}

const radians = (degrees: number): number => Math.fround((degrees * Math.PI) / 180)

/**
 * The spawn part for one of a level's joints. A thing is spawned unturned, so where a joint holds it is the joint's
 * place minus the thing's centre. The level's anchor sits at (0, 0), so the holder's offset is simply the place. A
 * rope's length is the gap between its ends plus its slack, from the sim's own `hypot`: `Math.hypot` is not
 * required to round the same in every engine, and this value goes into the sim's state.
 */
export function jointParts(j: LevelJoint, thing: Placed, holder: Placed): SpawnPart {
  if (j.kind === 'pin')
    return joint.pin(thing.sid, holder.sid, {
      ax: j.x - thing.x,
      ay: j.y - thing.y,
      bx: j.x - holder.x,
      by: j.y - holder.y,
      ...(j.turn === undefined ? {} : { min: radians(j.turn.min), max: radians(j.turn.max) }),
    })
  const length = Math.fround(hypot(j.to.x - j.from.x, j.to.y - j.from.y) + (j.slack ?? 0))
  return joint.rope(thing.sid, holder.sid, length, {
    ax: j.from.x - thing.x,
    ay: j.from.y - thing.y,
    bx: j.to.x - holder.x,
    by: j.to.y - holder.y,
  })
}
