// The settings screen: language, sound, touch and controls in one list, with Back at the top. It keeps no setting of
// its own: each change goes to the handle or the input it was given, and the screen says only what the player needs to
// know (a key that was refused, a change the browser did not keep).
import type { Component } from 'svelte'
import type { Words } from '../../lib/message.ts'
import type { GameAudio, SoundSettings } from '../audio/audio.ts'
import type { Language } from '../content/content.ts'
import type { BindingSlot, Input, TouchSettings } from '../input/input.ts'
import { LANGUAGE_NAMES, LANGUAGE_TAGS, type Locale } from '../locale/locale.ts'
import type { SaveProblem, SettingsHandle } from '../saves/saves.ts'
import { type ControlRow, controlRows } from './settings-rows.ts'
import SettingsPart from './Settings.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** One flag the player can choose. */
export type LanguageChoice = {
  readonly language: Language
  /** The language's own name: what a screen reader says for its flag. */
  readonly name: string
  readonly tag: string
  readonly chosen: boolean
}

/** A slider: its words, where it is and what to do when it changes and when it is let go. */
export type SliderView = {
  readonly label: string
  readonly value: number
  readonly onchange: (value: number) => void
  readonly onrelease: (value: number) => void
}

/** A switch. */
export type ToggleView = {
  readonly label: string
  readonly on: boolean
  readonly onchange: (on: boolean) => void
}

/** One line of the controls, as the screen draws it. */
export type RowView = {
  readonly id: string
  readonly action: string
  readonly input: string
  readonly change: string
  readonly cancel: string
  /** "Press the new key for Jump.": the row is waiting for the key. */
  readonly waiting?: string
  /** Why the last try was refused, in the player's words. */
  readonly error?: string
  readonly onchange: () => void
  readonly oncancel: () => void
}

/** What the settings screen draws. */
export type SettingsProps = {
  readonly title: string
  readonly back: { readonly label: string; readonly onpress: () => void }
  /** Sentences at the top of the list, each said once. */
  readonly notices: readonly string[]
  /** The parts in the order they are shown. */
  readonly order: readonly ('language' | 'sound' | 'touch' | 'controls')[]
  readonly language: {
    readonly title: string
    readonly choices: readonly LanguageChoice[]
    readonly onchoose: (language: Language) => void
  }
  /** Left out for a game with no sound. */
  readonly sound?: {
    readonly title: string
    readonly music: SliderView
    readonly effects: SliderView
    /** "Tap anywhere to start the sound.", or that this browser cannot play any. */
    readonly note?: string
  }
  readonly touch: { readonly title: string; readonly swap: ToggleView; readonly vibration?: ToggleView }
  readonly controls: {
    readonly title: string
    readonly gamepadTitle: string
    readonly keyboardTitle: string
    /** The gamepad's rows; empty (and not drawn) when no gamepad is connected. */
    readonly gamepad: readonly RowView[]
    readonly keyboard: readonly RowView[]
    readonly reset: { readonly label: string; readonly onpress: () => void }
  }
  /** The question before the controls are put back, while it is asked. */
  readonly asking?: {
    readonly title: string
    readonly yes: string
    readonly no: string
    readonly onyes: () => void
    readonly onno: () => void
  }
}

const Part: Component<SettingsProps> = SettingsPart as never

/** The input's own words for each slot's wait. */
const PRESS: Record<BindingSlot, (words: Words, action: string) => string> = {
  keys: (words, action) => words('automata.settings.press-key', { action }),
  'shared-1': (words, action) => words('automata.settings.press-key', { action }),
  'shared-2': (words, action) => words('automata.settings.press-key', { action }),
  pad: (words, action) => words('automata.settings.press-button', { action }),
}

/**
 * The settings screen. `onBack` is called by Back, Escape and the pad's right button. A change is made at once, in the
 * game that is running if there is one.
 */
export function settingsScreen(
  options: ScreenBase & {
    readonly locale: Locale
    /** Left out, the screen has no Sound part (a game with no cues). */
    readonly audio?: Pick<GameAudio, 'volumes' | 'setVolumes' | 'sample' | 'state' | 'onState'>
    readonly sound?: SettingsHandle<SoundSettings>
    readonly input: Pick<
      Input,
      | 'capture'
      | 'rebind'
      | 'resetBindings'
      | 'controls'
      | 'dropped'
      | 'setSwapSides'
      | 'swapSides'
      | 'pads'
      | 'onPads'
    >
    readonly touch: SettingsHandle<TouchSettings>
    /** Called when Vibration changes, for the running game. */
    readonly onVibration?: (on: boolean) => void
    readonly canBuzz: boolean
    /** The device is touched with a finger: the Touch part comes first, and the keyboard's rows last. */
    readonly coarse: boolean
    /** `settings.problem`, when the settings could not be read. */
    readonly problem?: SaveProblem
    /** Two people share one keyboard. */
    readonly sharing: boolean
    readonly onBack: () => void
  },
): Screen {
  const { locale, audio, sound, input, touch, coarse, canBuzz, sharing } = options
  // What the screen is in the middle of.
  let waiting:
    | { readonly action: string; readonly slot: BindingSlot; readonly cancel: () => void }
    | undefined
  let refused: { readonly action: string; readonly slot: BindingSlot; readonly message: string } | undefined
  let asking = false
  let notKept = false
  const ask = (on: boolean): void => {
    asking = on
    screen.update()
  }

  /** A write the browser did not keep says so once, and the change still holds for the visit. */
  const kept = async (written: Promise<{ readonly ok: boolean }>): Promise<void> => {
    const result = await written
    if (!result.ok && !notKept) {
      notKept = true
      screen.update()
    }
  }

  const stopWaiting = (): void => {
    waiting?.cancel()
    waiting = undefined
  }

  /** Waits for the new key or button of one row, then changes it, or says why not. */
  const change = (row: ControlRow): void => {
    stopWaiting()
    refused = undefined
    const capture = input.capture(row.slot)
    const mine = { action: row.action, slot: row.slot, cancel: () => capture.cancel() }
    waiting = mine
    capture.done.then((answer) => {
      if (waiting !== mine) return
      waiting = undefined
      if (answer.ok) {
        const said = input.rebind(row.action, row.slot, answer.input)
        if (!said.ok) refused = { action: row.action, slot: row.slot, message: said.message }
      }
      screen.update()
    })
    screen.update()
  }

  const screen = show(
    Part,
    {
      ...options,
      name: 'settings',
      onBack: () => {
        stopWaiting()
        options.onBack()
      },
    },
    (words): SettingsProps => {
      const rows = controlRows(input, words, sharing)
      const view = (row: ControlRow): RowView => {
        const mine = waiting?.action === row.action && waiting.slot === row.slot
        const error =
          refused?.action === row.action && refused.slot === row.slot ? refused.message : undefined
        return {
          id: `${row.action}/${row.slot}`,
          action: row.label,
          input: row.input,
          change: words('automata.settings.change'),
          cancel: words('automata.settings.cancel'),
          ...(mine ? { waiting: PRESS[row.slot](words, row.label) } : {}),
          ...(error === undefined ? {} : { error }),
          onchange: () => change(row),
          oncancel: () => {
            stopWaiting()
            screen.update()
          },
        }
      }
      const volumes = audio?.volumes() ?? sound?.get()
      const slider = (bus: 'music' | 'sound', label: string): SliderView => ({
        label,
        value: volumes?.[bus] ?? 1,
        onchange: (value) => {
          if (audio === undefined || sound === undefined) return
          const next: SoundSettings = { ...sound.get(), [bus]: value }
          audio.setVolumes(next)
          void kept(sound.set(next))
        },
        onrelease: () => audio?.sample(bus),
      })
      const state = audio?.state()
      const note =
        state === 'waiting'
          ? words('automata.settings.sound-waiting')
          : state === 'unavailable'
            ? words('automata.settings.sound-none')
            : undefined
      const saved = touch.get()
      const notices = [
        ...(options.problem === undefined ? [] : [words('automata.settings.lost')]),
        ...(input.dropped().length === 0 ? [] : [words('automata.settings.keys-lost')]),
        ...(notKept ? [words('automata.settings.not-kept')] : []),
      ]
      const language = locale.language()
      return {
        title: words('automata.settings.title'),
        back: {
          label: words('automata.back'),
          onpress: () => {
            stopWaiting()
            options.onBack()
          },
        },
        notices,
        order: coarse
          ? ['language', 'sound', 'touch', 'controls']
          : ['language', 'sound', 'controls', 'touch'],
        language: {
          title: words('automata.settings.language'),
          choices: locale.listed().map((one) => ({
            language: one,
            name: LANGUAGE_NAMES[one],
            tag: LANGUAGE_TAGS[one],
            chosen: one === language,
          })),
          onchoose: (one) => void kept(locale.set(one)),
        },
        ...(audio === undefined || sound === undefined
          ? {}
          : {
              sound: {
                title: words('automata.settings.sound'),
                music: slider('music', words('automata.settings.music')),
                effects: slider('sound', words('automata.settings.effects')),
                ...(note === undefined ? {} : { note }),
              },
            }),
        touch: {
          title: words('automata.settings.touch'),
          swap: {
            label: words('automata.settings.swap'),
            on: saved.swapSides,
            onchange: (on) => {
              input.setSwapSides(on)
              void kept(touch.set({ ...touch.get(), swapSides: on }))
            },
          },
          ...(canBuzz
            ? {
                vibration: {
                  label: words('automata.settings.vibration'),
                  on: saved.vibration,
                  onchange: (on: boolean) => {
                    options.onVibration?.(on)
                    void kept(touch.set({ ...touch.get(), vibration: on }))
                  },
                },
              }
            : {}),
        },
        controls: {
          title: words('automata.settings.controls'),
          gamepadTitle: words('automata.settings.gamepad'),
          keyboardTitle: words('automata.settings.keyboard'),
          gamepad: input.pads().some((pad) => pad.usable) ? rows.gamepad.map(view) : [],
          keyboard: rows.keyboard.map(view),
          reset: { label: words('automata.settings.reset'), onpress: () => ask(true) },
        },
        ...(asking
          ? {
              asking: {
                title: words('automata.settings.reset-ask'),
                yes: words('automata.settings.reset-yes'),
                no: words('automata.keep'),
                onyes: () => {
                  input.resetBindings()
                  asking = false
                  screen.update()
                },
                onno: () => ask(false),
              },
            }
          : {}),
      }
    },
  )
  // A gamepad plugged in or out changes the rows, and a binding changed anywhere changes what they say.
  const stops = [input.onPads(() => screen.update())]
  let destroyed = false
  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      stopWaiting()
      for (const stop of stops) stop()
      screen.destroy()
    },
  }
}
