// The screens the flow puts on top of the main menu or the pause screen (settings, saved games, players). Each is made
// when the step says so and taken off when anything changes; none keeps a rule of its own.
import type { Frames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import type { GameContent } from '../content/content.ts'
import { type Game, resolveControls } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import { type Controls, createInput, type Input, type PadLike } from '../input/input.ts'
import type { Locale } from '../locale/locale.ts'
import type { Screen, ScreenBase, ScreenMakers } from '../screens/screens.ts'
import type { Sections } from './sections.ts'
import type { Over } from './steps.ts'

/** What the screens on top are made from: the flow's own things, asked for when a screen opens. */
export interface OverContext {
  readonly makers: ScreenMakers
  readonly base: () => ScreenBase
  readonly locale: () => Locale
  readonly sections: () => Sections
  readonly content: () => GameContent
  readonly audio: () => GameAudio | undefined
  readonly game: () => Game | undefined
  readonly host: Host
  readonly frames: Frames
  readonly controls: Controls | undefined
  readonly gamepads: (() => readonly (PadLike | null)[]) | undefined
  /** Two people share the keyboard. */
  readonly sharing: () => boolean
  /** The way back to the menu or the pause screen. */
  readonly back: () => void
}

/** Whether a finger is what touches this device. */
const coarse = (): boolean => window.matchMedia('(pointer: coarse)').matches

/** Makes the screens on top, and takes the one that is there off. */
export function createOvers(context: OverContext): { open(over: Over): void; close(): void } {
  let shown: Screen | undefined

  /** The settings: on the running game's own input from pause, on one made for the screen from the main menu. */
  function settings(): Screen {
    const { host, sections: settingsOf } = context
    const sections = settingsOf()
    const locale = context.locale()
    const running = context.game()
    let own: Input | undefined
    let stopOwn = (): void => {}
    if (running === undefined) {
      // The screen's own input has no touch buttons to show: its mount is a box nobody sees.
      const made = createInput({
        mount: document.createElement('div'),
        controls: resolveControls('startFlow', context.content(), context.controls),
        frames: context.frames,
        words: locale.words,
        settings: sections.controls.get(),
        ...(context.gamepads === undefined ? {} : { gamepads: context.gamepads }),
      })
      own = made
      const stopSaving = made.onBindings((changed) => void sections.controls.set(changed))
      const stopWords = locale.onChange(() => made.relabel(locale.words))
      stopOwn = () => {
        stopSaving()
        stopWords()
        made.destroy()
      }
    }
    const input = running?.input ?? (own as Input)
    const audio = context.audio()
    const screen = context.makers.settings({
      ...context.base(),
      locale,
      ...(audio === undefined || audio.silent ? {} : { audio, sound: sections.sound }),
      input,
      touch: sections.touch,
      onVibration: (on) => context.game()?.setVibration(on),
      canBuzz: host.canBuzz,
      coarse: coarse(),
      ...(sections.settings.problem === undefined ? {} : { problem: sections.settings.problem }),
      sharing: context.sharing(),
      onBack: context.back,
    })
    return {
      destroy() {
        screen.destroy()
        stopOwn()
      },
    }
  }

  const close = (): void => {
    shown?.destroy()
    shown = undefined
  }
  return {
    close,
    open(over) {
      close()
      if (over === 'settings') shown = settings()
    },
  }
}
