// The golden helpers: a run's hashes recorded in a JSON file under tests/golden/, read back by every engine.
//
// A golden is recorded from CI, never typed: a new file is committed with `"finalHash": ""`, the Node job fails with
// GOLDEN NOT RECORDED and the JSON to commit, and from then on all four engines must match it.
import type { Command, Sim } from '#src/features/sim/sim.ts'

/** How often `runGolden` takes a check hash, in ticks. */
const CHECK_EVERY = 60

export interface GoldenCheck {
  readonly tick: number
  readonly hash: string
}

export interface Golden {
  readonly ticks: number
  readonly finalHash: string
  readonly checks: readonly GoldenCheck[]
}

/**
 * Steps `sim` `ticks` times and reports its hashes. A check hash is taken after each step that lands on a multiple of
 * 60 ticks, never at tick 0, and never for the last tick: that one is `finalHash`. `commandsAt` is called once per
 * tick, in order, with the tick about to run, so a script may close over a seeded stream.
 */
export function runGolden(sim: Sim, ticks: number, commandsAt: (tick: number) => readonly Command[]): Golden {
  const checks: GoldenCheck[] = []
  for (let i = 0; i < ticks; i++) {
    sim.step(commandsAt(sim.tick))
    if (sim.tick % CHECK_EVERY === 0 && sim.tick < ticks) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  return { ticks, finalHash: sim.hash(), checks }
}

/**
 * Compares a run with the committed golden: `ticks`, `finalHash` and `checks`, and nothing else, so a golden file may
 * carry other recorded values beside them. An empty `golden.finalHash` means "not recorded yet": it fails with
 * GOLDEN NOT RECORDED and the JSON to commit.
 */
export function expectGolden(actual: Golden, golden: Golden): void {
  if (golden.finalHash === '') {
    throw new Error(
      `GOLDEN NOT RECORDED. Commit this as the golden file:\n${JSON.stringify(actual, null, 2)}\n`,
    )
  }
  const pick = ({ ticks, finalHash, checks }: Golden): Golden => ({ ticks, finalHash, checks })
  // A plain comparison, so a mismatch says which check tick moved first.
  if (JSON.stringify(pick(actual)) !== JSON.stringify(pick(golden))) {
    const moved = actual.checks.find((c, i) => golden.checks[i]?.hash !== c.hash)
    throw new Error(
      `GOLDEN MOVED. ${moved ? `First check that differs: tick ${moved.tick}.` : 'Only the final hash differs.'}\n` +
        `expected ${JSON.stringify(pick(golden))}\nactual   ${JSON.stringify(pick(actual))}\n`,
    )
  }
}
