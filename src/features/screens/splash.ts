// The splash: the game's own picture, or else its name, for two seconds. Any press on the screen, any key and any pad
// button ends it at once. It is the game's, never the framework's: a game that names no picture shows its name.
import type { Component } from 'svelte'
import { pageFrames } from '../../lib/frames.ts'
import { padMenu } from '../input/input.ts'
import SplashPart from './Splash.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** How long the splash stays when nobody presses anything. */
export const SPLASH_MS = 2000

/** What the splash draws: the name, and the picture (as a URL) when there is one. */
export type SplashProps = {
  readonly name: string
  readonly src?: string
}

const Part: Component<SplashProps> = SplashPart as never

/**
 * The splash. `onDone` is called once: after `SPLASH_MS` measured on `frames` (a time when the page is hidden is not
 * counted), or at the first press, key or pad button, whichever is first. A key or pad button already held when it
 * appears is not a press.
 */
export function splashScreen(
  options: ScreenBase & {
    /** The game's name: shown in big letters with no picture, and the picture's name for a screen reader with one. */
    readonly name: string
    /** The painted picture of the figure `automata.toml` names, when it names one. */
    readonly picture?: Blob
    readonly onDone: () => void
  },
): Screen {
  const { mount, name, onDone } = options
  const frames = options.frames ?? pageFrames
  const src = options.picture === undefined ? undefined : URL.createObjectURL(options.picture)
  const screen = show(Part, { ...options, name: 'splash' }, () => ({
    name,
    ...(src === undefined ? {} : { src }),
  }))

  let finished = false
  let frame: number | undefined
  // The time the splash has been up, counted from the frames it sees. Hiding or showing the page starts counting again
  // from the next frame, so the time between is not counted whatever the page's frames did meanwhile.
  let elapsed = 0
  let last: number | undefined
  const pads = padMenu({
    frames,
    ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
  })

  const end = (): void => {
    if (finished) return
    finished = true
    onDone()
  }
  const tick = (ms: number): void => {
    frame = undefined
    if (finished) return
    if (last !== undefined) elapsed += ms - last
    last = ms
    if (elapsed >= SPLASH_MS) {
      end()
      return
    }
    frame = frames.request(tick)
  }
  const onKey = (event: KeyboardEvent): void => {
    // A key held from the last screen repeats; only a fresh press ends the splash.
    if (!event.repeat) end()
  }
  const onVisibility = (): void => {
    last = undefined
  }
  frame = frames.request(tick)
  const stopPads = pads.on(end)
  mount.addEventListener('pointerdown', end)
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)

  let destroyed = false
  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      finished = true
      if (frame !== undefined) frames.cancel(frame)
      frame = undefined
      stopPads()
      pads.destroy()
      mount.removeEventListener('pointerdown', end)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
      screen.destroy()
      if (src !== undefined) URL.revokeObjectURL(src)
    },
  }
}
