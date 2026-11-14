// What a body stands on and leans against, worked out from the contacts Rapier kept after the step. Pure: the adapter
// (rapier.ts) turns Rapier's manifolds into `FeltContact`s, and this file decides what they mean. It is also the only
// place that says what counts as ground and what counts as a wall.

/** One contact between the body and another collider, as the body feels it. */
export interface FeltContact {
  /** The normal, pointing from the other collider toward this body. y points down, so ground has a negative `ny`. */
  readonly nx: number
  readonly ny: number
  /** The nearest contact point's distance, in tiles; nought or less when the two overlap. */
  readonly dist: number
  /** True when the other collider has a dynamic body: a crate, another hero. */
  readonly moves: boolean
}

/** A contact farther than this, in tiles, is a near miss and not a touch. */
export const TOUCH_SLOP = 0.02
/**
 * How upright a normal must be to count: the sine of the steepest slope still stood on, and the steepest face still
 * leaned on. 0.7 is about 44.4 degrees, so a slope of 44 is ground and one of 46 is not.
 */
export const STEEP = 0.7

export interface Felt {
  readonly below: boolean
  readonly left: boolean
  readonly right: boolean
}

/**
 * Ground is anything solid under the body, a crate included. A wall is something that does not move, so a hero pushes
 * a crate and never leans on one.
 */
export function felt(contacts: readonly FeltContact[]): Felt {
  let below = false
  let left = false
  let right = false
  for (const c of contacts) {
    if (c.dist > TOUCH_SLOP) continue
    if (c.ny <= -STEEP) below = true
    if (c.moves) continue
    if (c.nx >= STEEP) left = true
    if (c.nx <= -STEEP) right = true
  }
  return { below, left, right }
}
