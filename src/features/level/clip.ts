// Which clip of its figure a character plays, and which pose of that clip it shows. Pure functions of numbers and
// ids, so the system that calls them (`sprite.ts`) and the tests that pin them say the same thing.
import type { Clip } from '../content/content.ts'

/** The clips a character's motion asks for. A character may have any of them or none; `pickClip` copes. */
export type MotionClip = 'idle' | 'run' | 'jump' | 'fall' | 'land'

/** How fast, up or down, in tiles a second, a character must go to count as jumping or falling. */
export const VERTICAL = 0.25
/** How fast, sideways, in tiles a second, a character must go to count as running. */
export const SIDEWAYS = 0.01
/** How many ticks in a row a character has hardly moved up or down before the top of a jump is over. */
export const STILL_TICKS = 4

/**
 * The clip a character's motion asks for. y points down. `still` is how many ticks in a row `|vy|` has been
 * `VERTICAL` or less (it stops counting at `STILL_TICKS`), so the very top of a jump, where the speed is nought for a
 * tick, is not mistaken for the ground. `now` is the clip playing and `landing` is true while that clip is not done.
 */
export function motionClip(vx: number, vy: number, now: string, still: number, landing: boolean): MotionClip {
  if (vy < -VERTICAL) return 'jump'
  if (vy > VERTICAL) return 'fall'
  if (still < STILL_TICKS && (now === 'jump' || now === 'fall')) return now
  if (now === 'fall' || (now === 'land' && landing)) return 'land'
  return Math.abs(vx) > SIDEWAYS ? 'run' : 'idle'
}

/** What a character without a clip plays instead: the clip that is nearest to it. */
const NEAREST: Readonly<Record<string, string>> = { land: 'idle', fall: 'jump', push: 'run' }

/**
 * The clip a character plays when `wanted` is asked for: that one if it has it, else its nearest, else `idle`, else
 * its first. `undefined` only for a character with no clips.
 */
export function pickClip(clips: readonly Clip[], wanted: string): Clip | undefined {
  const named = (id: string | undefined): Clip | undefined => clips.find((clip) => clip.id === id)
  return named(wanted) ?? named(NEAREST[wanted]) ?? named('idle') ?? clips[0]
}

/**
 * The pose a clip shows `ticks` ticks after it began, and whether it is done. A looping clip goes round for ever;
 * another holds its last pose once it has shown every pose for its time.
 */
export function poseAt(clip: Clip, ticks: number): { readonly pose: string; readonly done: boolean } {
  const count = clip.poses.length
  const shown = Math.floor((ticks * clip.fps) / 60)
  if (clip.loop) return { pose: clip.poses[shown % count] ?? '', done: false }
  return { pose: clip.poses[Math.min(shown, count - 1)] ?? '', done: shown >= count }
}
