// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/property.ts
// Exit 4: snapshot -> restore -> continue equals an uninterrupted run, over many seeds, run
// lengths and restore points, restoring both into a fresh sim and into one that has moved on ("dirty").

import {
  type Command,
  createRng,
  createSim,
  deriveSeed,
  type PluginDef,
  type Rng,
  type Sim,
} from '#src/features/sim/sim.ts'
import { canonicalJson } from '#src/lib/canonical.ts'

/**
 * What `snapshotRoundTripProperty` runs: the plugins, content and a command script, and how many cases of
 * what length to try.
 */
export interface RoundTripOptions {
  readonly plugins: readonly PluginDef[]
  readonly content?: unknown
  readonly tickHz?: number
  /** Builds each case's world; `rng` is derived from the case's sim seed. */
  readonly setup?: (sim: Sim, rng: Rng) => void
  readonly script: (tick: number, rng: Rng) => readonly Command[]
  /** Default 200. */
  readonly cases?: number
  /** Each case runs 1..maxTicks ticks (default 300). */
  readonly maxTicks?: number
  /** Chooses which cases run (default 1). */
  readonly seed?: number
}

/** How a case restores: into a `fresh` sim, or into one that has `dirty` (stepped on past the snapshot). */
export type RoundTripVariant = 'fresh' | 'dirty'

/**
 * One case whose restored run differed from the uninterrupted one: its number, sim seed, length, restore
 * tick, variant and a report of what differed.
 */
export interface RoundTripFailure {
  readonly case: number
  readonly simSeed: number
  readonly ticks: number
  readonly at: number
  readonly variant: RoundTripVariant
  readonly report: string
}

/** Ticks the dirty variant steps past the snapshot before restoring it into the same sim. */
const DIRTY_TICKS = 7

interface Case {
  readonly index: number
  readonly simSeed: number
  readonly ticks: number
  readonly at: number
  readonly variant: RoundTripVariant
}

/**
 * Checks that snapshot, restore and continue equals an uninterrupted run, over many seeds, run lengths and
 * restore points, alternating fresh and dirty restores. Returns `{ failures }`; an empty list means the
 * property held.
 */
export async function snapshotRoundTripProperty(
  options: RoundTripOptions,
): Promise<{ readonly failures: readonly RoundTripFailure[] }> {
  const cases = options.cases ?? 200
  const maxTicks = options.maxTicks ?? 300
  const picker = createRng(deriveSeed(options.seed ?? 1, 'property'))
  const failures: RoundTripFailure[] = []
  for (let index = 0; index < cases; index++) {
    const simSeed = picker.nextU32()
    const ticks = 1 + picker.int(maxTicks)
    const at = picker.int(ticks + 1)
    const c: Case = { index, simSeed, ticks, at, variant: index % 2 === 0 ? 'fresh' : 'dirty' }
    const problem = await runCase(options, c).catch(
      (err: unknown) => `threw: ${(err as Error).message ?? err}`,
    )
    if (problem !== undefined)
      failures.push({
        case: index,
        simSeed,
        ticks,
        at,
        variant: c.variant,
        report: `case ${index} (${c.variant}, simSeed ${simSeed}, ticks ${ticks}, restore at ${at}): ${problem}`,
      })
  }
  return { failures }
}

/** Steps `sim` to `until`, feeding the script; returns the canonical JSON of every event once `collect` is set. */
function stepTo(
  sim: Sim,
  until: number,
  script: RoundTripOptions['script'],
  rng: Rng,
  events?: string[],
): void {
  while (sim.tick < until)
    for (const e of sim.step(script(sim.tick, rng)).events) events?.push(canonicalJson(e))
}

/** Undefined when the case passes; otherwise what differed. */
async function runCase(options: RoundTripOptions, c: Case): Promise<string | undefined> {
  const make = async (): Promise<Sim> => {
    const sim = await createSim({
      seed: c.simSeed,
      plugins: options.plugins,
      ...(options.tickHz === undefined ? {} : { tickHz: options.tickHz }),
      ...(options.content === undefined ? {} : { content: options.content }),
    })
    options.setup?.(sim, createRng(deriveSeed(c.simSeed, 'setup')))
    return sim
  }
  const scriptRng = () => createRng(deriveSeed(c.simSeed, 'script'))

  // A: uninterrupted.
  const straight = await make()
  const straightEvents: string[] = []
  let expected: string
  try {
    const rng = scriptRng()
    stepTo(straight, c.at, options.script, rng)
    stepTo(straight, c.ticks, options.script, rng, straightEvents)
    expected = straight.hash()
  } finally {
    straight.dispose()
  }

  // B: to `at`, snapshot, then continue in a fresh sim or after restoring into a sim that moved on.
  let sim = await make()
  const restoredEvents: string[] = []
  try {
    const rng = scriptRng()
    stepTo(sim, c.at, options.script, rng)
    const bytes = sim.snapshot()
    if (c.variant === 'fresh') {
      sim.dispose()
      sim = await make()
    } else {
      // Its own commands stream, so the script's stream stays where A's was at `at`.
      stepTo(sim, c.at + DIRTY_TICKS, options.script, createRng(deriveSeed(c.simSeed, 'dirty')))
    }
    sim.restore(bytes)
    stepTo(sim, c.ticks, options.script, rng, restoredEvents)
    const actual = sim.hash()
    if (actual !== expected) return `final hash ${expected} ≠ ${actual}`
  } finally {
    sim.dispose()
  }
  if (canonicalJson(restoredEvents) !== canonicalJson(straightEvents))
    return `events after tick ${c.at} differ (${straightEvents.length} straight, ${restoredEvents.length} restored)`
  return undefined
}
