// Two heroes the framework moves, on one floor: one dashes into the other. One hash in every engine.
import { afterEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TWO_TICKS, movesTwoScript } from '../../fixtures/moves/script.ts'
import golden from '../../golden/moves.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('two heroes on one floor, one dashes into the other: one hash in every engine', async () => {
  const sim = await createGameSim({ content: await loadMovesGame(), level: 'level-2', players: [1, 2] })
  made.push(sim)
  const said: string[] = []
  for (let t = 0; t < MOVES_TWO_TICKS; t++)
    for (const e of sim.step(movesTwoScript(sim.tick)).events)
      if (e.type.startsWith('hero.')) said.push(`${t}:${e.type}`)
  const x = (number: number): number =>
    sim
      .query(Player)
      .find((e) => e.get(Player).number === number)
      ?.get(Transform).x ?? Number.NaN
  const trace = said.join(' ')
  expect(
    said.filter((e) => e.endsWith('dashed')),
    trace,
  ).toHaveLength(1)
  // The second hero was in the dash's way and stands where it did not start, to the right of the first.
  expect(x(2), trace).toBeGreaterThan(x(1))
  expectRecorded('coOpHash', sim.hash(), (golden as { coOpHash?: string }).coOpHash)
})
