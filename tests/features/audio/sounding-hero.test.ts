// The sounding hero is the fixture the audio proofs listen to, so its two events are held to what they say: in the
// sounding run the hero jumps twice and lands twice, and a landing is a landing, not the top of a jump.
import { expect, test } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { SOUNDING_TICKS, soundingScript } from '../../fixtures/audio/script.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'

/** The ticks (after the step) on which the run's events of `type` came. */
async function ticksOf(): Promise<{ jumped: number[]; landed: number[]; all: SimEvent[] }> {
  const sim = await createGameSim({ content: await loadSoundingGame(), plugins: [soundingHeroPlugin] })
  const jumped: number[] = []
  const landed: number[] = []
  const all: SimEvent[] = []
  try {
    for (let i = 0; i < SOUNDING_TICKS; i++) {
      const result = sim.step(soundingScript(sim.tick))
      for (const event of result.events) {
        all.push(event)
        if (event.type === 'hero.jumped') jumped.push(result.tick)
        if (event.type === 'hero.landed') landed.push(result.tick)
      }
    }
  } finally {
    sim.dispose()
  }
  return { jumped, landed, all }
}

test('the sounding run has exactly two jumps and two landings, each landing well after its jump', async () => {
  const { jumped, landed } = await ticksOf()
  expect(jumped).toHaveLength(2)
  expect(landed).toHaveLength(2)
  for (const [i, jump] of jumped.entries()) {
    const landing = landed[i] ?? Number.NaN
    // A jump lasts about 48 ticks: a landing sooner than 40 would be the top of the jump, not the ground.
    expect(landing - jump).toBeGreaterThanOrEqual(40)
  }
  expect(jumped[1] ?? 0).toBeGreaterThan(landed[0] ?? Number.POSITIVE_INFINITY)
})

test('a hero that never jumps raises no event', async () => {
  const sim = await createGameSim({ content: await loadSoundingGame(), plugins: [soundingHeroPlugin] })
  try {
    for (let i = 0; i < 60; i++) {
      const heroEvents = sim.step([]).events.filter((e) => e.type.startsWith('hero.'))
      expect(heroEvents).toEqual([])
    }
  } finally {
    sim.dispose()
  }
})
