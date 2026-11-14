// Sound moves nothing: a sim that is listened to ends on the same hashes as one that is not, and a run that already has
// a golden still matches it with an audio hearing every step. Runs in Node and in the three browsers.
import { afterEach, expect, expectTypeOf, test } from 'vitest'
import { createAudio, type GameAudio, testSpeaker } from '#src/features/audio/audio.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim, SimEvent } from '#src/features/sim/sim.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { SOUNDING_TICKS, soundingScript } from '../../fixtures/audio/script.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'
import { expectGolden, type Golden } from '../../fixtures/golden.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** An audio over a tapped test speaker, with the sounding game's cues. */
async function listener(): Promise<GameAudio> {
  const speaker = testSpeaker()
  speaker.tap()
  return createAudio({ content: await loadSoundingGame(), speaker })
}

test('the sounding run with audio listening and without ends on the same hashes', async () => {
  const content = await loadSoundingGame()
  const heard = await createGameSim({ content, plugins: [soundingHeroPlugin] })
  const unheard = await createGameSim({ content, plugins: [soundingHeroPlugin] })
  made.push(heard, unheard)
  const audio = await listener()
  audio.begin()
  for (let i = 0; i < SOUNDING_TICKS; i++) {
    const result = heard.step(soundingScript(heard.tick))
    audio.hear({ tick: result.tick, events: result.events })
    unheard.step(soundingScript(unheard.tick))
    if (heard.tick % 60 === 0) expect(heard.hash()).toBe(unheard.hash())
  }
  expect(heard.hash()).toBe(unheard.hash())
  // The run did have something to hear: a sim that raised nothing would prove nothing.
  expect(audio.log().filter((entry) => entry.from === 'sim')).not.toHaveLength(0)
})

test('the push-crate run, heard by an audio, still matches its golden', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame(), plugins: [heroPlugin] })
  made.push(sim)
  const audio = await listener()
  audio.begin()
  const checks: { tick: number; hash: string }[] = []
  for (let i = 0; i < PUSH_TICKS; i++) {
    const result = sim.step(pushScript(sim.tick))
    audio.hear({ tick: result.tick, events: result.events })
    if (sim.tick % 60 === 0 && sim.tick < PUSH_TICKS) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  const actual: Golden = { ticks: PUSH_TICKS, finalHash: sim.hash(), checks }
  expectGolden(actual, golden)
  // Nothing in the push-crate run is a sound: the audio heard every step and had nothing to say.
  expect(audio.log()).toEqual([])
})

test('audio never gets the sim', () => {
  // A type test: what `hear` takes has exactly these two keys, so a render delta or a command cannot be passed in.
  expectTypeOf<keyof Parameters<GameAudio['hear']>[0]>().toEqualTypeOf<'tick' | 'events'>()
  expectTypeOf<Parameters<GameAudio['hear']>[0]['events']>().toEqualTypeOf<readonly SimEvent[]>()
})
