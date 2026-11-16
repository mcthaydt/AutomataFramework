// Which door a hero went through (plan W, task 11). A door is a thing whose character declares a `leads-to` value and
// whose level file fills it in. The flow and the test game's page both ask here, so there is one reading of a door.

import type { GameContent } from '../content/content.ts'
import type { SimEvent } from '../sim/sim.ts'
import { levelsOf } from './place.ts'
import type { Touch } from './touch.ts'
import { thingIn } from './where.ts'

/** Where a door leads, and the door it was: `level` and `thing` are the way in, `through` is what was touched. */
export interface Way {
  /** The level to open. */
  readonly level: string
  /** The thing in it to come out beside, when the door says. */
  readonly thing?: string
  /** The door that was touched, as the files name it. */
  readonly through: { readonly level: string; readonly thing: string }
}

const isTouch = (payload: unknown): payload is Touch =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as Touch).thing === 'string' &&
  typeof (payload as Touch).player === 'number'

/**
 * The first `<kind>.touched` event of the step, in order, raised by a hero on a thing that has a `leads-to` value; or
 * `undefined` when there is none. `opened` is the level the sim was opened at: in a place the touched thing's id has
 * its level in front (`room-3.back`), and the files name the door without it, so both are read here.
 */
export function doorTaken(
  content: GameContent,
  opened: string,
  events: readonly SimEvent[],
): Way | undefined {
  const levels = levelsOf(content, opened)
  const where = { levels, prefixed: levels.length > 1 }
  for (const event of events) {
    if (!event.type.endsWith('.touched') || !isTouch(event.payload) || event.payload.player < 1) continue
    const found = thingIn(where, event.payload.thing)
    const thing =
      found === undefined ? undefined : content.levels[found.level]?.things.find((t) => t.id === found.id)
    if (found === undefined || thing === undefined) continue
    for (const value of content.characters[thing.character]?.values ?? []) {
      if (value.type !== 'leads-to') continue
      const held = thing.values?.[value.id]
      if (typeof held !== 'object' || held === null || !('level' in held)) continue
      return {
        level: held.level,
        ...(held.thing === undefined ? {} : { thing: held.thing }),
        through: { level: found.level, thing: found.id },
      }
    }
  }
  return undefined
}
