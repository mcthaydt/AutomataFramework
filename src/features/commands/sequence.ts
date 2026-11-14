// The number each command carries, per player. The sim refuses two commands with the same source and seq in one
// step, and a room refuses a seq that does not go up, so whoever makes a player's commands (the input for `controls`,
// the game for `join` and `leave`) counts them in one place.

/** One counter per player. */
export interface Sequence {
  /** The next command number for this player: 0, then 1, and so on. */
  next(source: number): number
}

/** A sequence in which every player counts from 0. */
export function createSequence(): Sequence {
  const counts = new Map<number, number>()
  return {
    next(source) {
      const n = counts.get(source) ?? 0
      counts.set(source, n + 1)
      return n
    },
  }
}
