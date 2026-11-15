// The progress a game keeps when its code names no save of its own: the level reached, in three places a player sees
// as "Game 1" to "Game 3". Pure over the saves feature: reading and writing the places is the flow's, not this file's.
import type { Words } from '../../lib/message.ts'
import { z } from '../../lib/zod.ts'
import { Id } from '../content/content.ts'
import { fitLabel, levelName } from '../locale/locale.ts'
import { defineSave, latestSlot, type SaveDef, type SlotState } from '../saves/saves.ts'

/** What every game's save holds at least: the furthest level the player has reached. */
export interface Progress {
  readonly level: string
}

/** How many places a game gets when it names no save of its own. */
const PLACES = 3

/** The save a game gets when it names none: the level reached, in three places. */
export function progressDef(game: string): SaveDef<Progress> {
  return defineSave({
    game,
    version: 1,
    schema: z.strictObject({ level: Id }),
    slots: PLACES,
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
