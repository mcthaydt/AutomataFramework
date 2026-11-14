// The template game's recorded play, in Node and in all three browsers: the same hero, the same crate, the same hash.
// `template/replays/level-1.json` is a golden. It is recorded from CI, never typed: when it is missing, this test fails
// with the file to commit.
import { afterEach, expect, test } from 'vitest'
import {
  createRecorder,
  Player,
  parseReplay,
  type Replay,
  verifyReplay,
  writeReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { Score } from '../../template/src/features/hero/score.ts'
import { gamePlugins } from '../../template/src/headless.ts'
import { loadTemplateGame } from './game.ts'
import { TEMPLATE_TICKS, templatePlay } from './hero-play.ts'

const recordings = import.meta.glob('../../template/replays/level-1.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const recorded = Object.values(recordings)[0]

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadTemplateGame(), plugins: gamePlugins })
  made.push(sim)
  return sim
}

/** Plays the scripted play on a new game sim, recording it. */
async function record(): Promise<{ sim: Sim; replay: Replay }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  for (let tick = 0; tick < TEMPLATE_TICKS; tick++) recorder.step(templatePlay(sim.tick))
  return { sim, replay: recorder.replay() }
}

test('the recorded play of the template still plays, in this engine', async () => {
  const { replay } = await record()
  if (recorded === undefined)
    throw new Error(
      `REPLAY NOT RECORDED. Commit this as template/replays/level-1.json:\n${writeReplay(replay)}`,
    )
  const verdict = verifyReplay(await fresh(), parseReplay(recorded))
  if (!verdict.ok)
    throw new Error(
      `The recorded play of the template no longer plays: ${JSON.stringify(verdict)}. The recording ends on ` +
        `${parseReplay(recorded).finalHash} and this run on ${replay.finalHash}. This is a golden: record it again ` +
        'only with the Owner seeing both, in a commit that names template/replays/level-1.json.',
    )
})

test('in the recorded play the hero pushes the crate to the right and ends left of it', async () => {
  const { sim } = await record()
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'crate-1')
  const hero = sim.query(Player, Transform)[0]
  expect(crate?.get(Transform).x).toBeGreaterThan(6.5 + 1)
  expect(hero?.get(Transform).x).toBeLessThan(crate?.get(Transform).x ?? 0)
})

test('in the recorded play the hero takes the spark on the way, and it is counted', async () => {
  const { sim } = await record()
  expect(sim.resource(Score)).toEqual({ sparks: 1 })
  expect(sim.query(Thing).some((e) => e.get(Thing).id === 'spark-1')).toBe(false)
})
