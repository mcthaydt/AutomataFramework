// The game feature's entry: `startGame` puts a loaded game on a page. It is only wiring: each tick it asks the input
// what the player holds, steps the sim through the recorder (so the play can be replayed), and gives the renderer what
// changed. The sim decides everything; this file decides when.
import { createRecorder, type Replay } from '../commands/commands.ts'
import type { Host } from '../host/host.ts'
import { type Controls, checkControls, createInput } from '../input/input.ts'
import { createGameSim, type GameSimOptions, levelSize } from '../level/level.ts'
import { createRenderer } from '../render/render.ts'
import type { Sim } from '../sim/sim.ts'
import { createLoop, type Frames } from './loop.ts'

export { type Frames, MAX_STEPS_PER_FRAME } from './loop.ts'

export interface GameOptions extends GameSimOptions {
  /** The element the game fills: a canvas, and the touch buttons on top of it. */
  readonly mount: HTMLElement
  readonly controls: Controls
  readonly host: Host
  /** Default: the page's animation frames. */
  readonly frames?: Frames
}

export interface Game {
  readonly sim: Sim
  /** Holds the game still until `resume`. The game is also still while the host says it is not on screen. */
  pause(): void
  resume(): void
  /** The play so far, from tick 0. Not available after `stop`, which disposes the sim. */
  replay(): Replay
  /** Stops the loop, removes the canvas and the controls, and disposes the sim. Safe to call twice. */
  stop(): void
}

const pageFrames: Frames = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
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
    const renderer = await createRenderer({ mount, world: levelSize(level) })
    cleanup = () => {
      renderer.destroy()
      sim.dispose()
    }
    const input = createInput({ mount, controls, player: 1 })
    cleanup = () => {
      input.destroy()
      renderer.destroy()
      sim.dispose()
    }
    const recorder = createRecorder(sim)
    const loop = createLoop({
      tickHz: sim.tickHz,
      step() {
        renderer.apply(recorder.step(input.poll(sim.tick)).render)
      },
      draw: (alpha) => renderer.draw(alpha),
      frames,
    })

    let pausedByHand = false
    let stopped = false
    // Still while paused by hand or off screen. Starting the loop afresh each time means the time spent still is
    // never counted, so coming back never fast-forwards.
    const sync = (): void => {
      if (stopped) return
      if (pausedByHand || !host.visible()) loop.stop()
      else loop.start()
    }
    const unlisten = host.onVisibility(sync)
    sync()

    return {
      sim,
      pause() {
        pausedByHand = true
        sync()
      },
      resume() {
        pausedByHand = false
        sync()
      },
      replay: () => recorder.replay(),
      stop() {
        if (stopped) return
        stopped = true
        loop.stop()
        unlisten()
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
