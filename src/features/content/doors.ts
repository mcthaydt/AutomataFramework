// The doors of a game: every thing that holds a way into a level, by the value its character declares as `leads-to`.
// One place says what a door is, so `automata world`, the world's picture and any editor list the same doors.
import type { GameContent } from './load.ts'

/** One door: the thing it is, and the level (and, when it says, the thing beside which a hero comes in) it leads to. */
export interface Door {
  readonly from: { readonly level: string; readonly thing: string }
  readonly to: { readonly level: string; readonly thing?: string }
}

/** Every door of the game, level by level in name order and thing by thing as the level lists them. */
export function doorsOf(content: GameContent): readonly Door[] {
  const doors: Door[] = []
  for (const id of Object.keys(content.levels).sort()) {
    const level = content.levels[id]
    for (const thing of level?.things ?? []) {
      for (const value of content.characters[thing.character]?.values ?? []) {
        const held = value.type === 'leads-to' ? thing.values?.[value.id] : undefined
        if (typeof held !== 'object' || held === null || !('level' in held)) continue
        doors.push({
          from: { level: id, thing: thing.id },
          to: { level: held.level, ...(held.thing === undefined ? {} : { thing: held.thing }) },
        })
      }
    }
  }
  return doors
}
