// The screens the flow puts on top of the main menu or the pause screen (settings, saved games, players). Each is made
// when the step says so and taken off when anything changes; none keeps a rule of its own.
import type { Frames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import type { GameContent } from '../content/content.ts'
import { type Game, resolveControls } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import { type Claim, type Controls, createInput, type Input, type PadLike } from '../input/input.ts'
import type { Locale } from '../locale/locale.ts'
import type { Screen, ScreenBase, ScreenMakers } from '../screens/screens.ts'
import type { Party } from './party.ts'
import type { Places } from './places.ts'
import type { Progress } from './progress.ts'
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
  /** Who is playing. */
  readonly party: () => Party
  /** The saved games. */
  readonly places: Places<Progress>
  /** Starts `level`: a saved game was opened, or a new one begun. */
  readonly play: (level: string) => void
  /** Whatever went wrong, as the flow's problem screen. */
  readonly fail: (error: unknown) => void
  /** The way back to the menu or the pause screen. */
  readonly back: () => void
}

/** Whether a finger is what touches this device. */
const coarse = (): boolean => window.matchMedia('(pointer: coarse)').matches

/** Makes the screens on top, and takes the one that is there off. */
export function createOvers(context: OverContext): { open(over: Over): void; close(): void } {
  let shown: Screen | undefined

  /**
   * The input a screen on top uses: the running game's own (from pause), else one made for the screen (from the main
   * menu), with the party in it. The screen's own has no touch buttons to show: its mount is a box nobody sees.
   */
  function inputForScreen(): { readonly input: Input; readonly release: () => void } {
    const running = context.game()
    if (running !== undefined) return { input: running.input, release: () => {} }
    const sections = context.sections()
    const locale = context.locale()
    const made = createInput({
      mount: document.createElement('div'),
      controls: resolveControls('startFlow', context.content(), context.controls),
      frames: context.frames,
      words: locale.words,
      settings: sections.controls.get(),
      ...(context.gamepads === undefined ? {} : { gamepads: context.gamepads }),
    })
    const members = context.party().members()
    made.setPlayers(members.map((member) => member.player))
    for (const { player, claim } of members) if (claim !== undefined) made.claim(player, claim)
    const stopSaving = made.onBindings((changed) => void sections.controls.set(changed))
    const stopWords = locale.onChange(() => made.relabel(locale.words))
    return {
      input: made,
      release: () => {
        stopSaving()
        stopWords()
        made.destroy()
      },
    }
  }

  /** The settings, on the game's own input or one made for the screen. */
  function settings(): Screen {
    const sections = context.sections()
    const { input, release } = inputForScreen()
    const audio = context.audio()
    const members = context.party().members()
    const screen = context.makers.settings({
      ...context.base(),
      locale: context.locale(),
      ...(audio === undefined || audio.silent ? {} : { audio, sound: sections.sound }),
      input,
      touch: sections.touch,
      onVibration: (on) => context.game()?.setVibration(on),
      canBuzz: context.host.canBuzz,
      coarse: coarse(),
      ...(sections.settings.problem === undefined ? {} : { problem: sections.settings.problem }),
      sharing: members.some((member) => member.claim === 'keyboard'),
      onBack: context.back,
    })
    return {
      destroy() {
        screen.destroy()
        release()
      },
    }
  }

  /** The saved games: open one, begin a new game in a place, or empty a place. */
  function saves(): Screen {
    const { places } = context
    const unread = places.problem()
    // After a place is emptied the list is drawn again, unless the player has gone on to something else meanwhile.
    const again = (): void => {
      if (shown !== made) return
      shown?.destroy()
      shown = saves()
    }
    const made: Screen = context.makers.saves({
      ...context.base(),
      slots: places.slots(),
      ...(unread === undefined ? {} : { problem: unread }),
      onContinue: (slot) => {
        places.open(slot).then(context.play, context.fail)
      },
      onNew: (slot) => {
        places.begin(slot).then(() => context.play(context.content().project.start), context.fail)
      },
      onErase: (slot) => {
        places
          .erase(slot)
          .then(() => places.refresh())
          .then(again, context.fail)
      },
      onBack: context.back,
    })
    return made
  }

  /** Add a player: a gamepad's button or Enter, then the screen says who is in; from pause the hero comes at once. */
  function players(refused?: string, kept?: ReadonlySet<number>): Screen {
    const party = context.party()
    const { input, release } = inputForScreen()
    const words = context.locale().words
    // The gamepad whose button opened this screen is the one navigating it, and its next press is "Done", not a person
    // arriving: it never joins. (Everyone else's first press does.)
    const navigating = new Set(kept)
    for (const [index, pad] of (context.gamepads?.() ?? []).entries())
      if (pad?.buttons.some((button) => button.pressed)) navigating.add(index)
    const keyboardIsFree = !party.members().some((member) => member.claim === 'keyboard')
    const canShare =
      keyboardIsFree && Object.values(input.controls()).every((one) => one.shared !== undefined)
    // The screen is drawn again with who is in now, unless the player has gone on to something else meanwhile.
    const again = (said?: string): void => {
      if (shown !== mine) return
      shown?.destroy()
      shown = players(said, navigating)
    }
    /** The sentence for a try that was refused. */
    const sentence = (claim: Claim): string =>
      party.members().length >= party.room
        ? words('automata.join.full', { count: party.room })
        : words(`automata.join.taken.${claim === 'keyboard' ? 'keyboard' : 'gamepad'}`)
    const join = (claim: Claim): void => {
      // A running game says yes or no for itself, in the player's words; the party follows it.
      const answer = context.game()?.addPlayer(claim)
      if (answer !== undefined && !answer.ok) {
        again(answer.message)
        return
      }
      if (party.join(claim) === undefined) {
        again(sentence(claim))
        return
      }
      again()
    }
    const made = context.makers.players({
      ...context.base(),
      players: party.members().map((member) => member.player),
      canShare,
      ...(refused === undefined ? {} : { refused }),
      invite: (onPad) =>
        input.invite((pad) => {
          if (!navigating.has(pad)) onPad(pad)
        }),
      onJoin: join,
      onDone: context.back,
    })
    const mine: Screen = {
      destroy() {
        made.destroy()
        release()
      },
    }
    return mine
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
      else if (over === 'saves') shown = saves()
      else shown = players()
    },
  }
}
