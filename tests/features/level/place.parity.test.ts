// A place in Node, Chromium, WebKit and Firefox (plan W, task 10; the spec's proof): the hero walks from room-2 into room-3
// pushing a crate through a gate a fact holds open, and every engine ends on the hash recorded in tests/golden/place.json,
// recorded, replayed, and restored at tick 200.
import { afterEach, expect, test } from 'vitest'
import {
  controlsCommand,
  createRecorder,
  Player,
  type Replay,
  verifyReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim, factsCommand, Thing } from '#src/features/level/level.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'
import golden from '../../golden/place.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/**
 * Room 2 with its crate at (12.5, 7.5) and its critter taken out: the critter stands still this cycle and would only make
 * the hero push a stack, whose speed changes for reasons that are not the seam (audit L4).
 */
const overrides = editLevel('room-2', (level) => {
  const crate = level.things.find((t) => t.id === 'crate-1')
  if (crate === undefined) throw new Error('room-2 has no crate')
  crate.x = 12.5
  crate.y = 7.5
  level.things = level.things.filter((t) => t.id !== 'critter-1')
})

const FACTS = ['room-2.gate-1.open']

async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadLinksGame(overrides), level: 'room-2' })
  made.push(sim)
  return sim
}

const TICKS = 420
/** The room's fact at tick 0, with player 1 holding right throughout. */
const script = (tick: number): Command[] =>
  tick === 0 ? [factsCommand(FACTS), controlsCommand(tick, 1, 0, ['right'])] : []

interface Run {
  readonly sim: Sim
  readonly replay: Replay
  /** Each tick's `level.entered` events as the players they were for. */
  readonly entered: { tick: number; player: number; level: string }[]
  /** The hero's horizontal speed after each step. */
  readonly vx: number[]
}

async function record(): Promise<Run> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const entered: Run['entered'] = []
  const vx: number[] = []
  for (let i = 0; i < TICKS; i++) {
    const tick = sim.tick
    const step = recorder.step(script(tick))
    for (const e of step.events)
      if (e.type === 'level.entered') {
        const payload = e.payload as { player: number; level: string }
        entered.push({ tick, player: payload.player, level: payload.level })
      }
    const hero = sim.query(Player, Body).find((h) => h.get(Player).number === 1)
    vx.push(hero?.get(Body).vx ?? Number.NaN)
  }
  return { sim, replay: recorder.replay(), entered, vx }
}

test('the hero and the crate cross into room-3 without a break in speed, and the run matches its golden', async () => {
  const { sim, replay, entered, vx } = await record()
  // Before the hashes: exactly one crossing, the hero's (a crate raises none), the crate went with them, and the hero did
  // not slow or jump as the seam went by.
  expect(entered).toHaveLength(1)
  expect(entered[0]).toMatchObject({ player: 1, level: 'room-3' })
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'room-2.crate-1')
  expect(crate?.get(Transform).x).toBeGreaterThan(16)
  const at = entered[0]?.tick ?? 0
  expect(Math.abs((vx[at - 1] ?? Number.NaN) - (vx[at + 1] ?? Number.NaN))).toBeLessThan(0.01)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})

test("saved at tick 200 and restored, it ends on the golden's hash", async () => {
  const first = await fresh()
  for (let t = 0; t < 200; t++) first.step(script(first.tick))
  const bytes = first.snapshot()
  const second = await fresh()
  second.restore(bytes)
  for (let t = 200; t < TICKS; t++) second.step(script(second.tick))
  expect(second.hash()).toBe(golden.finalHash)
})
