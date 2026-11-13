import { Look } from '../level/level.ts'
import { Transform } from '../physics/physics.ts'
import type { RenderDelta, RenderRow } from '../sim/sim.ts'

/** One box to draw: its centre and turn in tiles and radians, its size in tiles and its colour (0xrrggbb). */
export interface View {
  readonly sid: number
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly w: number
  readonly h: number
  readonly color: number
}

/** What the renderer keeps of the sim: the views, and what is needed to blend between two steps. */
export interface Scene {
  /** Takes the render delta of one sim step. Call once per step, in order. */
  apply(delta: RenderDelta): void
  /** Every view, lowest sid first, posed between the last step (`alpha` 0) and this one (`alpha` 1). */
  views(alpha: number): View[]
}

interface Pose {
  readonly x: number
  readonly y: number
  readonly rotation: number
}

interface Entry {
  prev: Pose
  curr: Pose
  w: number
  h: number
  color: number
}

const TURN = 2 * Math.PI

/** The signed turn from `from` to `to`, the short way round: always within half a turn. */
function shortestTurn(from: number, to: number): number {
  const d = (to - from) % TURN
  return d > Math.PI ? d - TURN : d < -Math.PI ? d + TURN : d
}

const num = (record: Readonly<Record<string, number | boolean | string>>, key: string): number => {
  const v = record[key]
  return typeof v === 'number' ? v : 0
}

/** Only an entity with both a transform and a look is drawn. */
function read(row: RenderRow): { pose: Pose; w: number; h: number; color: number } | undefined {
  const transform = row.components[Transform.id]
  const look = row.components[Look.id]
  if (transform === undefined || look === undefined) return undefined
  return {
    pose: { x: num(transform, 'x'), y: num(transform, 'y'), rotation: num(transform, 'rotation') },
    w: num(look, 'w'),
    h: num(look, 'h'),
    color: num(look, 'color'),
  }
}

/**
 * The renderer's copy of the world: no Pixi, no page, so it can be tested alone. An entity appears at its pose on
 * the step it is added (it does not slide in from elsewhere), and one the sim stopped reporting rests where it was.
 */
export function createScene(): Scene {
  const entries = new Map<number, Entry>()
  return {
    apply(delta) {
      if (delta.resync) entries.clear()
      // Whatever the delta does not mention has not moved: its last pose becomes both ends of the blend.
      for (const entry of entries.values()) entry.prev = entry.curr
      for (const sid of delta.removed) entries.delete(sid)
      const take = (row: RenderRow, fresh: boolean): void => {
        const now = read(row)
        if (now === undefined) {
          entries.delete(row.sid)
          return
        }
        const before = fresh ? undefined : entries.get(row.sid)
        entries.set(row.sid, {
          prev: before?.curr ?? now.pose,
          curr: now.pose,
          w: now.w,
          h: now.h,
          color: now.color,
        })
      }
      for (const row of delta.added) take(row, true)
      for (const row of delta.changed) take(row, false)
    },
    views(alpha) {
      // NaN is "no blend": the newest pose.
      const t = Number.isNaN(alpha) ? 1 : Math.min(1, Math.max(0, alpha))
      return [...entries.keys()]
        .sort((a, b) => a - b)
        .map((sid) => {
          const e = entries.get(sid) as Entry
          return {
            sid,
            x: e.prev.x + (e.curr.x - e.prev.x) * t,
            y: e.prev.y + (e.curr.y - e.prev.y) * t,
            rotation: e.prev.rotation + shortestTurn(e.prev.rotation, e.curr.rotation) * t,
            w: e.w,
            h: e.h,
            color: e.color,
          }
        })
    },
  }
}
