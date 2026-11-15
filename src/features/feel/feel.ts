// The feel feature's entry: what a game feels like, as plain data for each drawn frame. It hears a step's events and
// never the sim, so it has nothing to change, and it reads no clock: its only time is the frame times it is handed.
// The renderer draws what `frame` says; the loop waits for a freeze through `hold`.
import type { FeelFile, GameContent } from '../content/content.ts'
import type { SimEvent } from '../sim/sim.ts'
import { burst, type FeelSpeck, MAX_SPECKS, type Speck, speckAt } from './dust.ts'
import { createHold } from './hold.ts'
import { withinLimits } from './limits.ts'
import type { FeelSettings } from './settings.ts'
import { largestShake, type Shaking } from './shake.ts'

export { type FeelSpeck, MAX_SPECKS } from './dust.ts'
export { MAX_FREEZE_TICKS } from './limits.ts'
export { type FeelSettings, FeelSettingsSchema, feelSettingsFirst, feelSettingsOf } from './settings.ts'

/** A thing's box, in tiles: its middle and its size. */
export interface FeelPlace {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** What one drawn frame shows of the game's feel. Plain data. */
export interface FeelFrame {
  readonly specks: readonly FeelSpeck[]
  /** How far the level's picture is moved, in tiles. */
  readonly shake: { readonly x: number; readonly y: number }
  /** Ticks the picture is still held for, rounded up; 0 for none. */
  readonly freeze: number
}

export interface FeelOptions {
  readonly content: Pick<GameContent, 'feels'>
  readonly tickHz: number
  readonly settings: FeelSettings
  /** Makes this game's noise its own. Default 0. */
  readonly seed?: number
  /** What a heard freeze holds: the whole game (the loop waits) or only the picture. Default 'game'. */
  readonly freezes?: 'game' | 'picture'
}

export interface Feel {
  /** A new sim is about to be heard: forgets the last tick and drops a game hold. Dust and shakes in flight finish. */
  begin(): void
  /** Answers one step's events. A step whose tick was already heard is ignored. Never throws. */
  hear(step: { readonly tick: number; readonly events: readonly SimEvent[] }): void
  /** Fires one feel file now, at the thing `at` (no dust when left out). Its freeze holds the picture only. */
  play(feel: FeelFile, at?: number): void
  /** Spends this frame's time on a hold of the whole game, and answers the seconds it spent. The loop calls it first. */
  hold(seconds: number): number
  /**
   * Moves the dust, the shakes and a hold of the picture on by this frame's time and says what to draw. `place`
   * answers where a thing is.
   */
  frame(seconds: number, place: (sid: number) => FeelPlace | undefined): FeelFrame
  setSettings(settings: FeelSettings): void
  /** True while the whole game is held. */
  readonly holding: boolean
  /** True when there is nothing to draw and nothing held. */
  readonly idle: boolean
  /**
   * True while frames alone would change the picture: dust in the air, a shake, a hold of the picture. A hold of the
   * whole game is not counted, since only the loop can spend it.
   */
  readonly moving: boolean
}

/** A burst waiting for the next frame, which says where its thing is. */
interface PendingBurst {
  readonly file: FeelFile
  readonly sid: number
  readonly tick: number
}

/** A frame time that cannot be used (negative, not a number, infinite) counts as no time. */
const spanOf = (seconds: number): number => (Number.isFinite(seconds) && seconds > 0 ? seconds : 0)

/** The sid an event names: its payload's `sid` when that is a whole number. Anything else names nothing. */
function sidOf(event: SimEvent): number | undefined {
  const payload: unknown = event.payload
  if (typeof payload !== 'object' || payload === null) return undefined
  const sid: unknown = (payload as { readonly sid?: unknown }).sid
  return typeof sid === 'number' && Number.isInteger(sid) ? sid : undefined
}

/** Every file by the event that sets it off, each list in id order, each file inside the schema's limits. */
function filesByEvent(feels: Readonly<Record<string, FeelFile>> | undefined): ReadonlyMap<string, FeelFile[]> {
  const table = new Map<string, FeelFile[]>()
  if (feels === undefined) return table
  for (const id of Object.keys(feels).sort()) {
    const file = feels[id]
    if (file === undefined) continue
    const limited = withinLimits(file)
    const list = table.get(limited.on)
    if (list === undefined) table.set(limited.on, [limited])
    else list.push(limited)
  }
  return table
}

/**
 * The feel of a game: its feel files answered by the events a step raised, drawn as specks, a shake and a freeze. All
 * of it is presentation: nothing here reads or writes the sim, so no recorded hash can move.
 */
export function createFeel(options: FeelOptions): Feel {
  const { tickHz } = options
  const seed = options.seed ?? 0
  const freezes = options.freezes ?? 'game'
  const files = filesByEvent(options.content.feels)
  let settings = options.settings
  /** The last tick heard since `begin`; undefined before any. */
  let heard: number | undefined
  let specks: Speck[] = []
  let shakes: Shaking[] = []
  /** What starts at the next frame, at age 0, so nothing is older than the first frame that draws it. */
  const bursts: PendingBurst[] = []
  const starting: Shaking[] = []
  const gameHold = createHold(tickHz)
  const pictureHold = createHold(tickHz)
  /** True for a hold of the picture that began since the last frame: that frame does not spend it. */
  let pictureFresh = false
  /** A `play` has a tick of its own, counting down from -1, so two presses differ and neither matches a heard event. */
  let playTick = -1

  const holdPicture = (ticks: number): void => {
    const was = pictureHold.left > 0
    pictureHold.start(ticks)
    if (!was && pictureHold.left > 0) pictureFresh = true
  }

  /** One file answering at one tick, at the thing `sid` (or none). */
  const fire = (file: FeelFile, tick: number, sid: number | undefined, wholeGame: boolean): void => {
    if (file.dust !== undefined && sid !== undefined) bursts.push({ file, sid, tick })
    if (file.shake !== undefined)
      starting.push({
        strength: file.shake.strength,
        length: file.shake.ticks / tickHz,
        seed,
        tick,
        age: 0,
      })
    if (file.freeze !== undefined) {
      if (wholeGame) gameHold.start(file.freeze.ticks)
      else holdPicture(file.freeze.ticks)
    }
  }

  const moving = (): boolean =>
    specks.length > 0 ||
    shakes.length > 0 ||
    bursts.length > 0 ||
    starting.length > 0 ||
    pictureHold.left > 0

  return {
    begin() {
      heard = undefined
      gameHold.clear()
    },
    hear(step) {
      if (heard !== undefined && step.tick <= heard) return
      heard = step.tick
      if (files.size === 0) return
      try {
        for (const event of step.events) {
          const list = files.get(event.type)
          if (list === undefined) continue
          const sid = sidOf(event)
          for (const file of list) fire(file, step.tick, sid, freezes === 'game')
        }
      } catch {
        // An event that cannot be read makes no effect; the step is still heard.
      }
    },
    play(feel, at) {
      const file = withinLimits(feel)
      const sid = typeof at === 'number' && Number.isInteger(at) ? at : undefined
      fire(file, playTick--, sid, false)
    },
    hold: (seconds) => gameHold.spend(spanOf(seconds)),
    frame(seconds, place) {
      const dt = spanOf(seconds)
      for (const speck of specks) speck.age += dt
      specks = specks.filter((speck) => speck.age < speck.life)
      for (const shake of shakes) shake.age += dt
      shakes = shakes.filter((shake) => shake.age < shake.length)
      if (pictureFresh) pictureFresh = false
      else pictureHold.spend(dt)

      for (const pending of bursts.splice(0)) {
        const dust = pending.file.dust
        const where = place(pending.sid)
        if (dust === undefined || where === undefined) continue
        if (!(Number.isFinite(where.x) && Number.isFinite(where.y) && Number.isFinite(where.h))) continue
        const key = { seed, tick: pending.tick, sid: pending.sid }
        specks.push(...burst(dust, { x: where.x, y: where.y + where.h / 2 }, key, tickHz))
      }
      // The newest specks stay when there are too many.
      if (specks.length > MAX_SPECKS) specks = specks.slice(specks.length - MAX_SPECKS)
      shakes.push(...starting.splice(0))

      const drawn: FeelSpeck[] = []
      for (const speck of specks) {
        const now = speckAt(speck)
        if (now !== undefined) drawn.push(now)
      }
      const offset = settings.shake ? largestShake(shakes) : { x: 0, y: 0 }
      // Slack of a millionth of a tick, so 4/60 s less 1/60 s held is 3 ticks and not 4.
      const left = Math.max(gameHold.left, pictureHold.left)
      return { specks: drawn, shake: offset, freeze: Math.max(0, Math.ceil(left * tickHz - 1e-6)) }
    },
    setSettings(next) {
      settings = next
    },
    get holding() {
      return gameHold.left > 0
    },
    get idle() {
      return !moving() && gameHold.left === 0
    },
    get moving() {
      return moving()
    },
  }
}
