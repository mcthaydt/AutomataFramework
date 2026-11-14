// A game's `.ts` file, typechecked against the packed package's declarations: proves `dist/*.d.ts` resolve for
// someone who only has the tarball. It is never run.
import { startGame, watchReplay } from '@automataframework/framework'
import { createGameSim, loadGame } from '@automataframework/framework/headless'

export const used: [typeof createGameSim, typeof loadGame, typeof startGame, typeof watchReplay] = [
  createGameSim,
  loadGame,
  startGame,
  watchReplay,
]
