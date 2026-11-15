// What `startFlow` takes and gives back.
import type { Frames } from '../../lib/frames.ts'
import type { Speaker } from '../audio/audio.ts'
import type { Replay } from '../commands/commands.ts'
import type { Game } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import type { Controls, PadLike } from '../input/input.ts'
import type { Locale } from '../locale/locale.ts'
import type { ReadPicture } from '../render/render.ts'
import type { SaveResult } from '../saves/saves.ts'
import type { ScreenMakers } from '../screens/screens.ts'
import type { PluginDef } from '../sim/sim.ts'
import type { FlowSave, Progress } from './progress.ts'
import type { FlowState } from './steps.ts'

export interface FlowOptions<S extends Progress = Progress> {
  /** The element the game fills. */
  readonly mount: HTMLElement
  /** The id the game's settings and saved games are kept under. */
  readonly game: string
  /** Reads one of the game's files by its path from the game's root. */
  readonly read: (path: string) => Promise<string>
  readonly readPicture?: ReadPicture
  /** The game's own rules. */
  readonly plugins?: readonly PluginDef[]
  /** Needed only by a game whose hero has no `moves`. */
  readonly controls?: Controls
  /** Default `webHost()`. */
  readonly host?: Host
  /** Default: the framework's `{ level }` in three places. */
  readonly save?: FlowSave<S>
  /** A screen of the game's own in place of the framework's. */
  readonly screens?: Partial<ScreenMakers>
  /** Plays this recording by itself first (watch mode). A function is called once, after the game has loaded. */
  readonly watch?: Replay | (() => Promise<Replay>)
  /** Default `webSpeaker({ host })`. */
  readonly speaker?: Speaker
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
  /** Default: `location.reload()`. */
  readonly reload?: () => void
}

export interface Flow<S extends Progress = Progress> {
  state(): FlowState
  onState(listener: (state: FlowState) => void): () => void
  /** The running game: only in `playing`, `paused` and `done`. A function, as `state` is: it changes. */
  game(): Game | undefined
  /**
   * `undefined` until the game's files have loaded. A new one after a watcher takes over (the watching locale is made
   * again without `watching`), which `followLanguage` and every later screen are given.
   */
  locale(): Locale | undefined
  /** The saved game being played, and a way to change what the game itself keeps in it. */
  progress(): S | undefined
  keep(data: S): Promise<SaveResult>
  /** Watching: the same as a tap on the game. Otherwise nothing. */
  takeOver(): void
  /** Ends the level as the `done` event does. Nothing outside `playing`. */
  finishLevel(): void
  /** Stops everything and empties the mount. Safe to call twice. */
  stop(): void
}
