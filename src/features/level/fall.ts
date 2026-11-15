// A hero that falls out of the level says so, once. Plan Q gives a game a way to lose: `lost = "hero.fell"` in
// automata.toml. The event is a plugin of its own, joined only to a game that names it (see `usesFalls`), because an
// event added to the built-in hero's plugin would change the schema hash of every game with such a hero and move
// every recording. A hero is any thing with `Player` and a `Body`, whether the framework moves it or the game's own
// rules do, so the plugin depends on physics and commands and never on the moves plugin.
import { z } from '../../lib/zod.ts'
import { Player } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import { Body, Transform } from '../physics/physics.ts'
import {
  type ComponentDef,
  defineComponent,
  defineEvent,
  definePlugin,
  defineSystem,
  type EventDef,
  type PluginDef,
} from '../sim/sim.ts'
import { worldSize } from './tile-runs.ts'

/** What `hero.fell` says: whose hero it was and which entity, as a move event does. */
const fellPayload: z.ZodType<{ readonly player: number; readonly sid: number }> = z.object({
  player: z.number().int(),
  sid: z.number().int(),
})

/** The event a fallen hero raises: `hero.fell`, with the player's number and the hero's id. */
export const fellEvent: EventDef<typeof fellPayload> = defineEvent('hero.fell', fellPayload)

/** How far below the lowest row a hero's center must be to have fallen, in tiles. */
export const FALL_DEPTH = 2

const fallenFields = { fell: 'bool' } as const
/**
 * On a hero that has fallen, so it is said once for each hero, and a snapshot of a fallen hero restored into a new sim
 * does not say it again. Not drawn.
 */
export const Fallen: ComponentDef<typeof fallenFields> = defineComponent('level.fallen', fallenFields, {
  render: false,
})

/** How many tile rows the level has: its own `tiles`, or its scene's ground rows. 0 for a level the game lacks. */
export function levelBottom(content: GameContent, level: string): number {
  const found = content.levels[level]
  return found === undefined ? 0 : worldSize(content, found).h
}

/**
 * Says `hero.fell` once for each hero whose center is below `bottom + FALL_DEPTH`. A hero is any thing with `Player`
 * and a `Body`: it needs `physics` and `commands`, and never the moves plugin. In a game for several players the
 * first hero to fall loses the level for all; a game that wants another rule raises its own event and names that.
 */
export function fallPlugin(options: { readonly bottom: number }): PluginDef {
  const limit = options.bottom + FALL_DEPTH
  const fall = defineSystem({
    name: 'level.fall',
    phase: 'gameplay',
    run(ctx) {
      for (const hero of ctx.query(Player, Body, Transform)) {
        if (hero.has(Fallen) || hero.get(Transform).y <= limit) continue
        hero.add(Fallen, { fell: true })
        ctx.emit(fellEvent, { player: hero.get(Player).number, sid: hero.sid })
      }
    },
  })
  return definePlugin({
    name: 'fall',
    dependsOn: ['physics', 'commands'],
    components: [Fallen],
    events: [fellEvent],
    systems: [fall],
  })
}
