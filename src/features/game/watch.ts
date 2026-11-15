// `watchReplay` draws a loaded game playing a recording with nobody at the controls. It is `startGame` with the player
// taken out: no input, no touch buttons, no recorder, and the recording's own commands as the only commands. A game
// uses it to show what it plays like before anyone has pressed Play.
//
// It plays whatever the content is now, not what it was when the recording was made: if the level was edited since,
// the same commands lead somewhere else and that is what is shown. Only a different seed or tick rate is refused,
// because then the commands mean something else.
import type { Replay } from '../commands/commands.ts'
import type { FeelFrame } from '../feel/feel.ts'
import type { Host } from '../host/host.ts'
import { createGameSim, type GameSimOptions, skyOf, worldSize } from '../level/level.ts'
import { createRenderer, type HeroBox, type ReadPicture } from '../render/render.ts'
import type { Command, Sim } from '../sim/sim.ts'
import { levelArt } from './art.ts'
import { createFeelWiring } from './feel-wiring.ts'
import { createLoop, type Frames } from './loop.ts'

export interface WatchOptions extends GameSimOptions {
  /** The element the game fills: a canvas and nothing else. */
  readonly mount: HTMLElement
  readonly host: Host
  readonly replay: Replay
  /** Default: the page's animation frames. */
  readonly frames?: Frames
  /** How many times the replay is played before its last picture is held. Default: without end. */
  readonly rounds?: number
  /** How many ticks the last picture is held before the next round. Default: one second (`tickHz`). */
  readonly restTicks?: number
  /** Fetches a picture of the game by its path; needed when the game has pictures, as for `startGame`. */
  readonly readPicture?: ReadPicture
  /** What the player chose about feel, as `GameOptions.feelSettings`. A watched replay shakes and holds, and never buzzes. */
  readonly feelSettings?: unknown
}

export interface Watch {
  readonly sim: Sim
  /** How many rounds have finished. */
  readonly rounds: number
  /** Every hero as its box on the canvas, as `Game.heroes` gives it. */
  heroes(): readonly HeroBox[]
  /** What the last picture drew of the game's feel, as `Game.feel` gives it. */
  feel(): FeelFrame
  /** Stops the loop, removes the canvas and disposes the sim. Safe to call twice. */
  stop(): void
}

/** Thrown before anything is put on the page; the message says what does not match, in words. */
export class WatchSetupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WatchSetupError'
  }
}

const pageFrames: Frames = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
}

/**
 * Starts the recording playing and returns once it is on screen. Throws a `WatchSetupError`, with nothing left on the
 * page, if the recording was made with another seed or tick rate (or `rounds` or `restTicks` is not a whole number in
 * range); throws what `createGameSim` throws if the level cannot be built.
 */
export async function watchReplay(options: WatchOptions): Promise<Watch> {
  const { mount, host, replay, frames = pageFrames, rounds: roundLimit } = options
  if (roundLimit !== undefined && (!Number.isInteger(roundLimit) || roundLimit < 1))
    throw new WatchSetupError('rounds must be a whole number, 1 or more, or left out to play without end.')
  if (options.restTicks !== undefined && (!Number.isInteger(options.restTicks) || options.restTicks < 0))
    throw new WatchSetupError('restTicks must be a whole number of ticks, 0 or more.')

  const sim = await createGameSim({
    content: options.content,
    seed: options.seed ?? replay.seed,
    ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
    ...(options.level === undefined ? {} : { level: options.level }),
    ...(options.players === undefined ? {} : { players: options.players }),
    ...(options.gravity === undefined ? {} : { gravity: options.gravity }),
    // A recording made by a tunable game holds `tune` commands, which only a tunable sim reads (see `startGame`).
    ...(replay.meta.tunable === 'true' ? { tunable: true } : {}),
  })
  // The tick rate is the sim's, not an option, so it can only be compared once the sim exists.
  const mismatch =
    sim.seed !== replay.seed
      ? `the game's seed is ${sim.seed}, the recording's is ${replay.seed}`
      : sim.tickHz !== replay.tickHz
        ? `the game runs at ${sim.tickHz} Hz, the recording at ${replay.tickHz} Hz`
        : undefined
  if (mismatch !== undefined) {
    sim.dispose()
    throw new WatchSetupError(`This recording was made for another game setup: ${mismatch}.`)
  }

  // What to undo if a later step fails; it grows as things are made.
  let cleanup = (): void => sim.dispose()
  try {
    const level = options.content.levels[options.level ?? options.content.project.start]
    if (level === undefined) throw new Error('The level this game opens is missing.')
    // The pictures first: a game that cannot be drawn leaves nothing on the page.
    const art = await levelArt(
      'watchReplay',
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
      world: worldSize(options.content, level),
      sky: skyOf(options.content, level),
      art,
      view: level.view,
    })
    cleanup = () => {
      renderer.destroy()
      sim.dispose()
    }

    // A freeze holds the watched game as it holds a played one. Nothing buzzes: nobody is holding the device.
    const wiring = createFeelWiring({
      content: options.content,
      host,
      renderer,
      tickHz: sim.tickHz,
      seed: sim.seed,
      feelSettings: options.feelSettings,
      freezes: 'game',
    })
    wiring.begin()

    // Every round starts from this picture of tick 0, which is what makes the next round the same as the first.
    const start = sim.snapshot()
    const restTicks = options.restTicks ?? sim.tickHz
    let next = 0 // the first command of the replay not yet sent
    let played = 0 // rounds finished
    let resting: number | undefined // ticks of rest left; undefined while a round is playing
    let finished = replay.ticks === 0 // nothing left to play: the last picture is held for good
    let stopped = false

    // The commands for this tick, read exactly as `playReplay` reads them: every one whose tick is the sim's tick.
    const commandsNow = (): Command[] => {
      const now: Command[] = []
      while (next < replay.commands.length && (replay.commands[next]?.tick ?? 0) === sim.tick) {
        now.push(replay.commands[next] as Command)
        next++
      }
      return now
    }

    const loop = createLoop({
      tickHz: sim.tickHz,
      step() {
        // The loop may call `step` several times in one frame without looking at what the earlier ones did, so the one
        // that ends the last round must be the last: nothing past the recording's end, and nothing after `stop()`.
        if (finished || stopped) return
        if (resting !== undefined) {
          if (resting > 0) {
            resting--
            return
          }
          // The rest is over: back to tick 0. The restore makes the next delta a full one, so the picture jumps to the
          // start and nothing slides there from where the last round ended.
          sim.restore(start)
          // A new run of the same ticks: the first step of it must be heard, and a hold of the last round is dropped.
          wiring.begin()
          next = 0
          resting = undefined
        }
        const result = sim.step(commandsNow())
        renderer.apply(result.render)
        wiring.hear(result)
        if (sim.tick < replay.ticks) return
        played++
        // The loop goes on drawing until the last dust has settled, and `draw` stops it then.
        if (roundLimit !== undefined && played >= roundLimit) finished = true
        else {
          resting = restTicks
        }
      },
      // While resting or finished the last picture is held whole, not drawn part-way back to the one before it.
      draw(alpha, ms) {
        wiring.draw(resting !== undefined || finished ? 1 : alpha, ms)
        if (finished && wiring.idle) loop.stop()
      },
      hold: wiring.hold,
      held: () => wiring.holding,
      frames,
    })

    // Still while the host says it is not on screen. Starting the loop afresh each time means the time spent still is
    // never counted, so coming back never fast-forwards. A watch that has ended stays ended.
    const sync = (): void => {
      if (stopped || finished) return
      if (!host.visible()) loop.stop()
      else loop.start()
    }
    const unlisten = host.onVisibility(sync)
    sync()

    return {
      sim,
      get rounds() {
        return played
      },
      heroes: () => renderer.heroes(),
      feel: wiring.frame,
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
