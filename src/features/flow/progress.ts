// The progress a game keeps when its code names no save of its own: the level reached, in three places a player sees
// as "Game 1" to "Game 3". Pure over the saves feature: reading and writing the places is the flow's, not this file's.
import type { Words } from '../../lib/message.ts'
import { z } from '../../lib/zod.ts'
import { Id } from '../content/content.ts'
import type { Arrive } from '../level/level.ts'
import { fitLabel, levelName } from '../locale/locale.ts'
import { defineSave, latestSlot, type SaveDef, type SlotState } from '../saves/saves.ts'

/** Where the player was last, and how they came into that level: through a door (`thing`) or an edge (`x`, `y`). */
export interface Last {
  readonly level: string
  readonly thing?: string
  readonly x?: number
  readonly y?: number
}

/** What every game's save holds at least: the furthest level the player has reached. */
export interface Progress {
  readonly level: string
  /** The level the player was last in and where they came into it. Written only by a door or an edge. */
  readonly last?: Last
  /** What was done for good, sorted, each once. Written only when a `stays` switch is used. */
  readonly facts?: readonly string[]
}

const lastSchema: z.ZodType<Last> = z.strictObject({
  level: Id,
  thing: Id.optional(),
  x: z.number().optional(),
  y: z.number().optional(),
}) as z.ZodType<Last>
const factsSchema: z.ZodType<readonly string[]> = z.array(z.string().max(200)).max(1024)

/**
 * The two optional fields of `Progress` as Zod shapes, for a game whose own save has doors: put them beside `level` in
 * the save's schema and the flow keeps where the player is and what was done for good.
 */
export const progressFields: { readonly last: z.ZodType<Last | undefined>; readonly facts: z.ZodType } = {
  last: lastSchema.optional(),
  facts: factsSchema.optional(),
}

/** How many places a game gets when it names no save of its own. */
const PLACES = 3

/** The save a game gets when it names none: the level reached, in three places. */
export function progressDef(game: string): SaveDef<Progress> {
  return defineSave({
    game,
    version: 2,
    schema: z.strictObject({ level: Id, ...progressFields }) as unknown as z.ZodType<Progress>,
    slots: PLACES,
    // Version 2 only adds two optional fields, so a version 1 save reads as it is.
    upgrades: { 1: (data) => data },
  })
}

/** A save the flow can keep: how it is stored, and what a game that has just begun `level` holds. */
export interface FlowSave<S extends Progress> {
  readonly def: SaveDef<S>
  fresh(level: string): S
}

/** The flow's own save, for a game that names none. */
export function defaultSave(game: string): FlowSave<Progress> {
  return { def: progressDef(game), fresh: (level) => ({ level }) }
}

/** The ready place saved last, or `undefined`: what "Continue" opens. */
export function newest(slots: readonly SlotState[]): number | undefined {
  return latestSlot(slots)
}

/** The lowest place with nothing in it, or `undefined` when every place holds something: where "New game" writes. */
export function firstEmpty(slots: readonly SlotState[]): number | undefined {
  return slots.find((state) => state.kind === 'empty')?.slot
}

/**
 * `data` with `level` as the one reached. The very same object when `level` is not further along `order` than the
 * save already is, or is not in it: progress never goes back. A save at a level the game no longer has counts as
 * being at the first level.
 */
export function reached<S extends Progress>(data: S, level: string, order: readonly string[]): S {
  const to = order.indexOf(level)
  if (to < 0) return data
  const from = Math.max(order.indexOf(data.level), 0)
  return to > from ? { ...data, level } : data
}

/** A save's label: the level's name in the player's language, cut to fit what a save takes. */
export function progressLabel(words: Words, level: string): string {
  return fitLabel(levelName(words, level))
}

/** `data` with the way the player came into `last.level`. The very same object when that is already so. */
export function cameIn<S extends Progress>(data: S, last: Last): S {
  const was = data.last
  const same =
    was !== undefined &&
    was.level === last.level &&
    was.thing === last.thing &&
    was.x === last.x &&
    was.y === last.y
  return same ? data : { ...data, last }
}

/** `data` with `fact` among what was done for good: sorted, each once. The very same object when it is already there. */
export function remembered<S extends Progress>(data: S, fact: string): S {
  const known = data.facts ?? []
  return known.includes(fact) ? data : { ...data, facts: [...known, fact].sort() }
}

/**
 * Where Continue opens: the level the player was last in, with where they came into it, when the game still has that
 * level; else the level reached, when the game still has it; else the project's start.
 */
export function continueAt(
  data: Progress,
  levels: readonly string[],
  start: string,
): { readonly level: string; readonly arrive?: Arrive } {
  const last = data.last
  if (last !== undefined && levels.includes(last.level)) {
    if (last.thing !== undefined) return { level: last.level, arrive: { thing: last.thing } }
    if (last.x !== undefined && last.y !== undefined)
      return { level: last.level, arrive: { x: last.x, y: last.y } }
    return { level: last.level }
  }
  return { level: levels.includes(data.level) ? data.level : start }
}
