// Moved out of create-sim.ts (AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/world/sim.ts) to keep each file
// under 600 lines.

/** The sim was disposed; it holds no world any more, so every call that reads or changes state refuses. */
export class SimDisposedError extends Error {
  constructor() {
    super('this sim has been disposed; create a new one')
    this.name = 'SimDisposedError'
  }
}

/**
 * A system threw during `step`. The tick was left half-applied, so the sim refuses `step`, `snapshot` and
 * `hash` until a successful `restore`. Failing closed is cheaper than rolling back every tick.
 */
export class SimFaultedError extends Error {
  readonly system: string
  readonly tick: number
  constructor(system: string, tick: number, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    super(`system "${system}" threw at tick ${tick}: ${reason}. Restore a snapshot to continue.`, { cause })
    this.name = 'SimFaultedError'
    this.system = system
    this.tick = tick
  }
}
