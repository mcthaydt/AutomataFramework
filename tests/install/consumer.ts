// A game's `.ts` file, typechecked against the packed package's declarations: proves `dist/*.d.ts` resolve for
// someone who only has the tarball. It is never run.
import { startGame, watchReplay } from '@automataframework/framework'
import {
  createGameSim,
  type GameContent,
  type LevelJoint,
  loadGame,
  type MessagesFile,
  type TilesetFile,
  type Touch,
} from '@automataframework/framework/headless'

export const used: [typeof createGameSim, typeof loadGame, typeof startGame, typeof watchReplay] = [
  createGameSim,
  loadGame,
  startGame,
  watchReplay,
]

// The new kinds of content are in the packed declarations too.
export const sound: NonNullable<GameContent['sounds']>[string] | undefined = undefined
export const words: MessagesFile | undefined = undefined
export const tiles: TilesetFile | undefined = undefined

// Joints and touch are in the packed declarations too.
export const held: LevelJoint | undefined = undefined
export const touched: Touch | undefined = undefined
