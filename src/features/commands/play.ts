// Playing a replay: run its commands on a fresh sim and read the hashes. `playReplay` only runs and reports, so the
// same text can be played in Node and in every browser and the engines compared with each other. `verifyReplay` is the
// strict check, "nothing changed since this was recorded".
import type { Command, Sim } from '../sim/sim.ts'
import type { Replay, ReplayCheck } from './replay.ts'

export interface Played {
  readonly finalHash: string
  /** The hash after each tick the replay has a check for. */
  readonly checks: readonly ReplayCheck[]
}

/** Runs the replay's commands on `sim` (which must be at tick 0) and reports the hashes. Compares nothing. */
export function playReplay(sim: Sim, replay: Replay): Played {
  if (sim.tick !== 0)
    throw new Error(`A replay is played on a sim at tick 0, but this one is at tick ${sim.tick}.`)
  const checkTicks = new Set(replay.checks.map((c) => c.tick))
  const checks: ReplayCheck[] = []
  let next = 0
  for (let i = 0; i < replay.ticks; i++) {
    const now: Command[] = []
    while (next < replay.commands.length && (replay.commands[next]?.tick ?? 0) === sim.tick) {
      now.push(replay.commands[next] as Command)
      next++
    }
    sim.step(now)
    if (checkTicks.has(sim.tick) && sim.tick < replay.ticks) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  return { finalHash: sim.hash(), checks }
}

export type Verdict =
  | { readonly ok: true }
  /** The seed, the tick rate or the sim's starting point is not the one the replay was recorded with. */
  | { readonly ok: false; readonly reason: 'wrong-setup'; readonly detail: string }
  | {
      readonly ok: false
      readonly reason: 'content-changed'
      readonly expected: string
      readonly actual: string
    }
  | {
      readonly ok: false
      readonly reason: 'diverged'
      readonly tick: number
      readonly expected: string
      readonly actual: string
    }

/**
 * Plays the replay on `sim` (a fresh one, at tick 0) and says whether it ends where it was recorded: the setup is
 * checked first, then the content, then each check hash in order, then the final hash, and the first thing that differs
 * is the answer. The content hash covers the whole of the game's content, project name included, so renaming the game
 * counts as changed content.
 */
export function verifyReplay(sim: Sim, replay: Replay): Verdict {
  if (sim.tick !== 0)
    return { ok: false, reason: 'wrong-setup', detail: `the sim is at tick ${sim.tick}, not tick 0` }
  if (sim.seed !== replay.seed) {
    return {
      ok: false,
      reason: 'wrong-setup',
      detail: `the sim's seed is ${sim.seed}, the replay's is ${replay.seed}`,
    }
  }
  if (sim.tickHz !== replay.tickHz) {
    return {
      ok: false,
      reason: 'wrong-setup',
      detail: `the sim runs at ${sim.tickHz} Hz, the replay at ${replay.tickHz} Hz`,
    }
  }
  if (sim.contentHash !== replay.contentHash) {
    return { ok: false, reason: 'content-changed', expected: replay.contentHash, actual: sim.contentHash }
  }
  const played = playReplay(sim, replay)
  for (let i = 0; i < replay.checks.length; i++) {
    const want = replay.checks[i] as ReplayCheck
    const got = played.checks[i]
    if (got?.hash !== want.hash) {
      return { ok: false, reason: 'diverged', tick: want.tick, expected: want.hash, actual: got?.hash ?? '' }
    }
  }
  if (played.finalHash !== replay.finalHash) {
    return {
      ok: false,
      reason: 'diverged',
      tick: replay.ticks,
      expected: replay.finalHash,
      actual: played.finalHash,
    }
  }
  return { ok: true }
}
