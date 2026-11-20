// The game feature's entry: `startGame` puts a loaded game on a page. It is only wiring: each tick it asks the input
// what the player holds, steps the sim through the recorder (so the play can be replayed), and gives the renderer what
// changed. The sim decides everything; this file decides when.

import { type Frames, pageFrames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import {
  ControlsCommand,
  controlsCommand,
  createRecorder,
  createSequence,
  type Replay,
} from '../commands/commands.ts'
import { scoreRef } from '../content/content.ts'
import type { Host } from '../host/host.ts'
import {
  type Claim,
  type Controls,
  createInput,
  type Input,
  type PadLike,
  touchSettingsOf,
} from '../input/input.ts'
import {
  arriveLine,
  createGameSim,
  factsCommand,
  type GameSimOptions,
  heroLevels,
  levelAt,
  skyOf,
} from '../level/level.ts'
import type { Locale } from '../locale/locale.ts'
import { createRenderer, type HeroBox, type ReadPicture } from '../render/render.ts'
import type { Sim, SimEvent } from '../sim/sim.ts'
import { soundNotice } from '../web/web.ts'
import { levelArt } from './art.ts'
import { createBuzzer } from './buzz.ts'
import { resolveControls } from './controls.ts'
import { guardPlay } from './guard.ts'
import { createKept } from './kept.ts'
import { requireLanguage } from './language.ts'
import { createLoop } from './loop.ts'
import { createPlayers, type JoinAnswer } from './players.ts'
import { watchFirstPress } from './press.ts'
import { followLevel, stageOf } from './stage-of.ts'
import { thumbsOf, wireTouchRoom } from './thumb-wiring.ts'

export { resolveControls } from './controls.ts'
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
  /**
   * What was done for good before this play (`fact.kept` events of an earlier one, like `room-2.gate-1.open`). When it is
   * not empty the game steps tick 0 once, at once, before the first picture, with these and no player's input, so a gate
   * they open is open in the first picture and the first press lands on tick 1. A recording of it carries the one command.
   */
  readonly facts?: readonly string[]
  /**
   * The sim does not step until the first press that begins after the game is shown: a `keydown` that is not a repeat, a
   * gamepad button that was up and goes down, or a `pointerdown`. What was already held when the level appeared never
   * counts. Nothing is silenced once it starts. Default: the game starts at once.
   */
  readonly waitForPress?: boolean
  /**
   * How many seconds of play can be gone back through with `backTo`, a whole number 0 to 60. A snapshot of the sim is kept
   * once a second for them. Default 0: none is kept, and `backTo` has nowhere to go.
   */
  readonly keepSeconds?: number
}

/** A spot in a level: the level's id, and the spot in the level's own tiles from its top left corner. */
export interface LevelSpot {
  readonly level: string
  readonly x: number
  readonly y: number
}

/** One step of the game, as `onStep` tells it: the tick the sim is at after it, and the events it raised in order. */
export interface GameStep {
  readonly tick: number
  readonly events: readonly SimEvent[]
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
   * The project's score now (`score = "hero.score.sparks"` in automata.toml), or `undefined` when the game names none,
   * the resource or the field is not there, or what is there is not a number. After `stop` it is `undefined`.
   */
  score(): number | undefined
  /**
   * The level player 1 is in now: in a place of joined levels, the one they have crossed into, which is not always the
   * one the game was opened at. In a game of one level, that level.
   */
  levelNow(): string
  /** True from the start until the first press, in a game made with `waitForPress`; always false in any other. */
  waiting(): boolean
  /** True between `pause()` and `resume()`: a game still because its page is off screen is not paused by hand. */
  paused(): boolean
  /**
   * While paused by hand: takes exactly one step and draws it. Nobody holds anything while the game is paused (pausing
   * lets go of every key and button), so it is a step with empty hands. Does nothing while the game runs or after it
   * stopped; `onStep` and the sound hear it as they hear any step.
   */
  step(): void
  /**
   * How fast time passes: 1 is the game's own speed, 0.5 and 0.25 are slower. Each step is still the same step, so a
   * slower game plays the same play, only later. Anything but 1, 0.5 or 0.25 throws.
   */
  setSpeed(rate: number): void
  /**
   * The ticks `backTo` can reach: `from` is the oldest, `to` is now. They are equal when nothing is kept (`keepSeconds`
   * is 0, or the play is only just under way).
   */
  kept(): { readonly from: number; readonly to: number }
  /**
   * While paused by hand: the game as it was at `tick`, drawn, and what was played after it is forgotten (`replay()` ends
   * there). Throws while the game runs, and for a tick outside `kept()`. The sound and `onStep` are not told the steps it
   * plays again, and a player who joined or left after `tick` is not undone.
   */
  backTo(tick: number): void
  /**
   * Called after each step with the tick the sim is at after it and the events it raised, in order. The sound is told
   * the same. Returns the function that stops it.
   */
  onStep(listener: (step: GameStep) => void): () => void
  /**
   * What the game's code threw in a step, or `undefined` while it is fine. A broken game never steps again, even when
   * its page comes back on screen; the error is also thrown on, so the page's own handler has it.
   */
  broken(): unknown
  /** Called once, with the error, when the game breaks. Returns the function that stops it. */
  onBroken(listener: (error: unknown) => void): () => void
  /**
   * Every hero as its box on the canvas, in CSS pixels from the mount's top left corner, lowest player first. New after
   * each draw, so read it after one. Empty in a game whose heroes have no figure and whose levels have no view: the
   * renderer tells a hero from a crate by the sprite, which such a game does not have.
   */
  heroes(): readonly HeroBox[]
  /**
   * The level under a point on the mount, and where in it: `x` and `y` in CSS pixels from the mount's top left corner
   * (as `heroes` gives its boxes), and the answer in the level's own tiles from its top left corner, the unit a level
   * file places a thing in. As of the last picture drawn, so it is what the player sees there: whether the camera
   * follows the heroes or the whole level is fitted, at any pixel density, while paused, and at the mount's new size
   * once the picture has been drawn again for it. In a place of joined levels it is whichever level is under the point.
   * `undefined` before the first picture, after `stop`, and where no level is drawn: off the mount, on the strip kept
   * for the touch buttons, in the bars beside a level that does not fill the mount, or in a gap between a place's levels.
   */
  levelAt(x: number, y: number): LevelSpot | undefined
  /** The player's setting: whether the device may buzz when a feel file says so. */
  setVibration(on: boolean): void
  /**
   * The play so far, from tick 0. After `stop`, the play as it was when it stopped. Throws what the game's code threw
   * for a game that broke: its sim is not asked for a hash again.
   */
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
  const keepSeconds = options.keepSeconds ?? 0
  if (!Number.isInteger(keepSeconds) || keepSeconds < 0 || keepSeconds > 60)
    throw new Error(`keepSeconds must be a whole number of seconds, 0 to 60, but it is ${keepSeconds}.`)
  const sim = await createGameSim(options)
  // What to undo if a later step fails; it grows as things are made.
  let cleanup = (): void => sim.dispose()
  try {
    const opened = options.level ?? options.content.project.start
    const level = options.content.levels[opened]
    if (level === undefined) throw new Error('The level this game opens is missing.')
    // The place the level is in: its outline, and each level's offset, sky and view.
    const stage = stageOf(options.content, opened)
    // The pictures first: a game that cannot be drawn leaves nothing on the page.
    const art = await levelArt('startGame', options.content, opened, options.readPicture, stage.simLevels)
    cleanup = () => {
      art?.destroy()
      sim.dispose()
    }
    const renderer = await createRenderer({
      mount,
      world: stage.world,
      sky: skyOf(level),
      art,
      view: level.view,
      levels: stage.levels,
      at: opened,
    })
    const follow = followLevel(renderer, sim, opened, stage.levels)
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
    const levelId = opened
    // The level, the players and where they came in are written into the recording, so `automata replay` can set the
    // same game up.
    const recorder = createRecorder(sim, {
      meta: {
        level: levelId,
        players: (options.players ?? [1]).join(','),
        ...(options.arrive === undefined ? {} : { arrive: arriveLine(options.arrive) }),
      },
    })
    // The snapshots `backTo` goes back to: one is taken now, at tick 0, before the facts step or any press.
    const snapshots = keepSeconds > 0 ? createKept(sim, keepSeconds) : undefined
    snapshots?.note(sim.tick)
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
    const stepListeners = new Set<(step: GameStep) => void>()
    const brokenListeners = new Set<(error: unknown) => void>()
    // Set when a step throws; a broken game is never started again.
    let broke: { readonly error: unknown } | undefined
    const buzzer = createBuzzer({
      content: options.content,
      host,
      device: (player) => input.device(player),
      tickHz: sim.tickHz,
      on: touchSettingsOf(options.touchSettings).vibration,
    })
    // What was done for good: tick 0 is stepped once now, with only the facts, so the first picture already has the gates
    // they open, and a game that waits for a first press waits after this step. The recording holds the one command.
    if (options.facts !== undefined && options.facts.length > 0) {
      renderer.apply(recorder.step([factsCommand([...options.facts])]).render)
      follow()
      snapshots?.note(sim.tick)
    }
    // A level that waits does not step until the first press; the time spent waiting is never owed.
    const first =
      options.waitForPress === true
        ? watchFirstPress({
            mount,
            ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
          })
        : undefined
    // Players the sim still has holding something, after `backTo` put it back to a tick where they did. Nobody holds
    // anything while the game is paused, so the next step lets go for them, unless the input already says so.
    const stillHolding = new Set<number>()
    // One step of the game: the loop's, and the one `step()` takes by hand.
    const takeStep = (): void => {
      const tick = sim.tick
      const polled = input.poll(tick)
      const letGo = [...stillHolding]
        .filter((p) => !polled.some((c) => c.source === p && c.type === ControlsCommand.id))
        .map((p) => controlsCommand(tick, p, sequence.next(p), []))
      stillHolding.clear()
      const result = recorder.step([...people.commands(tick), ...letGo, ...polled])
      snapshots?.note(sim.tick)
      renderer.apply(result.render)
      follow()
      // Only the tick and the events: the audio is never handed the sim, the render delta or the commands.
      audio?.hear({ tick: result.tick, events: result.events })
      buzzer.hear(result)
      people.afterStep()
      for (const listener of [...stepListeners]) listener({ tick: result.tick, events: result.events })
    }
    const failed = (error: unknown): void => {
      broke = { error }
      for (const listener of [...brokenListeners]) listener(error)
    }
    let speed = 1
    const loop = createLoop({
      tickHz: sim.tickHz,
      step() {
        if (first !== undefined && !first.pressed()) return
        takeStep()
      },
      draw(alpha) {
        first?.frame()
        renderer.draw(alpha)
      },
      frames,
      onError: failed,
      rate: () => speed,
    })

    let pausedByHand = false
    // While held, nobody is holding anything: what is down when the game comes back waits for a fresh press.
    let unsilence: (() => void) | undefined
    let stopped = false
    // The play as it was when `stop` was called, once it has been: the sim it came from is gone by then.
    let ended: Replay | undefined
    // Still while paused by hand or off screen. Starting the loop afresh each time means the time spent still is
    // never counted, so coming back never fast-forwards.
    // The screen is kept lit exactly while the loop runs: a paused, hidden or broken game lets it dim.
    const sync = (): void => {
      if (stopped) return
      const still = broke !== undefined || pausedByHand || !host.visible()
      if (still) loop.stop()
      else loop.start()
      host.keepAwake(!still)
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
    // Last of all, like the notice: the browser's own zoom, selection, menus and pull are kept off the game.
    const unguard = guardPlay(mount)
    sync()

    // The tick the play ended at, for `kept()` once `stop()` has taken the sim away.
    let endedAt = 0
    const keptRange = (): { readonly from: number; readonly to: number } => {
      // A stopped or broken game cannot go back, so nothing is kept: the range is the one tick it is at.
      if (stopped) return { from: endedAt, to: endedAt }
      if (broke !== undefined) return { from: sim.tick, to: sim.tick }
      return { from: Math.min(snapshots?.from() ?? sim.tick, sim.tick), to: sim.tick }
    }

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
      step() {
        if (!pausedByHand || stopped || broke !== undefined) return
        try {
          takeStep()
        } catch (error) {
          failed(error)
          sync()
          throw error
        }
        renderer.draw(1)
      },
      setSpeed(rate) {
        if (rate !== 1 && rate !== 0.5 && rate !== 0.25)
          throw new Error(`The speed can be 1, 0.5 or 0.25, but it was ${rate}.`)
        speed = rate
      },
      kept: keptRange,
      backTo(tick) {
        if (stopped || broke !== undefined) throw new Error('This game has stopped, so it cannot go back.')
        if (!pausedByHand)
          throw new Error('Pause the game before going back: backTo works only while it is paused.')
        const { from, to } = keptRange()
        if (!Number.isInteger(tick) || tick < from || tick > to)
          throw new Error(
            from === to
              ? `Nothing is kept to go back to (keepSeconds is ${keepSeconds}, and the game is at tick ${to}).`
              : `Tick ${tick} cannot be gone back to: the ticks kept are ${from} to ${to}.`,
          )
        // Now is always inside `kept()`, and going back to it is staying where it is.
        if (tick === to) return
        const snapshot = snapshots?.nearest(tick)
        if (snapshot === undefined)
          throw new Error(`Tick ${tick} cannot be gone back to: no snapshot is kept before it.`)
        // What was recorded, read before the sim moves: the commands to play again from the snapshot up to `tick`.
        const recorded = recorder.replay().commands
        try {
          sim.restore(snapshot.bytes)
          let next = recorded.findIndex((c) => c.tick >= snapshot.tick)
          if (next < 0) next = recorded.length
          while (sim.tick < tick) {
            const now: (typeof recorded)[number][] = []
            while (next < recorded.length && (recorded[next]?.tick ?? 0) === sim.tick)
              now.push(recorded[next++] as (typeof recorded)[number])
            renderer.apply(sim.step(now).render)
            follow()
          }
        } catch (error) {
          failed(error)
          sync()
          throw error
        }
        recorder.cutTo(tick)
        snapshots?.cutTo(tick)
        const held = new Map<number, boolean>()
        for (const c of recorded)
          if (c.tick < tick && c.type === ControlsCommand.id)
            held.set(c.source, ((c.payload as { held?: unknown[] }).held?.length ?? 0) > 0)
        stillHolding.clear()
        for (const [player, holding] of held) if (holding) stillHolding.add(player)
        renderer.draw(1)
      },
      score() {
        const named = scoreRef(options.content.project)
        if (named === undefined || stopped) return undefined
        const resource = sim.read(named.resource)
        if (typeof resource !== 'object' || resource === null) return undefined
        const value = (resource as Record<string, unknown>)[named.field]
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined
      },
      levelNow() {
        const opened = options.level ?? options.content.project.start
        return heroLevels(sim, opened).find((h) => h.player === 1)?.level ?? opened
      },
      waiting: () => first !== undefined && !first.pressed(),
      paused: () => pausedByHand,
      onStep(listener) {
        stepListeners.add(listener)
        return () => void stepListeners.delete(listener)
      },
      broken: () => broke?.error,
      onBroken(listener) {
        brokenListeners.add(listener)
        return () => void brokenListeners.delete(listener)
      },
      heroes: () => renderer.heroes(),
      levelAt(x, y) {
        if (stopped) return undefined
        const spot = renderer.worldAt(x, y)
        if (spot === undefined) return undefined
        const under = stage.simLevels.find((l) => l.level === levelAt(stage.simLevels, spot.x, spot.y))
        return under === undefined
          ? undefined
          : { level: under.level, x: spot.x - under.x, y: spot.y - under.y }
      },
      setVibration: (on) => buzzer.setOn(on),
      replay: () => ended ?? recorder.replay(),
      stop() {
        if (stopped) return
        endedAt = sim.tick
        stopped = true
        // A game that broke cannot be hashed again, so it keeps no play: `replay()` then says what broke.
        if (broke === undefined) ended = recorder.replay()
        loop.stop()
        first?.stop()
        unlisten()
        host.keepAwake(false)
        unguard()
        removeNotice?.()
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
