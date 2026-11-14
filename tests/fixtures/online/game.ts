// The fixture game as a room plays it: the same game, with a level that has a start for each of two players.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../game/hero.ts'
import { fixtureFiles, readFixture } from '../game/read.ts'
import { twoPlayerLevel } from './two-player-level.ts'

const LEVEL_FILE = 'content/levels/level-1.json'

/** The fixture game with its level changed to hold two starts. Throws, naming every problem, if it does not load. */
export async function loadOnlineGame(): Promise<GameContent> {
  const level = fixtureFiles[LEVEL_FILE] ?? ''
  const loaded = await loadGame(readFixture({ [LEVEL_FILE]: twoPlayerLevel(level) }))
  if (!loaded.ok)
    throw new Error(`The online game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}

/** A sim of the online game for players 1 to `seats`, with the fixture's hero code. The caller disposes it. */
export async function onlineSim(seats = 2): Promise<Sim> {
  return createGameSim({
    content: await loadOnlineGame(),
    plugins: [heroPlugin],
    players: Array.from({ length: seats }, (_, i) => i + 1),
  })
}
