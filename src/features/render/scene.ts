import { Look } from '../level/level.ts'
import { Joint, Transform } from '../physics/physics.ts'
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

/**
 * One joint to draw, in tiles: a rope from (x1, y1) on its thing to (x2, y2) on what holds it; a pin at (x1, y1),
 * where the two ends meet.
 */
export interface Link {
  readonly sid: number
  readonly kind: 'pin' | 'rope'
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/** What the renderer keeps of the sim: the views, and what is needed to blend between two steps. */
export interface Scene {
  /** Takes the render delta of one sim step. Call once per step, in order. */
  apply(delta: RenderDelta): void
  /** Every view, lowest sid first, posed between the last step (`alpha` 0) and this one (`alpha` 1). */
  views(alpha: number): View[]
  /**
   * Every joint whose two ends are both in the scene, lowest sid first, blended like `views`. An end is its entity's
   * pose plus the joint's offset turned by the entity's turn. An entity with a pose and no look is not a view but
   * can still be an end (the level's anchor).
   */
  links(alpha: number): Link[]
}

interface Pose {
  readonly x: number
  readonly y: number
  readonly rotation: number
}

interface Entry {
  prev: Pose
  curr: Pose
  /** Left out for an entity that has a pose and no look: it is not drawn, but a joint may hold it. */
  look: { readonly w: number; readonly h: number; readonly color: number } | undefined
}

/** The fields of a joint the scene keeps. */
interface JointEnds {
  readonly kind: number
  readonly a: number
  readonly b: number
  readonly ax: number
  readonly ay: number
  readonly bx: number
  readonly by: number
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

/** An entity with a transform has a pose; with a look as well it is drawn. Without a transform it is nothing. */
function read(row: RenderRow): { pose: Pose; look: Entry['look'] } | undefined {
  const transform = row.components[Transform.id]
  if (transform === undefined) return undefined
  const look = row.components[Look.id]
  return {
    pose: { x: num(transform, 'x'), y: num(transform, 'y'), rotation: num(transform, 'rotation') },
    look:
      look === undefined ? undefined : { w: num(look, 'w'), h: num(look, 'h'), color: num(look, 'color') },
  }
}

function readJoint(row: RenderRow): JointEnds | undefined {
  const joint = row.components[Joint.id]
  if (joint === undefined) return undefined
  const [kind, a, b, ax, ay, bx, by] = ['kind', 'a', 'b', 'ax', 'ay', 'bx', 'by'].map((k) => num(joint, k))
  return {
    kind: kind as number,
    a: a as number,
    b: b as number,
    ax: ax as number,
    ay: ay as number,
    bx: bx as number,
    by: by as number,
  }
}

/** The pose of an entry between its last two steps; `t` is 0 to 1. */
function blend(e: Entry, t: number): Pose {
  return {
    x: e.prev.x + (e.curr.x - e.prev.x) * t,
    y: e.prev.y + (e.curr.y - e.prev.y) * t,
    rotation: e.prev.rotation + shortestTurn(e.prev.rotation, e.curr.rotation) * t,
  }
}

/** The place of a point held at (`ox`, `oy`) from a pose's centre, in the pose's own turn. */
function endOf(pose: Pose, ox: number, oy: number): { x: number; y: number } {
  const cos = Math.cos(pose.rotation)
  const sin = Math.sin(pose.rotation)
  return { x: pose.x + ox * cos - oy * sin, y: pose.y + ox * sin + oy * cos }
}

const blendOf = (alpha: number): number => (Number.isNaN(alpha) ? 1 : Math.min(1, Math.max(0, alpha)))

/**
 * The renderer's copy of the world: no Pixi, no page, so it can be tested alone. An entity appears at its pose on
 * the step it is added (it does not slide in from elsewhere), and one the sim stopped reporting rests where it was.
 */
export function createScene(): Scene {
  const entries = new Map<number, Entry>()
  const joints = new Map<number, JointEnds>()
  return {
    apply(delta) {
      if (delta.resync) {
        entries.clear()
        joints.clear()
      }
      // Whatever the delta does not mention has not moved: its last pose becomes both ends of the blend.
      for (const entry of entries.values()) entry.prev = entry.curr
      for (const sid of delta.removed) {
        entries.delete(sid)
        joints.delete(sid)
      }
      const take = (row: RenderRow, fresh: boolean): void => {
        const now = read(row)
        if (now === undefined) entries.delete(row.sid)
        else {
          const before = fresh ? undefined : entries.get(row.sid)
          entries.set(row.sid, { prev: before?.curr ?? now.pose, curr: now.pose, look: now.look })
        }
        const joint = readJoint(row)
        if (joint === undefined) joints.delete(row.sid)
        else joints.set(row.sid, joint)
      }
      for (const row of delta.added) take(row, true)
      for (const row of delta.changed) take(row, false)
    },
    views(alpha) {
      // NaN is "no blend": the newest pose.
      const t = blendOf(alpha)
      return [...entries.keys()]
        .sort((a, b) => a - b)
        .flatMap((sid) => {
          const e = entries.get(sid) as Entry
          if (e.look === undefined) return []
          return [{ sid, ...blend(e, t), w: e.look.w, h: e.look.h, color: e.look.color }]
        })
    },
    links(alpha) {
      const t = blendOf(alpha)
      return [...joints.keys()]
        .sort((a, b) => a - b)
        .flatMap((sid) => {
          const j = joints.get(sid) as JointEnds
          const thing = entries.get(j.a)
          const holder = entries.get(j.b)
          if (thing === undefined || holder === undefined) return []
          const from = endOf(blend(thing, t), j.ax, j.ay)
          const to = endOf(blend(holder, t), j.bx, j.by)
          return [
            {
              sid,
              kind: j.kind === 0 ? ('pin' as const) : ('rope' as const),
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
            },
          ]
        })
    },
  }
}
