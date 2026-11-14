// The game feature's entry: `startGame` puts a loaded game on a page. It is only wiring: each tick it asks the input
// what the player holds, steps the sim through the recorder (so the play can be replayed), and gives the renderer what
// changed. The sim decides everything; this file decides when.

import { type Frames, pageFrames } from '../../lib/frames.ts'
import type { GameAudio } from '../audio/audio.ts'
import { createRecorder, createSequence, type Replay } from '../commands/commands.ts'
import type { Host } from '../host/host.ts'
import {
  type Claim,
  type Controls,
  checkControls,
  createInput,
  type Input,
  type PadLike,
} from '../input/input.ts'
import { createGameSim, type GameSimOptions, levelSize, skyOf } from '../level/level.ts'
import { createRenderer } from '../render/render.ts'
import type { Sim } from '../sim/sim.ts'
import { soundNotice } from '../web/web.ts'
import { createLoop } from './loop.ts'
import { createPlayers, type JoinAnswer } from './players.ts'

export { type Frames, MAX_STEPS_PER_FRAME } from './loop.ts'
export { type OnlineGame, type OnlineOptions, startOnlineGame } from './online.ts'
export type { JoinAnswer } from './players.ts'
export { type Watch, type WatchOptions, WatchSetupError, watchReplay } from './watch.ts'

export interface GameOptions extends GameSimOptions {
  /** The element the game fills: a canvas, and the touch buttons on top of it. */
  readonly mount: HTMLElement
  readonly controls: Controls
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
   * a game whose own screen says it. Default: the framework's button, "Tap to start the sound".
   */
  readonly soundNotice?: string | false
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
  const { mount, controls, host, frames = pageFrames } = options
  // First, so a mistake in the controls costs nothing: no sim, no canvas.
  checkControls(controls)
  const sim = await createGameSim(options)
  // What to undo if a later step fails; it grows as things are made.
  let cleanup = (): void => sim.dispose()
  try {
    const level = options.content.levels[options.level ?? options.content.project.start]
    if (level === undefined) throw new Error('The level this game opens is missing.')
    const renderer = await createRenderer({ mount, world: levelSize(level), sky: skyOf(level) })
    cleanup = () => {
      renderer.destroy()
      sim.dispose()
    }
    // One count of command numbers for the input's `controls` and the game's `join` and `leave`.
    const sequence = createSequence()
    const input = createInput({
      mount,
      controls,
      frames,
      sequence,
      ...(options.settings === undefined ? {} : { settings: options.settings }),
      ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
    })
    cleanup = () => {
      input.destroy()
      renderer.destroy()
      sim.dispose()
    }
    // The touch buttons take the bottom of the screen; the level is fitted above them, so a thumb never hides it.
    renderer.setInset(input.inset())
    input.onInset((px) => renderer.setInset(px))
    input.setPlayers(options.players ?? [1])
    const recorder = createRecorder(sim)
    const people = createPlayers({
      sim,
      content: options.content,
      level: options.level ?? options.content.project.start,
      input,
      sequence,
      canShare: Object.values(input.controls()).every((control) => control.shared !== undefined),
    })
    const { audio } = options
    const loop = createLoop({
      tickHz: sim.tickHz,
      step() {
        const tick = sim.tick
        const result = recorder.step([...people.commands(tick), ...input.poll(tick)])
        renderer.apply(result.render)
        // Only the tick and the events: the audio is never handed the sim, the render delta or the commands.
        audio?.hear({ tick: result.tick, events: result.events })
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
