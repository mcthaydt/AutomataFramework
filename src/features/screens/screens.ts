// The screens feature's entry: the screens a player sees around the game (warnings, splash, menus, pause, done, settings),
// each one a `.ts` that says what it shows and a `.svelte` that draws it from the kit. `show` puts any of them over a mount.
import type { Frames } from '../../lib/frames.ts'
import type { PadLike } from '../input/input.ts'
import type { Locale } from '../locale/locale.ts'
import { doneScreen } from './done.ts'
import { lostScreen } from './lost.ts'
import { menuScreen } from './menu.ts'
import { pauseScreen } from './pause.ts'
import { playersScreen } from './players.ts'
import { problemScreen } from './problem.ts'
import { savesScreen } from './saves.ts'
import { settingsScreen } from './settings.ts'
import { splashScreen } from './splash.ts'
import { warningsScreen } from './warnings.ts'

export { doneScreen } from './done.ts'
export { hud } from './hud.ts'
export { lostScreen } from './lost.ts'
export { type MenuItem, menuItems, menuScreen } from './menu.ts'
export { type PauseItem, pauseScreen } from './pause.ts'
export { playersScreen } from './players.ts'
export { problemScreen } from './problem.ts'
export { savesScreen } from './saves.ts'
export { type SaveAction, type SaveRow, saveRows, saveSentence } from './saves-rows.ts'
export { settingsScreen } from './settings.ts'
export { type ControlRow, controlRows } from './settings-rows.ts'
export { show } from './show.ts'
export { SPLASH_MS, splashScreen } from './splash.ts'
export { warningsFor, warningsScreen } from './warnings.ts'

/**
 * Every screen the default flow puts up, each a function a game can replace with its own of the same shape (the
 * flow's `screens` option). Each is given what its framework one is, and calls back the same way.
 */
export interface ScreenMakers {
  readonly warnings: typeof warningsScreen
  readonly splash: typeof splashScreen
  readonly menu: typeof menuScreen
  readonly pause: typeof pauseScreen
  readonly done: typeof doneScreen
  readonly lost: typeof lostScreen
  readonly problem: typeof problemScreen
  readonly settings: typeof settingsScreen
  readonly saves: typeof savesScreen
  readonly players: typeof playersScreen
}

/** The framework's own screens. */
export const defaultScreens: ScreenMakers = {
  warnings: warningsScreen,
  splash: splashScreen,
  menu: menuScreen,
  pause: pauseScreen,
  done: doneScreen,
  lost: lostScreen,
  problem: problemScreen,
  settings: settingsScreen,
  saves: savesScreen,
  players: playersScreen,
}

/** A screen on the page. `destroy` takes it off and is safe to call twice. */
export interface Screen {
  destroy(): void
}

/** What every screen is given. */
export interface ScreenBase {
  readonly mount: HTMLElement
  /** The words, and when they change. */
  readonly locale: Pick<Locale, 'words' | 'onChange' | 'language'>
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
  /** For the screen's sounds: `ui.move`, `ui.press`, `ui.back`. */
  readonly onSound?: (event: string) => void
}
