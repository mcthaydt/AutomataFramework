// One cue log everywhere: the sounding run is played in Node and in three browsers, and what the cues asked for is the
// same text in all four. The hashes are held to the golden as every run's are; the log is held to it as recorded text.
import { afterEach, expect, test } from 'vitest'
import { type CueLogEntry, createAudio, type GameAudio, testSpeaker } from '#src/features/audio/audio.ts'
import { createRecorder } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { canonicalJson } from '#src/lib/canonical.ts'
import { SOUNDING_TICKS, soundingScript } from '../../fixtures/audio/script.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/sounding.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function newAudio(): Promise<GameAudio> {
  const speaker = testSpeaker()
  speaker.tap()
  return createAudio({ content: await loadSoundingGame(), speaker })
}

/** Plays the sounding run once, recording it and hearing every step; the audio has raised `level.started` first. */
async function play() {
  const sim = await createGameSim({ content: await loadSoundingGame(), plugins: [soundingHeroPlugin] })
  made.push(sim)
  const audio = await newAudio()
  audio.begin()
  audio.raise('level.started')
  const recorder = createRecorder(sim)
  const checks: { tick: number; hash: string }[] = []
  for (let i = 0; i < SOUNDING_TICKS; i++) {
    const result = recorder.step(soundingScript(sim.tick))
    audio.hear({ tick: result.tick, events: result.events })
    if (sim.tick % 60 === 0 && sim.tick < SOUNDING_TICKS) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  return { sim, audio, recorder, checks }
}

test("the sounding run's hashes and cue log match the golden in every engine", async () => {
  const { sim, audio, checks } = await play()
  expectGolden({ ticks: SOUNDING_TICKS, finalHash: sim.hash(), checks }, golden)
  expectRecorded('cueLog', canonicalJson(audio.log()), golden.cueLog)
})

test('the log has the music first, two jumps and a landing after each', async () => {
  const { audio } = await play()
  const log = audio.log()
  expect(log[0]).toEqual({ tick: 0, from: 'page', on: 'level.started', do: 'music', id: 'meadow' })
  const hero = log.filter((entry) => entry.from === 'sim')
  // Alternating, jump first, none skipped: the sounds are never crowded out in this run.
  expect(hero.map((entry: CueLogEntry) => entry.on)).toEqual([
    'hero.jumped',
    'hero.landed',
    'hero.jumped',
    'hero.landed',
  ])
  for (const entry of hero) expect(entry.skipped).toBeUndefined()
})

test('a replay of the run gives the same cue log as the run', async () => {
  const { audio, recorder } = await play()
  const replay = recorder.replay()
  const fresh = await createGameSim({ content: await loadSoundingGame(), plugins: [soundingHeroPlugin] })
  made.push(fresh)
  const second = await newAudio()
  second.begin()
  second.raise('level.started')
  let next = 0
  for (let i = 0; i < replay.ticks; i++) {
    const now = []
    while (next < replay.commands.length && (replay.commands[next]?.tick ?? 0) === fresh.tick) {
      now.push(replay.commands[next] as (typeof replay.commands)[number])
      next++
    }
    const result = fresh.step(now)
    second.hear({ tick: result.tick, events: result.events })
  }
  expect(canonicalJson(second.log())).toBe(canonicalJson(audio.log()))
})
