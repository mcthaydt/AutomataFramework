// Weight in Node, Chromium, WebKit and Firefox (F4): a hero pushes a 4 kilo crate, and every engine ends on the hash
// recorded in tests/golden/weight.json. A snapshot taken mid-push and restored ends on the same hash as an
// uninterrupted run, since Rapier's world snapshot carries the mass.
import { afterEach, expect, test } from 'vitest'
import {
  controlsCommand,
  createRecorder,
  type Replay,
  verifyReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Mass, Transform } from '#src/features/physics/physics.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'
import { weighedRoom } from '../../fixtures/links-game/weight.ts'
import golden from '../../golden/weight.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadLinksGame(weighedRoom(4)), level: 'room-1' })
  made.push(sim)
  return sim
}

const TICKS = 120
/** Player 1 holds right all the way. */
const script = (tick: number): Command[] => (tick === 0 ? [controlsCommand(tick, 1, 0, ['right'])] : [])

async function record(): Promise<{ sim: Sim; replay: Replay }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  for (let i = 0; i < TICKS; i++) recorder.step(script(sim.tick))
  return { sim, replay: recorder.replay() }
}

const crate = (sim: Sim) => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === 'crate-1')
  if (found === undefined) throw new Error('no crate-1')
  return found
}

test('the hero pushes the 4 kilo crate, and the run matches its golden', async () => {
  const { sim, replay } = await record()
  expect(crate(sim).get(Mass).kilos).toBe(4)
  expect(crate(sim).get(Transform).x).toBeGreaterThan(5.5 + 2)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})

test('saved mid-push and restored, it ends on the same hash as an uninterrupted run', async () => {
  const straight = await fresh()
  for (let i = 0; i < TICKS; i++) straight.step(script(straight.tick))
  const first = await fresh()
  for (let i = 0; i < 60; i++) first.step(script(first.tick))
  const bytes = first.snapshot()
  const second = await fresh()
  second.restore(bytes)
  for (let i = 60; i < TICKS; i++) second.step(script(second.tick))
  expect(second.hash()).toBe(straight.hash())
  expect(crate(second).get(Mass).kilos).toBe(4)
})
