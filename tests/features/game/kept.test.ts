// The snapshots a game keeps so it can go back: one a second, just before the second's last step, so going to any tick
// from the oldest kept up to now restores one snapshot and steps at least once (and a step is what gives the picture).
import { afterEach, expect, test } from 'vitest'
import { createKept } from '#src/features/game/kept.ts'
import { createSim, type Sim } from '#src/features/sim/sim.ts'
import { bouncePlugin } from '../../fixtures/bounce/bounce.plugin.ts'
import { BOUNCE_SEED, bounceSetup } from '../../fixtures/bounce/bounce-script.ts'

const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})

async function bounceSim(): Promise<Sim> {
  const sim = await createSim({ seed: BOUNCE_SEED, plugins: [bouncePlugin], content: { level: 'bounce' } })
  sims.push(sim)
  bounceSetup(sim)
  return sim
}

/** Plays `ticks` ticks of nothing, telling `kept` about the tick before and after each step as a game does. */
function play(sim: Sim, kept: ReturnType<typeof createKept>, ticks: number): void {
  kept.note(sim.tick)
  for (let t = 0; t < ticks; t++) {
    sim.step([])
    kept.note(sim.tick)
  }
}

test('it keeps the newest seconds + 1 snapshots, and the oldest tick it can go back to is one past the oldest', async () => {
  const sim = await bounceSim()
  const kept = createKept(sim, 2)
  play(sim, kept, 300)
  expect(kept.from()).toBe(180)
})

test('early in a play the oldest tick is just after the start', async () => {
  const sim = await bounceSim()
  const kept = createKept(sim, 5)
  play(sim, kept, 130)
  expect(kept.from()).toBe(1)
})

test('nearest gives the snapshot just before a tick, never at it', async () => {
  const sim = await bounceSim()
  const kept = createKept(sim, 5)
  play(sim, kept, 250)
  expect(kept.nearest(120)?.tick).toBe(119)
  expect(kept.nearest(121)?.tick).toBe(119)
  expect(kept.nearest(180)?.tick).toBe(179)
  expect(kept.nearest(1)?.tick).toBe(0)
  expect(kept.nearest(0)).toBeUndefined()
})

test('a snapshot restores to the state it was taken at', async () => {
  const sim = await bounceSim()
  const kept = createKept(sim, 5)
  play(sim, kept, 70)
  const at59 = kept.nearest(60)
  expect(at59?.tick).toBe(59)
  sim.restore(at59?.bytes as Uint8Array)
  expect(sim.tick).toBe(59)
})

test('cutTo forgets the snapshots after a tick', async () => {
  const sim = await bounceSim()
  const kept = createKept(sim, 5)
  play(sim, kept, 250)
  kept.cutTo(130)
  expect(kept.nearest(250)?.tick).toBe(119)
  expect(kept.from()).toBe(1)
})
