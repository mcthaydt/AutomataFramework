// A level on the page: the game, the pause button over it, the pause screen and the wiring that ends the level. It
// moved out of `flow.ts` so that file only connects the steps; this one is what `playing` and `paused` do. Everything
// it needs from the visit comes in as a function, so a late answer for a step already left can be told by `epoch`.
import type { Frames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import type { GameContent } from '../content/content.ts'
import { type Game, startGame } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import type { Locale } from '../locale/locale.ts'
import {
  hud,
  type PauseItem,
  type Screen,
  type ScreenBase,
  type ScreenMakers,
} from '../screens/screens.ts'
import { endsLevel } from './loading.ts'
import type { Party } from './party.ts'
import type { Places } from './places.ts'
import type { Progress } from './progress.ts'
import type { Sections } from './sections.ts'
import type { FlowEvent } from './steps.ts'
import type { FlowOptions } from './types.ts'

/** What a level on the page needs from the visit around it. */
export interface PlayDeps {
  readonly options: Pick<FlowOptions, 'plugins' | 'controls' | 'readPicture' | 'gamepads'>
  readonly mount: HTMLElement
  readonly host: Host
  readonly frames: Frames
  readonly makers: ScreenMakers
  readonly places: Pick<Places<Progress>, 'progress' | 'refresh' | 'openNewest'>
  readonly content: () => GameContent
  readonly locale: () => Locale
  readonly sections: () => Sections | undefined
  readonly audio: () => GameAudio | undefined
  readonly party: () => Party | undefined
  readonly base: () => ScreenBase
  /** The visit is over. */
  readonly stopped: () => boolean
  /** The step being shown now; an answer for another one is dropped. */
  readonly epoch: () => number
  readonly dispatch: (event: FlowEvent) => void
  readonly fail: (error: unknown, lines?: readonly string[]) => void
  /** Takes the screen on show off the page. */
  readonly dropScreen: () => void
  /** Puts `screen` on show: the one the next step takes off. */
  readonly setScreen: (screen: Screen) => void
}

/** What the flow does with a level. */
export interface Play {
  /** The running game: only in `playing`, `paused`, `done` and `lost`. */
  game(): Game | undefined
  /** Starts `level` and puts the game on the page. `mine` is the epoch it was asked for in. */
  start(level: string, mine: number): Promise<void>
  /** The pause button over the game goes, and the game stands still. */
  hold(): void
  /** The game goes on, with its pause button. */
  resume(): void
  /** The pause screen, with who can be added or taken out; drawn again when someone is. */
  showPause(): void
  /** The line that says a tap takes over, over a game that plays itself (watch mode). */
  watchOverlay(take: () => void): void
  /** The pause button and the numbers over the heroes go. */
  dropOverlay(): void
  /** The game and what is over it go. */
  stop(): void
}

export function createPlay(deps: PlayDeps): Play {
  const { options, mount, host, frames, makers } = deps
  let game: Game | undefined
  let overlay: ReturnType<typeof hud> | undefined
  let overlayFrame: number | undefined
  let letGoOfGame = (): void => {}

  const dropOverlay = (): void => {
    if (overlayFrame !== undefined) frames.cancel(overlayFrame)
    overlayFrame = undefined
    overlay?.destroy()
    overlay = undefined
  }

  const stop = (): void => {
    letGoOfGame()
    letGoOfGame = (): void => {}
    dropOverlay()
    game?.stop()
    game = undefined
  }

  /** The hero's pause button and numbers, drawn again after each frame. */
  function putOverlay(): void {
    if (game === undefined) return
    const running = game
    overlay = hud({
      ...deps.base(),
      jumpSide: () => (running.input.swapSides() ? 'left' : 'right'),
      onPause: () => deps.dispatch({ type: 'pause' }),
      heroes: () => running.heroes(),
    })
    const draw = (): void => {
      overlay?.draw()
      overlayFrame = frames.request(draw)
    }
    overlayFrame = frames.request(draw)
  }

  function showPause(): void {
    const party = deps.party()
    const members = party?.members() ?? []
    const items: PauseItem[] = ['resume']
    if (members.length < (party?.room ?? 1)) items.push('add-player')
    items.push('settings', 'leave')
    deps.dropScreen()
    deps.setScreen(
      makers.pause({
        ...deps.base(),
        items,
        removable: members.filter((member) => member.player !== 1).map((member) => member.player),
        onPick: (item) => {
          if (item === 'resume') deps.dispatch({ type: 'resume' })
          else if (item === 'add-player') deps.dispatch({ type: 'open', over: 'players' })
          else if (item === 'settings') deps.dispatch({ type: 'open', over: 'settings' })
          else if (item === 'leave') deps.dispatch({ type: 'leave' })
        },
        onRemove: (player) => {
          game?.removePlayer(player)
          party?.leave(player)
          showPause()
        },
      }),
    )
  }

  async function start(level: string, mine: number): Promise<void> {
    const loaded = deps.content()
    const heard = deps.locale()
    stop()
    deps.dropScreen()
    if (deps.places.progress() === undefined) {
      // A visitor who took over a watching game plays what the menu's first action would have opened: the newest saved
      // game, or a new one when there is none.
      await deps.places.refresh()
      await deps.places.openNewest()
    }
    const sections = deps.sections()
    const audio = deps.audio()
    try {
      const started = await startGame({
        content: loaded,
        mount,
        host,
        locale: heard,
        frames,
        level,
        players: (deps.party()?.members() ?? [{ player: 1 }]).map((member) => member.player),
        ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
        ...(options.controls === undefined ? {} : { controls: options.controls }),
        ...(options.readPicture === undefined ? {} : { readPicture: options.readPicture }),
        ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
        ...(audio === undefined ? {} : { audio }),
        ...(sections === undefined
          ? {}
          : { settings: sections.controls.get(), touchSettings: sections.touch.get() }),
        soundNotice: false,
      })
      if (deps.stopped() || deps.epoch() !== mine) {
        started.stop()
        return
      }
      game = started
      // Each player who brought a device keeps it from level to level.
      for (const { player, claim } of deps.party()?.members() ?? []) {
        if (claim !== undefined) started.input.claim(player, claim)
      }
      const done = loaded.project.done
      const off: (() => void)[] = [
        started.input.onBindings((changed) => void sections?.controls.set(changed)),
        started.onStep((step) => {
          if (endsLevel(done, step.events)) deps.dispatch({ type: 'level-done' })
        }),
        // The player is told in words, not in the rule's own message; the loop has thrown that one to the console.
        started.onBroken((error) => deps.fail(error, [])),
        started.input.onMenu((press) => {
          if (press === 'pause') deps.dispatch({ type: 'pause' })
        }),
        // A page that is hidden pauses the game and it stays paused when the page comes back: a thumb that was on the
        // screen may not be there now, so the player says when to go on.
        host.onVisibility((visible) => {
          if (!visible) deps.dispatch({ type: 'pause' })
        }),
      ]
      // Escape pauses, heard on the window as the game's own keys are: a tap on the canvas leaves the focus outside
      // the mount, so a key listener on the mount would never hear it. It is heard first (capturing, and before the
      // screens made later), so on the pause screen the same Escape that keeps playing does not pause again.
      const onEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && !event.repeat) deps.dispatch({ type: 'pause' })
      }
      window.addEventListener('keydown', onEscape, { capture: true })
      letGoOfGame = () => {
        window.removeEventListener('keydown', onEscape, { capture: true })
        for (const release of off) release()
      }
      putOverlay()
    } catch (error) {
      deps.fail(error)
    }
  }

  return {
    game: () => game,
    start,
    hold() {
      game?.pause()
      dropOverlay()
    },
    resume() {
      game?.resume()
      putOverlay()
    },
    showPause,
    watchOverlay(take) {
      overlay = hud({
        ...deps.base(),
        jumpSide: () => 'right',
        onPause: () => {},
        watching: { onTake: take },
      })
    },
    dropOverlay,
    stop,
  }
}
