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
import { LANGUAGES, loadGame } from '#src/features/content/content.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { Score } from '../../template/src/features/hero/score.ts'
import { gamePlugins } from '../../template/src/headless.ts'
import { withSource } from '../fixtures/content/kind.ts'
import { loadTemplateGame, readFiles, templateFiles } from './game.ts'
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

/** What the scripted play did: the sim after it, its recording, and the tick each event was first said, by name. */
async function record(): Promise<{ sim: Sim; replay: Replay; said: Map<string, { tick: number; player?: number }> }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const said = new Map<string, { tick: number; player?: number }>()
  for (let tick = 0; tick < TEMPLATE_TICKS; tick++) {
    for (const event of recorder.step(templatePlay(sim.tick)).events) {
      const player = (event.payload as { player?: number } | undefined)?.player
      if (!said.has(event.type)) said.set(event.type, { tick, ...(player === undefined ? {} : { player }) })
    }
  }
  return { sim, replay: recorder.replay(), said }
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

test('the recorded play takes the spark, pushes the crate, never falls and ends at the door', async () => {
  const { sim, said } = await record()
  // The spark is taken and counted once.
  expect(sim.resource(Score)).toEqual({ sparks: 1 })
  expect(sim.query(Thing).some((e) => e.get(Thing).id === 'spark-1')).toBe(false)
  // The crate was pushed toward the door, past where it started (11.5).
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'crate-1')
  expect(crate?.get(Transform).x).toBeGreaterThan(11.5 + 0.5)
  // Nobody fell, and player 1 touched the door.
  expect(said.has('hero.fell')).toBe(false)
  expect(said.get('door.touched')?.player).toBe(1)
  expect(said.get('door.touched')?.tick).toBeLessThan(TEMPLATE_TICKS - 30)
  // The hero is on the far side of the gap.
  const hero = sim.query(Player, Transform)[0]
  expect(hero?.get(Transform).x).toBeGreaterThan(9)
})

// The team's language is not what happens in the game: the same recording ends on the same hash whichever of the six
// the game says it is written in (the framework's golden does not move).
for (const source of LANGUAGES)
  test(`the recorded play ends on the same hash when the game is written in ${source}`, async () => {
    if (recorded === undefined) throw new Error('REPLAY NOT RECORDED: see the first test of this file.')
    const toml = withSource(templateFiles['automata.toml'] ?? '', source)
    const loaded = await loadGame(readFiles({ 'automata.toml': toml }))
    if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
    const sim = await createGameSim({ content: loaded.value, plugins: gamePlugins })
    made.push(sim)
    expect(verifyReplay(sim, parseReplay(recorded))).toEqual({ ok: true })
  })
