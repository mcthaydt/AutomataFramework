// Players joining and leaving a running game. Both are commands, so a replay records who came when and a room on
// another machine can send the same two. Only a game that says `players = 2` or more gets the plugin: the sim's schema
// hash covers every command and system, so adding these to every game would move every recorded hash.
import { z } from '../../lib/zod.ts'
import { MAX_PLAYERS, Player } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import {
  type Command,
  type CommandDef,
  defineCommand,
  definePlugin,
  defineSystem,
  type PluginDef,
  type Sim,
} from '../sim/sim.ts'
import { heroParts } from './hero.ts'

const emptyPayload: z.ZodObject<Record<string, never>, z.core.$strict> = z.strictObject({})

/** A new player joins: their hero appears at their start point. The command's source is the player's number. */
export const JoinCommand: CommandDef<typeof emptyPayload> = defineCommand('join', emptyPayload)
/** A player leaves: their hero goes at the end of the tick. */
export const LeaveCommand: CommandDef<typeof emptyPayload> = defineCommand('leave', emptyPayload)

/** The command for `player` (1 to MAX_PLAYERS) to join at `tick`; `seq` goes up by one per command that player sends. */
export function joinCommand(tick: number, player: number, seq: number): Command {
  return { tick, source: player, seq, type: JoinCommand.id, payload: {} }
}

/** The command for `player` to leave at `tick`. */
export function leaveCommand(tick: number, player: number, seq: number): Command {
  return { tick, source: player, seq, type: LeaveCommand.id, payload: {} }
}

/** Player numbers with a hero in the sim, ascending. */
export function playersIn(sim: Sim): number[] {
  return sim
    .query(Player)
    .map((e) => e.get(Player).number)
    .sort((a, b) => a - b)
}

/**
 * The plugin a co-op game gets: name 'join', depends on 'level', config `{ level, max }`. Its system runs in the
 * input phase before `commands.controls`, so a player's first `controls` command may arrive in the tick they join.
 */
export function joinPlugin(options: { readonly level: string; readonly max: number }): PluginDef {
  const { level, max } = options
  const system = defineSystem({
    name: 'level.join',
    phase: 'input',
    before: ['commands.controls'],
    run(ctx) {
      // `ctx.commands.of` gives one type at a time, so the two are merged and put in the order they were sent.
      const asked = [
        ...ctx.commands.of(JoinCommand).map((c) => ({ ...c, join: true })),
        ...ctx.commands.of(LeaveCommand).map((c) => ({ ...c, join: false })),
      ].sort((a, b) => a.source - b.source || a.seq - b.seq)
      if (asked.length === 0) return
      // Who has a hero now, and which entity it is. A hero leaving this tick still counts until the tick's end.
      const heroes = new Map<number, number>()
      for (const e of ctx.query(Player)) heroes.set(e.get(Player).number, e.sid)
      const leaving = new Set<number>()
      for (const { source, join } of asked) {
        if (!join) {
          const sid = heroes.get(source)
          if (sid !== undefined && !leaving.has(source)) {
            leaving.add(source)
            ctx.despawn(sid)
          }
        } else if (source >= 1 && source <= Math.min(max, MAX_PLAYERS) && !heroes.has(source)) {
          const parts = heroParts(ctx.content as GameContent, level, source)
          if (parts !== undefined) heroes.set(source, ctx.spawn(...parts))
        }
      }
    },
  })
  return definePlugin({
    name: 'join',
    dependsOn: ['level'],
    config: { level, max },
    commands: [JoinCommand, LeaveCommand],
    systems: [system],
  })
}
