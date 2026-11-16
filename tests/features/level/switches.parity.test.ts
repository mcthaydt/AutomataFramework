// Switches and gates in Node, Chromium, WebKit and Firefox (plan W, task 7): a hero pushes a crate over a plate and on
// through the gate it opens, and every engine ends on the hash recorded in tests/golden/switch.json.
import { afterEach, expect, test } from 'vitest'
import {
  controlsCommand,
  createRecorder,
  type Replay,
  verifyReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Collider, Transform } from '#src/features/physics/physics.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'
import golden from '../../golden/switch.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/**
 * Room 1 with its gate close behind the plate, at x 10.25. With the gate where the file puts it (11.25) the hero leaves the
 * plate two ticks before the crate reaches the gate, so the gate shuts in the crate's face; here the crate is already in
 * the gate when the plate comes up, so the gate waits for it, and for the hero, to pass.
 */
const overrides = editLevel('room-1', (level) => {
  const gate = level.things.find((t) => t.id === 'gate-1')
  if (gate === undefined) throw new Error('room-1 has no gate')
  gate.x = 10.25
})

async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadLinksGame(overrides), level: 'room-1' })
  made.push(sim)
  return sim
}

const TICKS = 360
/** Player 1 holds right for 300 ticks and then nothing for 60. */
const script = (tick: number): Command[] =>
  tick === 0
    ? [controlsCommand(tick, 1, 0, ['right'])]
    : tick === 300
      ? [controlsCommand(tick, 1, 1, [])]
      : []

async function record(): Promise<{ sim: Sim; replay: Replay; said: string[] }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const said: string[] = []
  for (let i = 0; i < TICKS; i++)
    for (const e of recorder.step(script(sim.tick)).events) if (e.type.startsWith('gate.')) said.push(e.type)
  return { sim, replay: recorder.replay(), said }
}

const thing = (sim: Sim, id: string) => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id)
  if (found === undefined) throw new Error(`no thing ${id}`)
  return found
}

test('the crate goes over the plate and through the gate, and the run matches its golden', async () => {
  const { sim, replay, said } = await record()
  // What the run proves, before its hashes: the gate opened and shut the same number of times, the crate ended beyond it,
  // and the gate is shut.
  expect(said.filter((t) => t === 'gate.opened').length).toBeGreaterThanOrEqual(1)
  expect(said.filter((t) => t === 'gate.closed')).toHaveLength(said.filter((t) => t === 'gate.opened').length)
  expect(said[said.length - 1]).toBe('gate.closed')
  expect(thing(sim, 'crate-1').get(Transform).x).toBeGreaterThan(10.75)
  expect(thing(sim, 'gate-1').get(Collider).sensor).toBe(false)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})
