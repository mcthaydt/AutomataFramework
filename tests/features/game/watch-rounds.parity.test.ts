// Looping a recording rests on one promise: a level restored to its tick-0 snapshot, Rapier's world and all, plays the
// same commands to the same hash as a fresh sim. This is that promise, in Node and in all three browsers, with no page.
import { expect, test } from 'vitest'
import { controlsCommand, createRecorder, playReplay } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

test('a level restored to its tick-0 snapshot plays the replay to the same hash again', async () => {
  const content = await loadFixtureGame()
  const recorded = await createGameSim({ content, plugins: [heroPlugin] })
  const recorder = createRecorder(recorded)
  for (let tick = 0; tick < 90; tick++) {
    recorder.step(
      tick === 5
        ? [controlsCommand(tick, 1, 0, ['right'])]
        : tick === 65
          ? [controlsCommand(tick, 1, 1, [])]
          : [],
    )
  }
  const replay = recorder.replay()
  recorded.dispose()

  const sim = await createGameSim({ content, plugins: [heroPlugin] })
  try {
    const start = sim.snapshot()
    expect(playReplay(sim, replay).finalHash).toBe(replay.finalHash)
    sim.restore(start)
    expect(sim.tick).toBe(0)
    const again = playReplay(sim, replay)
    expect(again.finalHash).toBe(replay.finalHash)
    expect(again.checks).toEqual(replay.checks)
  } finally {
    sim.dispose()
  }
})
