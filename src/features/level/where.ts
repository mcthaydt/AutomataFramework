// Which levels a sim holds and where (plan W). A sim holds one level, or every level of a place joined by edges, laid out
// in one set of tiles. Everything that reads a thing's values, finds a thing from a level's file or says which level
// something is in asks here. The resource is filled on the first tick and never changes after.
import { z } from '../../lib/zod.ts'
import { definePlugin, defineResource, defineSystem, type PluginDef, type ResourceDef } from '../sim/sim.ts'

/** One level of a sim: where its top left corner is in the sim's tiles, and its size, in whole tiles. */
export interface SimLevel {
  readonly level: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** What the resource holds: every level of the sim as plain numbers, so it snapshots and hashes like any state. */
interface WhereValue {
  levels: { level: string; x: number; y: number; w: number; h: number }[]
  prefixed: boolean
}

const whereSchema: z.ZodType<WhereValue> = z.strictObject({
  levels: z.array(
    z.strictObject({ level: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  ),
  prefixed: z.boolean(),
})

/**
 * Which levels this sim holds and where, and whether a thing's id has its level in front (`room-2.crate-1`; only when
 * the sim holds two or more levels). Empty until the `where` plugin's first tick; never changes after tick 0.
 */
export const Where: ResourceDef<z.ZodType<WhereValue>> = defineResource('level.where', whereSchema, () => ({
  levels: [],
  prefixed: false,
}))

/**
 * The plugin that fills `Where`: name `where`, depends on `level`, config `{ levels }` (so it is part of the schema hash,
 * and a snapshot never restores into a sim holding other levels). A resource's start cannot see a plugin's config, so a
 * system in the first phase copies the levels in on the first tick.
 */
export function wherePlugin(levels: readonly SimLevel[]): PluginDef {
  const fill = defineSystem({
    name: 'where.fill',
    phase: 'input',
    run(ctx) {
      const where = ctx.resource(Where)
      if (where.levels.length > 0 || levels.length === 0) return
      where.levels.push(...levels.map((l) => ({ level: l.level, x: l.x, y: l.y, w: l.w, h: l.h })))
      where.prefixed = levels.length > 1
    },
  })
  return definePlugin({
    name: 'where',
    dependsOn: ['level'],
    config: { levels },
    resources: [Where],
    systems: [fill],
  })
}

/**
 * The level and the file id of a thing: `room-2.crate-1` gives `{ level: 'room-2', id: 'crate-1' }`; in a sim of one
 * level the id is the file's own and the level is that one. Undefined for a hero (`player-1`), which no level file
 * places, and for a sim that holds no level yet.
 */
export function thingIn(
  where: { readonly levels: readonly SimLevel[]; readonly prefixed: boolean },
  thingId: string,
): { readonly level: string; readonly id: string } | undefined {
  if (/^player-\d+$/.test(thingId)) return undefined
  if (!where.prefixed) {
    const only = where.levels[0]
    return only === undefined ? undefined : { level: only.level, id: thingId }
  }
  const dot = thingId.indexOf('.')
  if (dot < 0) return undefined
  const level = thingId.slice(0, dot)
  return where.levels.some((l) => l.level === level) ? { level, id: thingId.slice(dot + 1) } : undefined
}
