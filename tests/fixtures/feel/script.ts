// A fixed run for the feel runtime: made-up content of three feel files, a list of steps and frame times, and where
// two things are. The frames it gives are a golden (`tests/golden/feel-frames.json`) in Node and three browsers.
import type { FeelFile } from '#src/features/content/content.ts'
import {
  createFeel,
  type Feel,
  type FeelFrame,
  type FeelPlace,
  type FeelSettings,
  feelSettingsFirst,
} from '#src/features/feel/feel.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'

/** `land`: dust on a landing. `thud`: a shake on a crate dropping. `spark`: a freeze, with a little dust, on a spark. */
export const FEEL_FILES: Readonly<Record<string, FeelFile>> = {
  land: {
    format: 1,
    id: 'land',
    on: 'hero.landed',
    dust: { count: 6, color: '#e8dcc0', speed: 2, life: 18 },
  },
  thud: { format: 1, id: 'thud', on: 'crate.dropped', shake: { strength: 0.4, ticks: 12 } },
  spark: {
    format: 1,
    id: 'spark',
    on: 'spark.taken',
    freeze: { ticks: 4 },
    dust: { count: 12, color: '#ffd23f', speed: 3, life: 24 },
  },
}

/** Where two things are: sid 7 stands on the ground (its feet at y 6) and sid 9 is a spark in the air. */
export const place = (sid: number): FeelPlace | undefined =>
  sid === 7 ? { x: 3, y: 5, w: 1, h: 2 } : sid === 9 ? { x: 8, y: 4, w: 1, h: 1 } : undefined

export const event = (type: string, sid?: number): SimEvent => ({
  type,
  payload: sid === undefined ? null : { sid },
})

/** One loop frame: the time it took, and the step it took (if any). */
export interface ScriptFrame {
  readonly seconds: number
  readonly step?: { readonly tick: number; readonly events: readonly SimEvent[] }
}

/** The frame times the run mixes: 60 Hz, 120 Hz, 30 Hz and a quarter of a second (a tab that was away). */
const TIMES = [1 / 60, 1 / 60, 1 / 120, 1 / 30, 1 / 60, 0.25] as const
export const SCRIPT_FRAMES = 240

/** 240 frames. A landing at 3, two crates dropping at 10 and 14, a spark at 30, and another landing at 120. */
export function feelScript(): ScriptFrame[] {
  const at = new Map<number, SimEvent[]>([
    [3, [event('hero.landed', 7)]],
    [10, [event('crate.dropped', 7)]],
    [14, [event('crate.dropped', 7), event('hero.landed', 99)]],
    [30, [event('spark.taken', 9)]],
    [120, [event('hero.landed', 7), event('crate.dropped', 7)]],
  ])
  const frames: ScriptFrame[] = []
  for (let i = 0; i < SCRIPT_FRAMES; i++) {
    const seconds = TIMES[i % TIMES.length] ?? 1 / 60
    const events = at.get(i)
    frames.push(events === undefined ? { seconds } : { seconds, step: { tick: i + 1, events } })
  }
  return frames
}

/** A feel over the made-up files. */
export function newFeel(
  options: { settings?: FeelSettings; freezes?: 'game' | 'picture'; seed?: number } = {},
): Feel {
  return createFeel({
    content: { feels: FEEL_FILES },
    tickHz: 60,
    settings: options.settings ?? feelSettingsFirst(false),
    seed: options.seed ?? 1,
    ...(options.freezes === undefined ? {} : { freezes: options.freezes }),
  })
}

/** Plays the script the way the loop does: the hold first, then the step, then the picture. */
export function runScript(feel: Feel, frames: readonly ScriptFrame[] = feelScript()): FeelFrame[] {
  const out: FeelFrame[] = []
  for (const frame of frames) {
    feel.hold(frame.seconds)
    if (frame.step !== undefined) feel.hear(frame.step)
    out.push(feel.frame(frame.seconds, place))
  }
  return out
}
