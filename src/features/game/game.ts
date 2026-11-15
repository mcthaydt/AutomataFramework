// The game feature's entry: `startGame` puts a loaded game on a page. It is only wiring: each tick it asks the input
// what the player holds, steps the sim through the recorder (so the play can be replayed), and gives the renderer what
// changed. The sim decides everything; this file decides when.

import { type Frames, pageFrames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import { createRecorder, createSequence, type Replay } from '../commands/commands.ts'
import { moveNumbersOf } from '../content/content.ts'
import type { Host } from '../host/host.ts'
import {
  type Claim,
  type Controls,
  createInput,
  type Input,
  type PadLike,
  touchSettingsOf,
} from '../input/input.ts'
import { createGameSim, type GameSimOptions, levelSize, skyOf, tuneCommand } from '../level/level.ts'
import type { Locale } from '../locale/locale.ts'
import { createRenderer, type HeroBox, type ReadPicture } from '../render/render.ts'
import type { Command, Sim } from '../sim/sim.ts'
import { soundNotice } from '../web/web.ts'
import { levelArt } from './art.ts'
import { createBuzzer } from './buzz.ts'
import { resolveControls } from './controls.ts'
import { requireLanguage } from './language.ts'
import { createLoop } from './loop.ts'
import { createPlayers, type JoinAnswer } from './players.ts'
import { thumbsOf, wireTouchRoom } from './thumb-wiring.ts'

export { type Frames, MAX_STEPS_PER_FRAME } from './loop.ts'
export { type OnlineGame, type OnlineOptions, startOnlineGame } from './online.ts'
export type { JoinAnswer } from './players.ts'
export { type Watch, type WatchOptions, WatchSetupError, watchReplay } from './watch.ts'

export interface GameOptions extends GameSimOptions {
  /** The element the game fills: a canvas, and the touch buttons on top of it. */
  readonly mount: HTMLElement
  /**
   * The game's controls. Optional for a game whose hero has `moves`: its tuning file lists them (or the framework's four
   * stand in), and a list in the file wins over this.
   */
  readonly controls?: Controls
  readonly host: Host
  /** Default: the page's animation frames. */
  readonly frames?: Frames
  /** Saved bindings (`game.input.settings()` from an earlier run). */
  readonly settings?: unknown
  /** Only for tests: stands in for the browser's gamepads. */
  readonly gamepads?: () => readonly (PadLike | null)[]
  /**
   * The game's sound. Each step's tick and events are given to it, and `level.started` is raised once the level is on
   * screen. The game never stops it: the code that made it owns it, so music can carry over to the next level.
   */
  readonly audio?: GameAudio
  /**
   * With `audio`, the button that says the sound is waiting for a tap. A string is its words; `false` shows none, for
   * a game whose own screen says it. Default: the framework's button, "Tap to start the sound", in `locale`'s
   * language.
   */
  readonly soundNotice?: string | false
  /**
   * Fetches a picture of the game by its path, like `content/figures/hero.png`. Needed when the game has pictures (a
   * figure, a tileset or a backdrop): they are loaded and checked before anything is put on the page, and a picture that
   * is missing, old or the wrong size stops the game with one sentence that says what to run. A game with no pictures
   * needs none.
   */
  readonly readPicture?: ReadPicture
  /**
   * What the player chose about touch (`TouchSettings`, as the settings file kept it). Anything that does not read as
   * that is the default: swapSides off and vibration on.
   */
  readonly touchSettings?: unknown
  /**
   * The player's language, which the game cannot start without: `startGame` throws if the player has not chosen one
   * (`locale.asked()` is false), so show the language picker first. The touch buttons say `controls.<action>` and
   * `automata.touch.label` in it, a refused `addPlayer` or change of key explains itself in it, the sound's button asks
   * for a tap in it, and all of them change when the player picks another.
   */
  readonly locale: Locale
}

export interface Game {
  readonly sim: Sim
  /** Bindings, capture, invite, seats and hints: everything a settings or "Add a player" screen needs. */
  readonly input: Input
  /** Who is playing, lowest number first. */
  players(): readonly number[]
  /** Adds a player who brings `claim`. Their hero appears on the next tick the game runs. */
  addPlayer(claim: Claim): JoinAnswer
  /** Takes a player out. False, and nothing happens, for the last player or one who is not playing. */
  removePlayer(player: number): boolean
  /** Holds the game still until `resume`. The game is also still while the host says it is not on screen. */
  pause(): void
  resume(): void
  /**
   * Every hero as its box on the canvas, in CSS pixels from the mount's top left corner, lowest player first. New after
   * each draw, so read it after one. Empty in a game whose heroes have no figure and whose levels have no view: the
   * renderer tells a hero from a crate by the sprite, which such a game does not have.
   */
  heroes(): readonly HeroBox[]
  /** The player's setting: whether the device may buzz when a feel file says so. */
  setVibration(on: boolean): void
  /**
   * For an editor: the hero's built-in numbers by id (`{ 'jump-speed': 13 }`), from the next tick, with nothing else
   * reset. A number left out is the framework's value, so pass them all. Only in a game started with `tunable: true`;
   * a game itself never needs it, because its numbers are its tuning file. While the game is paused, the tune waits and
   * lands on the first tick after `resume`; after `stop` it does nothing.
   */
  tune(values: Readonly<Record<string, number>>): void
  /** The play so far, from tick 0. Not available after `stop`, which disposes the sim. */
  replay(): Replay
  /** Stops the loop, removes the canvas and the controls, and disposes the sim. Safe to call twice. */
  stop(): void
}

/**
 * Starts a game for local player 1 and returns once it is on screen. Throws, before anything is put on the page, if
 * the controls are wrong; if the level cannot be loaded or drawn, nothing is left behind.
 */
export async function startGame(options: GameOptions): Promise<Game> {
  const { mount, host, locale, frames = pageFrames } = options
  // First, so a mistake in the controls costs nothing: no sim, no canvas.
  const controls = resolveControls('startGame', options.content, options.controls)
  requireLanguage(locale)
  const sim = await createGameSim(options)
  // What to undo if a later step fails; it grows as things are made.
  let cleanup = (): void => sim.dispose()
  try {
    const level = options.content.levels[options.level ?? options.content.project.start]
    if (level === undefined) throw new Error('The level this game opens is missing.')
    // The pictures first: a game that cannot be drawn leaves nothing on the page.
    const art = await levelArt(
      'startGame',
      options.content,
      options.level ?? options.content.project.start,
      options.readPicture,
    )
    cleanup = () => {
      art?.destroy()
      sim.dispose()
    }
    const renderer = await createRenderer({
      mount,
      world: levelSize(level),
      sky: skyOf(level),
      art,
      view: level.view,
    })
    cleanup = () => {
      renderer.destroy()
      sim.dispose()
    }
    // One count of command numbers for the input's `controls` and the game's `join` and `leave`.
    const sequence = createSequence()
    const thumbs = thumbsOf(options.content)
    const input = createInput({
      mount,
      controls,
      frames,
      sequence,
      words: locale.words,
      ...(thumbs === undefined ? {} : { thumbs }),
      ...(options.settings === undefined ? {} : { settings: options.settings }),
      ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
    })
    // A new language says the touch buttons again. Stopped with the game.
    const unfollow = locale.onChange(() => input.relabel(locale.words))
    cleanup = () => {
      unfollow?.()
      input.destroy()
      renderer.destroy()
      sim.dispose()
    }
    // The touch controls take the bottom of the screen; the level is fitted above them, so a thumb never hides it.
    input.setSwapSides(touchSettingsOf(options.touchSettings).swapSides)
    wireTouchRoom(input, renderer, level.view !== undefined)
    input.setPlayers(options.players ?? [1])
    const levelId = options.level ?? options.content.project.start
    // The level and the players are written into the recording, so `automata replay` can set the same game up.
    // A tunable game says so, so `automata replay` and `watchReplay` make the same sim, which can read a `tune`.
    const recorder = createRecorder(sim, {
      meta: {
        level: levelId,
        players: (options.players ?? [1]).join(','),
        ...(options.tunable === true ? { tunable: 'true' } : {}),
      },
    })
    // The latest tune not yet sent: two before one step are one command, with the later values.
    let waiting: ReturnType<typeof moveNumbersOf> | undefined
    const people = createPlayers({
      sim,
      content: options.content,
      level: levelId,
      input,
      sequence,
      canShare: Object.values(input.controls()).every((control) => control.shared !== undefined),
      words: locale.words,
    })
    const { audio } = options
    const buzzer = createBuzzer({
      content: options.content,
      host,
      device: (player) => input.device(player),
      tickHz: sim.tickHz,
      on: touchSettingsOf(options.touchSettings).vibration,
    })
    const loop = createLoop({
      tickHz: sim.tickHz,
      step() {
        const tick = sim.tick
        const tune: Command[] = waiting === undefined ? [] : [tuneCommand(tick, sequence.next(0), waiting)]
        waiting = undefined
        const result = recorder.step([...tune, ...people.commands(tick), ...input.poll(tick)])
        renderer.apply(result.render)
        // Only the tick and the events: the audio is never handed the sim, the render delta or the commands.
        audio?.hear({ tick: result.tick, events: result.events })
        buzzer.hear(result)
        people.afterStep()
      },
      draw: (alpha) => renderer.draw(alpha),
      frames,
    })

    let pausedByHand = false
    // While held, nobody is holding anything: what is down when the game comes back waits for a fresh press.
    let unsilence: (() => void) | undefined
    let stopped = false
    // Still while paused by hand or off screen. Starting the loop afresh each time means the time spent still is
    // never counted, so coming back never fast-forwards.
    const sync = (): void => {
      if (stopped) return
      if (pausedByHand || !host.visible()) loop.stop()
      else loop.start()
    }
    const unlisten = host.onVisibility(sync)
    // The level is on screen: a new sim is about to be heard, and the page says the level started.
    audio?.begin()
    audio?.raise('level.started')
    // The notice is the last thing put on the page, so a failure above leaves nothing of it behind.
    const removeNotice =
      audio !== undefined && options.soundNotice !== false
        ? soundNotice({
            mount,
            audio,
            locale,
            ...(typeof options.soundNotice === 'string' ? { words: options.soundNotice } : {}),
          })
        : undefined
    sync()

    return {
      sim,
      input,
      players: people.players,
      addPlayer: people.addPlayer,
      removePlayer: people.removePlayer,
      pause() {
        pausedByHand = true
        unsilence ??= input.silence()
        sync()
      },
      resume() {
        pausedByHand = false
        unsilence?.()
        unsilence = undefined
        sync()
      },
      heroes: () => renderer.heroes(),
      setVibration: (on) => buzzer.setOn(on),
      tune(values) {
        if (options.tunable !== true)
          throw new Error(
            'This game was not started with "tunable": true, so its numbers cannot change while it plays.',
          )
        if (!stopped) waiting = moveNumbersOf(values)
      },
      replay: () => recorder.replay(),
      stop() {
        if (stopped) return
        stopped = true
        loop.stop()
        unlisten()
        removeNotice?.()
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
