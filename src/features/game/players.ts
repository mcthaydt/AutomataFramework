// Who is playing a running game, and how people come and go. A new player is a `join` command in the next step, and a
// leaving one a `leave` command, so a replay records both; this file only decides whether the answer is yes, and keeps
// the input told who is in. The sim decides everything else.
import { MAX_PLAYERS, type Sequence } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import type { Claim, Input } from '../input/input.ts'
import { joinCommand, leaveCommand, playersIn } from '../level/level.ts'
import type { Command, Sim } from '../sim/sim.ts'

/** The answer to `addPlayer`: the new player's number, or why not, in words for the person. */
export type JoinAnswer =
  | { readonly ok: true; readonly player: number }
  | {
      readonly ok: false
      readonly reason: 'one-player-game' | 'full' | 'no-start' | 'taken' | 'no-shared'
      readonly message: string
    }

/** The people in a running game. */
export interface Players {
  /** Who is playing, lowest number first. */
  players(): readonly number[]
  addPlayer(claim: Claim): JoinAnswer
  /** False, and nothing happens, for the last player or one who is not playing. */
  removePlayer(player: number): boolean
  /** The `join` and `leave` commands for this tick, in the order they were asked for. */
  commands(tick: number): Command[]
  /** Call after each step: tells the input when somebody came or went. */
  afterStep(): void
}

export function createPlayers(options: {
  readonly sim: Sim
  readonly content: GameContent
  readonly level: string
  readonly input: Input
  readonly sequence: Sequence
  /** Whether the controls have keys for two people on one keyboard. */
  readonly canShare: boolean
}): Players {
  const { sim, content, input, sequence } = options
  const most = Math.min(content.project.players ?? 1, MAX_PLAYERS)
  const starts = content.levels[options.level]?.starts.map((start) => start.player) ?? []
  // Asked for, and not yet in the sim: joins that will be sent next step, and leaves.
  const asked: { readonly join: boolean; readonly player: number }[] = []
  const claimed = new Map<number, Claim>()
  let known: readonly number[] = playersIn(sim)

  /** Who is in once everything asked for has happened. */
  const eventually = (): number[] => {
    const now = new Set(playersIn(sim))
    for (const { join, player } of asked) {
      if (join) now.add(player)
      else now.delete(player)
    }
    return [...now].sort((a, b) => a - b)
  }

  return {
    players: () => playersIn(sim),
    addPlayer(claim) {
      if (most < 2) return { ok: false, reason: 'one-player-game', message: 'This game is for one player.' }
      const inside = new Set(eventually())
      // A number is free once its hero is gone, not just once a `leave` for it is queued: a `join` for a number whose
      // hero is still there in the same step is ignored, and the person would be told yes and never arrive.
      const there = new Set(playersIn(sim))
      const free = Array.from({ length: most }, (_, i) => i + 1).filter(
        (n) => !inside.has(n) && !there.has(n),
      )
      if (free.length === 0)
        return {
          ok: false,
          reason: 'full',
          message: `Everyone is in. This game has room for ${most} players.`,
        }
      const player = free.find((n) => starts.includes(n))
      if (player === undefined)
        return {
          ok: false,
          reason: 'no-start',
          message: `This level has room for ${starts.length === 1 ? 'one player' : `${starts.length} players`}.`,
        }
      // Taken by a joiner whose `join` is still queued, or by anyone the input says holds it, whoever gave it to them
      // (`addPlayer`, or `game.input.claim` for a game started with several players).
      const device = claim === 'keyboard' ? 'keyboard-2' : claim
      const taken =
        [...claimed.entries()].some(([who, one]) => inside.has(who) && one === claim) ||
        input
          .seats()
          .slice(1)
          .some((seat) => inside.has(seat.player) && seat.devices.includes(device))
      if (taken)
        return {
          ok: false,
          reason: 'taken',
          message:
            claim === 'keyboard' ? 'The keyboard is already shared.' : 'That gamepad already has a player.',
        }
      if (claim === 'keyboard' && !options.canShare)
        return {
          ok: false,
          reason: 'no-shared',
          message: "This game's keys cannot be shared. Join with a gamepad.",
        }
      claimed.set(player, claim)
      input.claim(player, claim)
      asked.push({ join: true, player })
      return { ok: true, player }
    },
    removePlayer(player) {
      const inside = eventually()
      if (!inside.includes(player) || inside.length <= 1) return false
      asked.push({ join: false, player })
      return true
    },
    commands(tick) {
      return asked
        .splice(0)
        .map(({ join, player }) => (join ? joinCommand : leaveCommand)(tick, player, sequence.next(player)))
    },
    afterStep() {
      const now = playersIn(sim)
      if (now.join() === known.join()) return
      known = now
      for (const player of [...claimed.keys()]) if (!now.includes(player)) claimed.delete(player)
      input.setPlayers(now)
    },
  }
}
