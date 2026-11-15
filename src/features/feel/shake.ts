// Shake: how far the level's picture is moved at an age. Like dust, it is a closed formula of the shake's age, so the
// frames it is cut into never change it. Tiles and seconds throughout.
import { noise } from './noise.ts'

/** How many times a second a shake changes direction. */
export const SHAKE_HZ = 30

/** One shake in progress, in tiles and seconds. `seed` and `tick` make its noise its own. */
export interface Shaking {
  readonly strength: number
  readonly length: number
  readonly seed: number
  readonly tick: number
  age: number
}

/** The offset and size of a shake that is over (or none at all). */
type Offset = { readonly x: number; readonly y: number; readonly size: number }

const NONE: Offset = Object.freeze({ x: 0, y: 0, size: 0 })

/**
 * The offset now, in tiles, and how big the shake still is (`strength` fading to nothing over `length`); all zero once
 * its age has reached its length. The direction holds for a thirtieth of a second, then another is drawn.
 */
export function shakeAt(shake: Shaking): Offset {
  if (!(shake.age >= 0 && shake.age < shake.length)) return NONE
  const size = shake.strength * (1 - shake.age / shake.length)
  const beat = Math.floor(shake.age * SHAKE_HZ)
  return {
    x: size * (2 * noise(shake.seed, shake.tick, beat, 0) - 1),
    y: size * (2 * noise(shake.seed, shake.tick, beat, 1) - 1),
    size,
  }
}

/** The offset of the shake that is biggest now, never the sum of several; zero for none. */
export function largestShake(shakes: readonly Shaking[]): { readonly x: number; readonly y: number } {
  let best = NONE
  for (const shake of shakes) {
    const now = shakeAt(shake)
    if (now.size > best.size) best = now
  }
  return { x: best.x, y: best.y }
}
