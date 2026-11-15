// Feel is presentation: it hears each step's events and never touches the sim. This plays the recorded runs of the
// framework's goldens with a feel runtime hearing every step and a frame drawn after each, in Node and in all three
// browsers, and every one still ends on the hash recorded for it. (The template's own recording is held to the same in
// `tests/template/feel-replay.parity.test.ts`.)
import { afterEach, expect, test } from 'vitest'
import { createFeel } from '#src/features/feel/feel.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { FEEL_FILES } from '../../fixtures/feel/script.ts'
import { COOP_TICKS, coopFiles, coopScript } from '../../fixtures/game/co-op.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'
import { loadSpriteGame } from '../../fixtures/game/sprite-game.ts'
import { expectGolden, type Golden } from '../../fixtures/golden.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TICKS, movesScript } from '../../fixtures/moves/script.ts'
import coOp from '../../golden/co-op.json' with { type: 'json' }
import moves from '../../golden/moves.json' with { type: 'json' }
import sprites from '../../golden/sprites.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/**
 * Steps `sim` `ticks` times the way `runGolden` does (a check hash after each step that lands on a multiple of 60,
 * never the last), with a feel runtime hearing every step and drawing a frame after it, over the made-up feel files.
 */
function playHeard(sim: Sim, ticks: number, script: (tick: number) => readonly Command[]): Golden {
  const feel = createFeel({
    content: { feels: FEEL_FILES },
    tickHz: 60,
    settings: { format: 1, shake: true },
  })
  const checks: { tick: number; hash: string }[] = []
  for (let i = 0; i < ticks; i++) {
    const result = sim.step(script(sim.tick))
    feel.hear(result)
    feel.hold(1 / 60)
    feel.frame(1 / 60, () => ({ x: 0, y: 0, w: 1, h: 1 }))
    if (sim.tick % 60 === 0 && sim.tick < ticks) checks.push({ tick: sim.tick, hash: sim.hash() })
  }
  return { ticks, finalHash: sim.hash(), checks }
}

const track = (sim: Sim): Sim => {
  made.push(sim)
  return sim
}

test('the moves game ends on its golden with a feel hearing every step', async () => {
  const sim = track(await createGameSim({ content: await loadMovesGame() }))
  expectGolden(playHeard(sim, MOVES_TICKS, movesScript), moves)
})

test('the co-op run ends on its golden with a feel hearing every step', async () => {
  const sim = track(
    await createGameSim({
      content: await loadFixtureGame(coopFiles),
      plugins: [heroPlugin],
      players: [1],
    }),
  )
  expectGolden(playHeard(sim, COOP_TICKS, coopScript), coOp)
})

test('the game with figures ends on its golden with a feel hearing every step', async () => {
  const sim = track(await createGameSim({ content: await loadSpriteGame(), plugins: [heroPlugin] }))
  expectGolden(playHeard(sim, PUSH_TICKS, pushScript), sprites)
})
