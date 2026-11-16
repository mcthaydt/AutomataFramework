// A thing's values, read from game code (plan W). A character declares what its placed things may hold (a number, a
// switch, a link, a path, a door's way into a level) and each thing in a level file gives them; `valuesOf` reads them
// back for an entity in the sim, with the character's defaults filled in, so a game's own system needs no level file.
import {
  type GameContent,
  type LevelPoint,
  type ThingValue,
  type ValueDeclaration,
  withDefaults,
} from '../content/content.ts'
import type { SimContext } from '../sim/sim.ts'
import { Thing } from './components.ts'
import { thingIn, Where } from './where.ts'

/** What one thing holds, by the ids its character declares. A getter throws when the id is not declared with that type. */
export interface ThingValues {
  number(id: string): number
  switch(id: string): boolean
  choice(id: string): string
  words(id: string): string | undefined
  /** The linked things as entities' StableIds, in the order written; one that is gone is left out. */
  things(id: string): readonly number[]
  /** In the sim's own tiles: the level's offset is already added. */
  path(id: string): readonly LevelPoint[]
  leadsTo(id: string): { readonly level: string; readonly thing?: string | undefined } | undefined
}

/** "reach, speed", or "nothing". */
const named = (ids: readonly string[]): string => (ids.length === 0 ? 'nothing' : [...ids].sort().join(', '))

/**
 * The values of the thing `sid` in the sim, read through `ctx` (a system's or a test's). Throws a plain `Error` that
 * says what to fix for an entity that is not a thing of a level (a tile, a hero), and from a getter for a value its
 * character does not declare with that type. Needs the `where` plugin, which a game with any `values` has.
 */
export function valuesOf(ctx: SimContext, sid: number): ThingValues {
  const content = ctx.content as GameContent
  const where = ctx.resource(Where)
  const entity = ctx.entity(sid)
  const thing = entity?.has(Thing) === true ? entity.get(Thing) : undefined
  const at = thing === undefined ? undefined : thingIn(where, thing.id)
  const placed = at === undefined ? undefined : content.levels[at.level]?.things.find((t) => t.id === at.id)
  const character = thing === undefined ? undefined : content.characters[thing.character]
  if (at === undefined || placed === undefined || character === undefined)
    throw new Error('This entity is not a thing from a level.')
  const held = withDefaults(character, placed)
  const offset = where.levels.find((l) => l.level === at.level) ?? { x: 0, y: 0 }

  const declared = <T extends ValueDeclaration['type']>(
    id: string,
    type: T,
  ): Extract<ValueDeclaration, { type: T }> => {
    const found = (character.values ?? []).find((v) => v.id === id && v.type === type)
    if (found === undefined)
      throw new Error(
        `The character "${character.id}" has no ${type} called "${id}". It has: ${named((character.values ?? []).filter((v) => v.type === type).map((v) => v.id))}.`,
      )
    return found as Extract<ValueDeclaration, { type: T }>
  }
  const value = (id: string): ThingValue | undefined => held[id]

  return {
    number(id) {
      const found = declared(id, 'number')
      const v = value(id)
      return typeof v === 'number' ? v : found.default
    },
    switch(id) {
      const found = declared(id, 'switch')
      const v = value(id)
      return typeof v === 'boolean' ? v : found.default
    },
    choice(id) {
      const found = declared(id, 'choice')
      const v = value(id)
      return typeof v === 'string' ? v : found.default
    },
    words(id) {
      const found = declared(id, 'words')
      const v = value(id)
      return typeof v === 'string' ? v : found.default
    },
    things(id) {
      declared(id, 'thing')
      const v = value(id)
      const ids = typeof v === 'string' ? [v] : Array.isArray(v) ? (v as readonly string[]) : []
      const sids = new Map<string, number>()
      for (const e of ctx.query(Thing)) sids.set(e.get(Thing).id, e.sid)
      const found: number[] = []
      for (const linked of ids) {
        const sidOf = sids.get(where.prefixed ? `${at.level}.${linked}` : linked)
        if (sidOf !== undefined) found.push(sidOf)
      }
      return found
    },
    path(id) {
      declared(id, 'path')
      const v = value(id)
      if (!Array.isArray(v)) return []
      return (v as readonly LevelPoint[]).map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }))
    },
    leadsTo(id) {
      declared(id, 'leads-to')
      const v = value(id)
      return typeof v === 'object' && v !== null && !Array.isArray(v)
        ? (v as { readonly level: string; readonly thing?: string | undefined })
        : undefined
    },
  }
}
