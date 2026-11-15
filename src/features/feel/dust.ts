// Dust: a burst of specks and where one speck is at an age. A speck's place is a closed formula of its age, never a
// sum over frames, so cutting time into different frames never changes where it is. Tiles and seconds throughout.
import type { Dust } from '../content/content.ts'
import { cos, sin } from '../sim/sim.ts'
import { noise } from './noise.ts'

/** The most specks on screen at once: enough for four heroes landing together, and cheap on a phone. */
export const MAX_SPECKS = 256
/** A speck's side, in tiles. */
export const SPECK_SIZE = 0.125
/** A third of a half turn (60 degrees), written out: `Math.PI` is not on the list of exact `Math` for feel. */
const SIXTY_DEGREES = 1.0471975511965976
/** How far a speck sinks as it comes to rest, in tiles. */
const SINK = 0.25

/** One speck in flight: where it started, how fast, and how old it is, in tiles and seconds. */
export interface Speck {
  readonly x0: number
  readonly y0: number
  readonly vx: number
  readonly vy: number
  readonly color: number
  readonly life: number
  age: number
}

/** One speck as it is drawn: its middle and side in tiles, its colour (0xrrggbb) and how solid it is (1 to 0). */
export interface FeelSpeck {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly color: number
  readonly alpha: number
}

/** A file's `#rrggbb` as the 0xrrggbb number the renderer uses. */
const colourOf = (hex: string): number => Number.parseInt(hex.slice(1), 16)

/**
 * The specks of one burst, all starting at `at`. `key` is what makes this burst's noise its own: the game's seed, the
 * tick of the event and the `sid` of the thing it names. Each fans out within 60 degrees of straight up (y points
 * down, so up is a negative speed) at half to all of the file's speed.
 */
export function burst(
  dust: Dust,
  at: { readonly x: number; readonly y: number },
  key: { readonly seed: number; readonly tick: number; readonly sid: number },
  tickHz: number,
): Speck[] {
  const color = colourOf(dust.color)
  const life = dust.life / tickHz
  const specks: Speck[] = []
  for (let i = 0; i < dust.count; i++) {
    const angle = (noise(key.seed, key.tick, key.sid, 2 * i) * 2 - 1) * SIXTY_DEGREES
    const speed = dust.speed * (0.5 + 0.5 * noise(key.seed, key.tick, key.sid, 2 * i + 1))
    specks.push({ x0: at.x, y0: at.y, vx: speed * sin(angle), vy: -speed * cos(angle), color, life, age: 0 })
  }
  return specks
}

/**
 * Where a speck is now; `undefined` once its age has reached its life. With `u` its age as a share of its life, it
 * slows to a stop (`u - u*u/2`), sinks a quarter of a tile (`u*u`) and fades as `1 - u*u`.
 */
export function speckAt(speck: Speck): FeelSpeck | undefined {
  if (!(speck.age < speck.life)) return undefined
  const u = speck.age / speck.life
  const along = speck.life * (u - (u * u) / 2)
  return {
    x: speck.x0 + speck.vx * along,
    y: speck.y0 + speck.vy * along + SINK * u * u,
    size: SPECK_SIZE,
    color: speck.color,
    alpha: 1 - u * u,
  }
}
