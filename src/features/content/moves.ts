// The numbers the framework's built-in hero reads from a tuning file, their limits, and the hero's default controls.
// A hero whose character file has `moves` is walked and jumped by `level/moves.ts`; this file is only the content side:
// what the numbers are called, what they default to, how far a file may stretch them, and what a tuning file for a
// hero is checked for.
import type { TuningControl, TuningFile } from './tuning.ts'
import type { Listed, Report } from './type-info.ts'

/** The eighteen numbers as the sim reads them, by camel-cased name. */
export interface MoveNumbers {
  readonly walkSpeed: number
  readonly walkGrip: number
  readonly airGrip: number
  readonly jumpSpeed: number
  readonly jumpCut: number
  readonly ledgeGrace: number
  readonly earlyPress: number
  readonly fallSpeed: number
  readonly airJumps: number
  readonly airJumpSpeed: number
  readonly wallSlideSpeed: number
  readonly wallJumpOut: number
  readonly wallJumpUp: number
  readonly wallJumpLock: number
  readonly dashSpeed: number
  readonly dashTicks: number
  readonly dashRest: number
  readonly airDashes: number
}

/** One of the eighteen: what a file calls it, what it says, what it is when the file leaves it out, how far it may go. */
export interface MoveNumberInfo {
  readonly id: string
  readonly key: keyof MoveNumbers
  /** What the number does, in plain words: the sentence a tuning file's `about` carries. */
  readonly about: string
  /** The framework's value. */
  readonly value: number
  /** The framework's limits: a game never goes outside them, whatever its file's own range says. */
  readonly min: number
  readonly max: number
  /** How far one nudge of a slider moves it. */
  readonly step: number
  /** True for a count of ticks or of jumps: the sim only ever sees a whole number. */
  readonly whole: boolean
}

const info = (
  id: string,
  key: keyof MoveNumbers,
  about: string,
  value: number,
  min: number,
  max: number,
  step: number,
  whole = false,
): MoveNumberInfo => ({ id, key, about, value, min, max, step, whole })

/** The eighteen numbers, in the order the spec lists them. */
export const MOVE_NUMBERS: readonly MoveNumberInfo[] = Object.freeze([
  info('walk-speed', 'walkSpeed', 'How fast the hero walks, in tiles a second', 6, 1, 20, 0.5),
  info(
    'walk-grip',
    'walkGrip',
    'How quickly the hero reaches full speed and stops on the ground, in ticks (0 is at once)',
    3,
    0,
    30,
    1,
    true,
  ),
  info('air-grip', 'airGrip', 'The same in the air', 6, 0, 60, 1, true),
  info('jump-speed', 'jumpSpeed', 'How fast a jump leaves the ground, in tiles a second', 12, 4, 30, 0.5),
  info(
    'jump-cut',
    'jumpCut',
    'How much of a jump is kept when jump is let go early, 0 to 1 (1 means holding makes no difference)',
    0.5,
    0.1,
    1,
    0.05,
  ),
  info(
    'ledge-grace',
    'ledgeGrace',
    'How long after running off a ledge a jump still works, in ticks',
    6,
    0,
    15,
    1,
    true,
  ),
  info(
    'early-press',
    'earlyPress',
    'How long before landing a jump press is kept, in ticks',
    6,
    0,
    15,
    1,
    true,
  ),
  info('fall-speed', 'fallSpeed', 'The fastest the hero falls, in tiles a second', 20, 5, 40, 0.5),
  info('air-jumps', 'airJumps', 'How many extra jumps in the air (with `double-jump`)', 1, 1, 3, 1, true),
  info(
    'air-jump-speed',
    'airJumpSpeed',
    'How fast a jump in the air goes up, in tiles a second',
    10,
    4,
    30,
    0.5,
  ),
  info(
    'wall-slide-speed',
    'wallSlideSpeed',
    'How fast the hero slides down a wall it holds against (with `wall-jump`)',
    3,
    0,
    20,
    0.5,
  ),
  info(
    'wall-jump-out',
    'wallJumpOut',
    'How fast a wall jump pushes away from the wall, in tiles a second',
    7,
    1,
    20,
    0.5,
  ),
  info('wall-jump-up', 'wallJumpUp', 'How fast a wall jump goes up, in tiles a second', 11, 4, 30, 0.5),
  info(
    'wall-jump-lock',
    'wallJumpLock',
    'How long after a wall jump the hero keeps going away from the wall, in ticks',
    8,
    0,
    20,
    1,
    true,
  ),
  info('dash-speed', 'dashSpeed', 'How fast a dash goes, in tiles a second (with `dash`)', 18, 6, 40, 0.5),
  info('dash-ticks', 'dashTicks', 'How long a dash lasts, in ticks', 10, 4, 30, 1, true),
  info('dash-rest', 'dashRest', 'How long before the hero can dash again, in ticks', 30, 0, 120, 1, true),
  info(
    'air-dashes',
    'airDashes',
    'How many dashes before the hero touches the ground again',
    1,
    1,
    3,
    1,
    true,
  ),
])

/** What a number is when no file says: the framework's value of each. */
const DEFAULTS: MoveNumbers = Object.freeze(
  Object.fromEntries(MOVE_NUMBERS.map((n) => [n.key, n.value])) as unknown as MoveNumbers,
)

/** One number held inside the framework's limits, and whole where it is a count. */
function held(n: MoveNumberInfo, value: number): number {
  const inside = Math.min(n.max, Math.max(n.min, value))
  return n.whole ? Math.floor(inside) : inside
}

const memo = new WeakMap<TuningFile, MoveNumbers>()

/**
 * Each number from the file, held inside the framework's limits and whole where it is counted; the framework's value
 * for one the file leaves out, and for a file that is `undefined`. Frozen, and the same object for the same file.
 * A file that went through `loadGame` has been refused for stepping outside the limits (see `heroTuningProblems`);
 * this hold is for content that never did, such as an editor's draft in the middle of a slide.
 */
export function moveNumbers(tuning: TuningFile | undefined): MoveNumbers {
  if (tuning === undefined) return DEFAULTS
  const known = memo.get(tuning)
  if (known !== undefined) return known
  const out: Record<string, number> = {}
  for (const n of MOVE_NUMBERS) {
    const own = tuning.numbers.find((one) => one.id === n.id)
    out[n.key] = own === undefined ? n.value : held(n, own.value)
  }
  const frozen = Object.freeze(out) as unknown as MoveNumbers
  memo.set(tuning, frozen)
  return frozen
}

const control = (
  action: string,
  label: string,
  keys: readonly string[],
  side: 'left' | 'right',
  pad: TuningControl['pad'],
  shared: TuningControl['shared'],
): TuningControl => ({ action, label, keys, side, pad, shared })

/**
 * The controls of a hero, as a tuning file writes them: left, right, jump and dash, in that order. A tuning file for a
 * hero that leaves its `controls` out gets these (without `dash` when the hero cannot dash).
 */
export const DEFAULT_HERO_CONTROLS: readonly TuningControl[] = Object.freeze([
  control(
    'left',
    'Left',
    ['ArrowLeft', 'KeyA'],
    'left',
    ['dpad-left', 'left-stick-left'],
    [['KeyA'], ['ArrowLeft']],
  ),
  control(
    'right',
    'Right',
    ['ArrowRight', 'KeyD'],
    'left',
    ['dpad-right', 'left-stick-right'],
    [['KeyD'], ['ArrowRight']],
  ),
  control('jump', 'Jump', ['Space', 'ArrowUp', 'KeyW'], 'right', ['south'], [['KeyW'], ['ArrowUp']]),
  control(
    'dash',
    'Dash',
    ['ShiftLeft', 'ShiftRight', 'KeyX'],
    'right',
    ['west', 'r2'],
    [['ShiftLeft'], ['ShiftRight']],
  ),
])

/** The actions a hero's tuning file must list when it lists any, with a key to write as the example. */
const NEEDED = [
  ['left', 'ArrowLeft'],
  ['right', 'ArrowRight'],
  ['jump', 'Space'],
] as const

/**
 * The checks of a tuning file that a hero names as its `moves.tuning`. Each is a refusal, as every content check is:
 * a number whose range reaches outside the framework's limits, a counted number with a fraction, and a `controls` list
 * without what the hero needs. A tuning no hero names is checked for none of this.
 */
export function heroTuningProblems(tuning: TuningFile, game: Listed, report: Report): void {
  const hero = game.get('character', game.hero)
  if (hero?.moves === undefined || hero.moves.tuning !== tuning.id) return

  tuning.numbers.forEach((own, i) => {
    const n = MOVE_NUMBERS.find((one) => one.id === own.id)
    if (n === undefined) return
    const inside = `Keep "min" and "max" inside ${n.min} to ${n.max}.`
    const lead = `"${n.id}" can be ${n.min} to ${n.max} in a game, and this file lets it`
    if (own.max > n.max) report(`numbers[${i}].max`, `${lead} reach ${own.max}. ${inside}`)
    if (own.min < n.min) report(`numbers[${i}].min`, `${lead} go down to ${own.min}. ${inside}`)
    if (n.whole && !Number.isInteger(own.value))
      report(`numbers[${i}].value`, `"${n.id}" is a whole number. Write one, like ${n.value}.`)
  })

  if (tuning.controls === undefined) return
  const listed = new Set(tuning.controls.map((c) => c.action))
  const needed: readonly (readonly [string, string])[] = hero.moves.dash
    ? [...NEEDED, ['dash', 'ShiftLeft']]
    : NEEDED
  for (const [action, key] of needed)
    if (!listed.has(action))
      report(
        'controls',
        `The hero's controls have no "${action}". Add it to "controls" with its keys, like ["${key}"].`,
      )
}
