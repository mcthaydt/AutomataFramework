// The last seconds of a play, kept so the game can go back through them. A snapshot is taken once a second, on the
// tick before the second's last step (ticks 59, 119, 179 ... at 60 Hz), and the tick 0 one at the start. Going to a
// tick restores the nearest snapshot before it and plays the recorded commands forward, so there is always at least
// one step, and a step is what gives the renderer the whole picture. Time is whatever `note` is told, never a clock.
import type { Sim } from '../sim/sim.ts'

/** One kept moment: the state `bytes` is the sim's at the start of tick `tick`. */
export interface KeptSnapshot {
  readonly tick: number
  readonly bytes: Uint8Array
}

export interface Kept {
  /** Told the tick the sim is at, at the start of the play and after each step; takes a snapshot when it is due. */
  note(tick: number): void
  /** The newest snapshot taken before `tick` (never at it), or `undefined` when there is none. */
  nearest(tick: number): KeptSnapshot | undefined
  /** The oldest tick that can be gone back to: one past the oldest snapshot. */
  from(): number
  /** Forgets the snapshots taken after `tick`. */
  cutTo(tick: number): void
}

/** Keeps the newest `seconds + 1` snapshots, so `seconds` of play can be gone back through. */
export function createKept(sim: Sim, seconds: number): Kept {
  const slots: KeptSnapshot[] = []
  const keep = seconds + 1
  return {
    note(tick) {
      const due = tick === 0 || (tick + 1) % sim.tickHz === 0
      if (!due || slots[slots.length - 1]?.tick === tick) return
      slots.push({ tick, bytes: sim.snapshot() })
      while (slots.length > keep) slots.shift()
    },
    nearest(tick) {
      for (let i = slots.length - 1; i >= 0; i--) {
        const slot = slots[i] as KeptSnapshot
        if (slot.tick < tick) return slot
      }
      return undefined
    },
    from: () => (slots[0]?.tick ?? sim.tick) + 1,
    cutTo(tick) {
      while (slots.length > 0 && (slots[slots.length - 1] as KeptSnapshot).tick > tick) slots.pop()
    },
  }
}
