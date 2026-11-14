// A game's `.ts` file, typechecked against the packed package's declarations: proves `dist/*.d.ts` resolve for
// someone who only has the tarball. It is never run.
import {
  ArtError,
  loadArt,
  needsPictures,
  type ReadPicture,
  type Shot,
  soundNotice,
  startGame,
  watchReplay,
  webHost,
  webSpeaker,
} from '@automataframework/framework'
import {
  type Atlas,
  artFiles,
  artProblems,
  type BackdropFile,
  createAudio,
  createGameSim,
  createSaves,
  defineSave,
  type FigureFile,
  type GameContent,
  type Host,
  type LevelJoint,
  type Locale,
  loadGame,
  type MessagesFile,
  openSettings,
  type SaveDef,
  type Speaker,
  type TilesetFile,
  type Touch,
  testHost,
  testSpeaker,
  typed,
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

// A speaker is a plain interface a game can fill in itself, and `testSpeaker` is one; the declarations of both resolve
// from the tarball alone.
export const speaker: Speaker = testSpeaker()

// A figure, a backdrop and the atlas a picture comes with are in the packed declarations, and so are the page's loader of
// pictures, the check of a level's pictures, and the camera's shot.
export const figure: FigureFile | undefined = undefined
export const backdrop: BackdropFile | undefined = undefined
export const atlas: Atlas | undefined = undefined
export const shot: Shot | undefined = undefined
export const fetchPicture: ReadPicture = async () => new Blob()
export const art: [typeof artFiles, typeof artProblems, typeof loadArt, typeof needsPictures, typeof ArtError] = [
  artFiles,
  artProblems,
  loadArt,
  needsPictures,
  ArtError,
]

// The player's language: `typed` is a game's own typed `words`, over its messages file, and a `Locale` is what the
// game's screens take; both resolve from the tarball alone.
export const say: (key: 'greeting', values?: Record<string, string>) => string = typed(
  { messages: { greeting: 'Hello' } },
  (key) => key,
)
export const language: Locale | undefined = undefined
