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
  /**
   * Which bottom or top corner of the body all the contact's points are in, if they all are: -1 the left one, 1 the right
   * one, 0 for any other contact (and for a body that is not a box). A body sliding down a wall made of stacked boxes
   * catches the seam between two of them, and the contact that makes is at the corner and nowhere else.
   */
  readonly corner?: -1 | 0 | 1
}

/** A contact whose points are all this close, in tiles, to a corner of the body is a corner contact. */
export const CORNER = 0.03

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
  let left = false
  let right = false
  for (const c of contacts) {
    if (c.dist > TOUCH_SLOP || c.moves) continue
    if (c.nx >= STEEP) left = true
    if (c.nx <= -STEEP) right = true
  }
  let below = false
  for (const c of contacts) {
    if (c.dist > TOUCH_SLOP || c.ny > -STEEP) continue
    // Only a corner of the body on the seam of a wall it leans on is not ground: the seam is inside the wall.
    if ((c.corner === -1 && left) || (c.corner === 1 && right)) continue
    below = true
  }
  return { below, left, right }
}
