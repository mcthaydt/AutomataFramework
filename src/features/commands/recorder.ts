// Records a run as it happens: wraps `sim.step`, remembers the commands the sim accepted, and takes a check hash every
// so often. `replay()` may be asked for at any time, so a game can offer "save what I just did" without stopping.
import { canonicalJson } from '../../lib/canonical.ts'
import { type Command, FRAMEWORK_VERSION, type Sim, type StepResult } from '../sim/sim.ts'
import { REPLAY_FORMAT, type Replay, type ReplayCheck } from './replay.ts'

export interface Recorder {
  /** Steps the sim and records what it accepted. */
  step(commands: readonly Command[]): StepResult
  /** The run so far, from tick 0 to the sim's current tick. */
  replay(): Replay
}

/** How often, in ticks, the recorder takes a check hash. */
const DEFAULT_CHECK_EVERY = 60

/**
 * `sim` must be at tick 0: a replay always starts from the beginning, so it can be played on a fresh sim. A check hash
 * is taken after every `checkEvery` ticks (default 60); `replay()` leaves out the one that falls on the last tick,
 * because that hash is `finalHash`.
 */
export function createRecorder(
  sim: Sim,
  options: { checkEvery?: number; meta?: Readonly<Record<string, string>> } = {},
): Recorder {
  if (sim.tick !== 0)
    throw new Error(`A recorder needs a sim at tick 0, but this one is at tick ${sim.tick}.`)
  const checkEvery = options.checkEvery ?? DEFAULT_CHECK_EVERY
  if (!Number.isInteger(checkEvery) || checkEvery < 1)
    throw new Error('checkEvery must be a whole number of ticks, 1 or more.')
  const commands: Command[] = []
  const checks: ReplayCheck[] = []
  const meta = { ...options.meta }
  return {
    step(given) {
      const result = sim.step(given)
      // A rejected command did nothing and would be rejected again, so it is not part of the run.
      const refused = new Set(result.rejected.map((r) => r.command))
      for (const c of given) {
        // Copied through canonical JSON, so what is recorded cannot change when the caller reuses its objects.
        if (!refused.has(c)) commands.push({ ...c, payload: JSON.parse(canonicalJson(c.payload)) as unknown })
      }
      if (sim.tick % checkEvery === 0) checks.push({ tick: sim.tick, hash: sim.hash() })
      return result
    },
    replay() {
      return {
        format: REPLAY_FORMAT,
        framework: FRAMEWORK_VERSION,
        tickHz: sim.tickHz,
        seed: sim.seed,
        contentHash: sim.contentHash,
        schemaHash: sim.describeSnapshot().header.schemaHash,
        ticks: sim.tick,
        commands: commands.map((c) => ({ ...c })),
        checks: checks.filter((c) => c.tick < sim.tick),
        finalHash: sim.hash(),
        meta: { ...meta },
      }
    },
  }
}
