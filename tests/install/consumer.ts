// A game's `.ts` file, typechecked against the packed package's declarations: proves `dist/*.d.ts` resolve for
// someone who only has the tarball. It is never run.
import { soundNotice, startGame, watchReplay, webHost, webSpeaker } from '@automataframework/framework'
import {
  createAudio,
  createGameSim,
  createSaves,
  defineSave,
  type GameContent,
  type Host,
  type LevelJoint,
  loadGame,
  type MessagesFile,
  openSettings,
  type SaveDef,
  type Speaker,
  type StoryProgress,
  type TalkView,
  type TilesetFile,
  type Touch,
  testHost,
  testSpeaker,
  z,
} from '@automataframework/framework/headless'

export const used: [
  typeof createGameSim,
  typeof loadGame,
  typeof startGame,
  typeof watchReplay,
  typeof webHost,
  typeof testHost,
  typeof createSaves,
  typeof openSettings,
  typeof createAudio,
  typeof testSpeaker,
  typeof webSpeaker,
  typeof soundNotice,
] = [
  createGameSim,
  loadGame,
  startGame,
  watchReplay,
  webHost,
  testHost,
  createSaves,
  openSettings,
  createAudio,
  testSpeaker,
  webSpeaker,
  soundNotice,
]

// A host is a plain interface a game's tests can fill in or take from `testHost`, and a save's schema is written with
// the package's own `z`, so the declarations of both resolve from the tarball alone.
export const host: Host = testHost()
export const progress: SaveDef<{ level: string }> = defineSave({
  game: 'consumer',
  version: 1,
  slots: 1,
  schema: z.strictObject({ level: z.string() }),
})

// The new kinds of content are in the packed declarations too.
export const sound: NonNullable<GameContent['sounds']>[string] | undefined = undefined
export const words: MessagesFile | undefined = undefined
export const tiles: TilesetFile | undefined = undefined

// Joints and touch are in the packed declarations too.
export const held: LevelJoint | undefined = undefined
export const touched: Touch | undefined = undefined

// The story is in the packed declarations too: what a save keeps, and what the box shows.
export const storyKept: StoryProgress = { ended: {}, seen: [] }
export const said: TalkView | undefined = undefined
// A speaker is a plain interface a game can fill in itself, and `testSpeaker` is one; the declarations of both resolve
// from the tarball alone.
export const speaker: Speaker = testSpeaker()
