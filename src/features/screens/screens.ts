// The screens feature's entry: the screens a player sees around the game (warnings, splash, menus, pause, done, settings),
// each one a `.ts` that says what it shows and a `.svelte` that draws it from the kit. `show` puts any of them over a mount.
import type { Frames } from '../../lib/frames.ts'
import type { PadLike } from '../input/input.ts'
import type { Locale } from '../locale/locale.ts'

export { show } from './show.ts'
export { SPLASH_MS, splashScreen } from './splash.ts'
export { warningsFor, warningsScreen } from './warnings.ts'

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
