// The two-thumb touch scheme as rules, with no page: fingers land, move and lift (with the event's own time), and the
// rules say what is held. The left half of the screen walks (a ring that appears where the thumb lands), the right half
// jumps, and a quick flick of the walking thumb is a dash. The page (thumbs.ts) feeds it pointer events and draws what
// `ring` says; everything a person's thumb decides is decided here, where a test can say it in numbers.

/** A thumb must slide this far from the ring's middle before the walk is held, in CSS pixels. */
export const DEAD_ZONE_PX = 12
/** A thumb further than this from the ring's middle pulls the middle after it. */
export const FOLLOW_PX = 56
/** A flick: this far sideways... */
export const FLICK_PX = 56
/** ...inside this long. */
export const FLICK_MS = 110

/** Where a finger landed: the half of the screen that walks, or the one that jumps (the page decides which is which). */
export type Half = 'walk' | 'jump'

export interface ThumbRules {
  /** A finger lands. `half` is where it landed; `ms` is the event's own time. */
  down(id: number, half: Half, x: number, y: number, ms: number): void
  move(id: number, x: number, y: number, ms: number): void
  /** A finger lifts, or the system takes the touch away. */
  up(id: number): void
  /** Lets go of everything: the window lost focus, or the screen turned. */
  clear(): void
  /** Fingers down now do nothing until they lift: a press that ended a screen. */
  mask(): void
  /** What is held now: any of 'left', 'right', 'jump'. */
  held(): Set<string>
  /** `held()`, and anything pressed and let go since the last drain ('dash' is only ever here). Empties that list. */
  drain(): Set<string>
  /** Where to draw the ring: its middle and the thumb, or `undefined` with no walking thumb. */
  ring(): { readonly cx: number; readonly cy: number; readonly x: number; readonly y: number } | undefined
  /** How many times each has been done, for the hints. */
  uses(): { readonly walk: number; readonly jump: number; readonly dash: number }
}

interface Sample {
  readonly x: number
  readonly y: number
  readonly ms: number
}

/** The thumb that owns the walking half. */
interface Walker {
  readonly id: number
  cx: number
  readonly cy: number
  x: number
  y: number
  /** The side held at the last look, to count a walk when one is first held. */
  side: 'left' | 'right' | undefined
  /** Where the thumb has been inside the last `FLICK_MS`, oldest first. */
  trail: Sample[]
  /** False from a flick until the thumb has slowed or lifted, so one swipe is one dash. */
  armed: boolean
}

/**
 * The rules for one screen. The first finger to land in a half owns it until it lifts; a second finger in the same half
 * does nothing, and a finger that lands in one half and slides into the other stays in the half it landed in.
 */
export function createThumbRules(options: { readonly dash: boolean }): ThumbRules {
  const fingers = new Set<number>()
  const masked = new Set<number>()
  const pending = new Set<string>()
  const counts = { walk: 0, jump: 0, dash: 0 }
  let walker: Walker | undefined
  let jumper: number | undefined

  const sideOf = (w: Walker): 'left' | 'right' | undefined =>
    w.x - w.cx > DEAD_ZONE_PX ? 'right' : w.cx - w.x > DEAD_ZONE_PX ? 'left' : undefined

  /** Notes where the thumb is: the ring follows, a first side is a walk, and a quick sideways swipe is a dash. */
  function look(w: Walker, ms: number): void {
    if (w.x - w.cx > FOLLOW_PX) w.cx = w.x - FOLLOW_PX
    else if (w.cx - w.x > FOLLOW_PX) w.cx = w.x + FOLLOW_PX
    const side = sideOf(w)
    if (side !== undefined && w.side === undefined) counts.walk += 1
    w.side = side

    w.trail.push({ x: w.x, y: w.y, ms })
    while (w.trail.length > 1 && (w.trail[0]?.ms ?? ms) < ms - FLICK_MS) w.trail.shift()
    const from = w.trail[0]
    if (from === undefined) return
    const dx = w.x - from.x
    const dy = w.y - from.y
    if (Math.abs(dx) < FLICK_PX / 2) w.armed = true
    if (options.dash && w.armed && Math.abs(dx) >= FLICK_PX && Math.abs(dx) >= 2 * Math.abs(dy)) {
      w.armed = false
      counts.dash += 1
      pending.add('dash')
      pending.add(dx > 0 ? 'right' : 'left')
    }
  }

  const held = (): Set<string> => {
    const out = new Set<string>()
    if (walker !== undefined) {
      const side = sideOf(walker)
      if (side !== undefined) out.add(side)
    }
    if (jumper !== undefined) out.add('jump')
    return out
  }

  return {
    down(id, half, x, y, ms) {
      if (fingers.has(id)) return
      fingers.add(id)
      if (half === 'walk' && walker === undefined) {
        walker = { id, cx: x, cy: y, x, y, side: undefined, trail: [{ x, y, ms }], armed: true }
      } else if (half === 'jump' && jumper === undefined) {
        jumper = id
        counts.jump += 1
        pending.add('jump')
      }
    },
    move(id, x, y, ms) {
      if (walker === undefined || walker.id !== id || masked.has(id)) return
      walker.x = x
      walker.y = y
      look(walker, ms)
    },
    up(id) {
      fingers.delete(id)
      masked.delete(id)
      if (walker?.id === id) walker = undefined
      if (jumper === id) jumper = undefined
    },
    clear() {
      fingers.clear()
      masked.clear()
      pending.clear()
      walker = undefined
      jumper = undefined
    },
    mask() {
      for (const id of fingers) masked.add(id)
      walker = undefined
      jumper = undefined
    },
    held,
    drain() {
      const out = held()
      for (const name of pending) out.add(name)
      pending.clear()
      return out
    },
    ring() {
      if (walker === undefined) return undefined
      return { cx: walker.cx, cy: walker.cy, x: walker.x, y: walker.y }
    },
    uses: () => ({ ...counts }),
  }
}
