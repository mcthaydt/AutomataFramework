// Which level a hero is in (plan W, task 9). A place of two or more levels is one world, but the game around it, such as
// the sky, the level's name and the way a door leads on, belongs to a level. So each hero carries the level it is in, and
// the sim says each time one passes into another, once.
import { z } from '../../lib/zod.ts'
import { Player } from '../commands/commands.ts'
import { Transform } from '../physics/physics.ts'
import {
  type ComponentDef,
  defineComponent,
  defineEvent,
  definePlugin,
  defineSystem,
  type EventDef,
  type PluginDef,
  type Sim,
} from '../sim/sim.ts'
import { levelAt } from './place.ts'
import { Where } from './where.ts'

const inFields = { level: 'string' } as const
/** On every hero, only in a place of two or more levels: the level it is in. Not drawn. */
export const In: ComponentDef<typeof inFields> = defineComponent('level.in', inFields, { render: false })

/** What `level.entered` says: who went where, in the entered level's own tiles. */
export interface Entered {
  readonly level: string
  readonly from: string
  readonly player: number
  readonly sid: number
  readonly x: number
  readonly y: number
}

const enteredPayload: z.ZodType<Entered> = z.strictObject({
  level: z.string(),
  from: z.string(),
  player: z.number().int(),
  sid: z.number().int(),
  x: z.number(),
  y: z.number(),
})

/**
 * Raised each time a hero's middle passes into another level of the place: never at spawn, never while in no level.
 * `x` and `y` are in the entered level's own tiles.
 */
export const LevelEntered: EventDef<z.ZodType<Entered>> = defineEvent('level.entered', enteredPayload)

/**
 * The plugin a place of two or more levels gets: name `place`, depends on `level` and `where`. Its system runs after
 * physics has moved the heroes, and moves each hero's `In` to the level its middle is in. A hero in no level's box (in the
 * air beyond the outline) keeps the level it was last in.
 */
export function placePlugin(): PluginDef {
  const system = defineSystem({
    name: 'level.where',
    phase: 'postPhysics',
    after: ['physics.sync-out'],
    run(ctx) {
      const { levels } = ctx.resource(Where)
      const heroes = ctx
        .query(Player, In, Transform)
        .sort((a, b) => a.get(Player).number - b.get(Player).number)
      for (const hero of heroes) {
        const at = hero.get(Transform)
        const now = levelAt(levels, at.x, at.y)
        const was = hero.get(In).level
        if (now === undefined || now === was) continue
        const box = levels.find((l) => l.level === now)
        hero.set(In, { level: now })
        ctx.emit(LevelEntered, {
          level: now,
          from: was,
          player: hero.get(Player).number,
          sid: hero.sid,
          x: at.x - (box?.x ?? 0),
          y: at.y - (box?.y ?? 0),
        })
      }
    },
  })
  return definePlugin({
    name: 'place',
    dependsOn: ['level', 'where'],
    components: [In],
    events: [LevelEntered],
    systems: [system],
  })
}

/** The level the sim holds when it holds one, once its first tick has run: `Where` is empty before, and absent without it. */
function onlyLevel(sim: Sim): string | undefined {
  try {
    return sim.resource(Where).levels[0]?.level
  } catch {
    return undefined
  }
}

/**
 * The level each hero is in, lowest player first. In a place that is its `In`; in a sim of one level, that level: the
 * sim's own `Where` says so once it has stepped, and `opened` (the level the sim was opened at) when it has no `Where` or
 * has not. A hero whose level cannot be told is left out.
 */
export function heroLevels(
  sim: Sim,
  opened?: string,
): readonly { readonly player: number; readonly level: string }[] {
  const only = onlyLevel(sim) ?? opened
  return sim
    .query(Player)
    .map((e) => ({ player: e.get(Player).number, level: e.has(In) ? e.get(In).level : only }))
    .filter((h): h is { player: number; level: string } => h.level !== undefined)
    .sort((a, b) => a.player - b.player)
}
