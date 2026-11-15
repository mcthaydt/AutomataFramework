// Who is playing, kept across levels. Player 1 is there from the start and holds everything nobody else brought; each
// other player joins with the device they bring (the second half of the keyboard, or a gamepad) and takes the lowest
// free number. Pure: the page asks it, and the page starts each level with what it answers.
import type { Claim } from '../input/input.ts'

/** One player in the party. Player 1 has no claim: they hold what nobody else brought. */
export interface Member {
  readonly player: number
  readonly claim: Claim | undefined
}

/** The people playing now, 1 to `room` of them. */
export interface Party {
  /** Everyone playing, lowest number first. */
  members(): readonly Member[]
  /** Adds the lowest free number with `claim`. `undefined`, and nothing changes, when full or the claim is taken. */
  join(claim: Claim): number | undefined
  /** Takes `player` out, giving their number back. Never player 1, and never someone who is not there. */
  leave(player: number): boolean
  /** The most who can play at once: `project.players`, or 1 for a game for one player. */
  readonly room: number
}

/** A party of one, in a game that has room for `room` players. */
export function createParty(room: number): Party {
  const claims = new Map<number, Claim | undefined>([[1, undefined]])
  return {
    room,
    members: () =>
      [...claims.keys()].sort((a, b) => a - b).map((player) => ({ player, claim: claims.get(player) })),
    join(claim) {
      if ([...claims.values()].includes(claim)) return undefined
      for (let player = 2; player <= room; player++) {
        if (claims.has(player)) continue
        claims.set(player, claim)
        return player
      }
      return undefined
    },
    leave: (player) => player !== 1 && claims.delete(player),
  }
}
