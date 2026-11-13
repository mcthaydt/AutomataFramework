// Players and the `controls` command. A game never reads a keyboard or a finger: input becomes one `controls` command
// per change, saying everything the player is holding down, and the sim keeps it on that player's entity. That one
// command is also all a replay has to record, and all a second player on another machine would send.
import { z } from 'zod'
import {
  type Command,
  type CommandDef,
  type ComponentDef,
  defineCommand,
  defineComponent,
  definePlugin,
  defineSystem,
  type EntityRef,
  type PluginDef,
} from '../sim/sim.ts'

/** Player numbers are 1 to this, and a player's number is the `source` of the commands they send. */
export const MAX_PLAYERS = 4

/** An action is a lower-case word, or words joined by dashes: `jump`, `fire-left`. */
const ActionName = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

const playerFields = { number: 'u32', held: 'string', pressed: 'string' } as const
/**
 * On each entity a player controls. `held` and `pressed` are action names, sorted and joined with ',': what the player
 * is holding now, and what went from up to down this tick. Not drawn.
 */
export const Player: ComponentDef<typeof playerFields> = defineComponent('player', playerFields, {
  render: false,
})

const controlsPayload: z.ZodObject<{ held: z.ZodArray<z.ZodString> }, z.core.$strict> = z.strictObject({
  held: z.array(ActionName).max(16),
})
/** Everything the player is holding down this tick. Sent only when it changes. */
export const ControlsCommand: CommandDef<typeof controlsPayload> = defineCommand('controls', controlsPayload)

/** The command for `player` (1 to MAX_PLAYERS) at `tick`; `seq` goes up by one per command that player sends. */
export function controlsCommand(tick: number, player: number, seq: number, held: readonly string[]): Command {
  return { tick, source: player, seq, type: ControlsCommand.id, payload: { held: [...held] } }
}

const split = (list: string): string[] => (list === '' ? [] : list.split(','))

/** True while the player is holding the action. */
export function isHeld(player: EntityRef, action: string): boolean {
  return split(player.get(Player).held).includes(action)
}

/** True only on the tick the action went from up to down. */
export function wasPressed(player: EntityRef, action: string): boolean {
  return split(player.get(Player).pressed).includes(action)
}

// Runs first in the tick, so game systems see this tick's controls.
const controlsSystem = defineSystem({
  name: 'commands.controls',
  phase: 'input',
  run(ctx) {
    const players = ctx.query(Player)
    // `pressed` lasts one tick, so last tick's is cleared first.
    for (const e of players) if (e.get(Player).pressed !== '') e.set(Player, { pressed: '' })
    // The sim hands commands over sorted by source, then seq, so when a player sent two in one tick the later one,
    // the higher seq, overwrites the earlier.
    const latest = new Map<number, readonly string[]>()
    for (const c of ctx.commands.of(ControlsCommand)) latest.set(c.source, c.payload.held)
    for (const [source, actions] of latest) {
      // A source that is not a player in this level (0, above MAX_PLAYERS, or simply absent) is ignored.
      const entity =
        source >= 1 && source <= MAX_PLAYERS
          ? players.find((e) => e.get(Player).number === source)
          : undefined
      if (entity === undefined) continue
      const before = split(entity.get(Player).held)
      const now = [...new Set(actions)].sort()
      entity.set(Player, {
        held: now.join(','),
        pressed: now.filter((a) => !before.includes(a)).join(','),
      })
    }
  },
})

/** The plugin a game with players adds: the `player` component, the `controls` command and the system that applies it. */
export const commandsPlugin: PluginDef = definePlugin({
  name: 'commands',
  components: [Player],
  commands: [ControlsCommand],
  systems: [controlsSystem],
})
