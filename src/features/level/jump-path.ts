// What a hero's moves reach, worked out with no physics: the hero's own move step (move-step.ts) once a tick, then one
// tick of gravity on the speed, then the speed on the place, which is what Rapier does to a body in the air. An editor
// draws this beside the Feel sliders ("this jump goes 2.3 tiles up and 4.7 across") and a test holds it to the real
// sim on a flat level (jump-path.parity.test.ts), so the picture and the game cannot drift apart.
//
// Flat ground only, a hero that does everything right: a jump from a full-speed run with jump held, each air jump
// pressed as the hero stops rising, a dash from standing. Nothing here is sim state: no component, no command.
import type { MoveNumbers } from '../content/content.ts'
import { MOVE_START, type MoveInput, type MoveState, type MoveSwitches, stepMoves } from './move-step.ts'

/** The default pull of `createGameSim`, tiles a second each second. */
export const DEFAULT_GRAVITY = 30

/** A tick, in seconds: the sim runs at 60 Hz. */
const DT = 1 / 60

/** No path is run past this many ticks, so a number at its limit can never loop for long. */
const MAX_TICKS = 1200

/** A place on a path, in tiles from the hero's feet where it began. x is along the way it faces; y points down. */
export interface PathPoint {
  readonly x: number
  readonly y: number
}

/** One flight: a point a tick, from the press to the landing, and how high and how far it went (never negative). */
export interface Flight {
  readonly points: readonly PathPoint[]
  readonly up: number
  readonly across: number
}

export interface JumpPaths {
  /** A held jump from a full-speed run on flat ground: a point a tick, from the press to the landing. */
  readonly jump: Flight
  /** The same jump with every air jump the hero has, each pressed as it stops rising. Only with `doubleJump`. */
  readonly airJump?: Flight & {
    /** How much higher the air jumps take it than the jump alone. */
    readonly rise: number
  }
  /** How high a wall jump takes it from where it left the wall. Only with `wallJump`. */
  readonly wallJump?: { readonly up: number }
  /** How far one dash goes along the ground from standing. Only with `dash`. */
  readonly dash?: { readonly across: number }
}

/** A height this near the floor is on it: sums of a tick's size meet the floor a hair short of it. */
const FLOOR = 1e-9

/**
 * A jump from a full-speed run, jump held, to the landing. With `airJumps` the hero lets go and presses again as it
 * stops rising, once for each air jump it has: a press is an up-to-down change, so the tick before each one the jump is
 * let go (the cut of a jump let go while rising applies, as it does to a player's thumb).
 */
function flight(n: MoveNumbers, on: MoveSwitches, gravity: number, airJumps: boolean): Flight {
  const pull = gravity * DT
  let state: MoveState = { ...MOVE_START, stood: true, grace: n.ledgeGrace, run: n.walkSpeed, walking: true }
  let x = 0
  let y = 0
  let vx = n.walkSpeed
  let vy = 0
  let top = 0
  let left = airJumps ? n.airJumps : 0
  let released = false
  const points: PathPoint[] = [{ x, y }]
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const grounded = tick === 0
    // The tick before the hero stops rising it lets go; the tick it has stopped, it presses.
    const letGo = left > 0 && !grounded && vy < 0 && vy + pull >= 0
    const press = tick === 0 || (left > 0 && !grounded && vy >= 0 && released)
    if (tick > 0 && press) {
      left -= 1
      released = false
    }
    if (letGo) released = true
    const input: MoveInput = {
      dir: 1,
      jumpPressed: press,
      jumpHeld: !letGo,
      dashPressed: false,
      below: grounded,
      wall: 0,
      vx,
      vy,
    }
    const result = stepMoves(state, input, n, on, -pull)
    state = result.state
    vx = result.vx
    vy = result.vy + pull
    x += vx * DT
    y += vy * DT
    if (y >= -FLOOR) {
      points.push({ x, y: 0 })
      break
    }
    top = Math.min(top, y)
    points.push({ x, y })
  }
  const last = points[points.length - 1]
  return Object.freeze({
    points: Object.freeze(points.map((p) => Object.freeze(p))),
    up: -top,
    across: Math.max(0, last?.x ?? 0),
  })
}

/** How high a wall jump goes from beside a wall, in the air, until it stops rising. */
function wallRise(n: MoveNumbers, on: MoveSwitches, gravity: number): number {
  const pull = gravity * DT
  let state: MoveState = { ...MOVE_START }
  let vx = 0
  let vy = 0
  let y = 0
  let top = 0
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const input: MoveInput = {
      dir: 0,
      jumpPressed: tick === 0,
      jumpHeld: true,
      dashPressed: false,
      below: false,
      wall: tick === 0 ? 1 : 0,
      vx,
      vy,
    }
    const result = stepMoves(state, input, n, on, -pull)
    state = result.state
    vx = result.vx
    vy = result.vy + pull
    y += vy * DT
    top = Math.min(top, y)
    if (vy >= 0) break
  }
  return -top
}

/** How far one dash goes along the ground from standing, until it ends. */
function dashAcross(n: MoveNumbers, on: MoveSwitches, gravity: number): number {
  const pull = gravity * DT
  let state: MoveState = { ...MOVE_START, stood: true, grace: n.ledgeGrace, face: 1 }
  let x = 0
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const input: MoveInput = {
      dir: 0,
      jumpPressed: false,
      jumpHeld: false,
      dashPressed: tick === 0,
      below: true,
      wall: 0,
      vx: 0,
      vy: 0,
    }
    const result = stepMoves(state, input, n, on, -pull)
    state = result.state
    x += result.vx * DT
    if (state.dash === 0) break
  }
  return x
}

/**
 * What the hero's moves reach, by the framework's own move step. `up` and `across` are tiles, never negative. The same
 * numbers and switches always give equal answers, and the answer is frozen. `gravity` is the sim's, 30 unless a game's
 * code says otherwise (an editor never sees a game's code, so it draws for the default).
 */
export function jumpPaths(
  numbers: MoveNumbers,
  on: MoveSwitches,
  gravity: number = DEFAULT_GRAVITY,
): JumpPaths {
  const jump = flight(numbers, on, gravity, false)
  const air = on.doubleJump ? flight(numbers, on, gravity, true) : undefined
  const airJump = air && Object.freeze({ ...air, rise: Math.max(0, air.up - jump.up) })
  const wallJump = on.wallJump ? Object.freeze({ up: wallRise(numbers, on, gravity) }) : undefined
  const dash = on.dash ? Object.freeze({ across: dashAcross(numbers, on, gravity) }) : undefined
  return Object.freeze({
    jump,
    ...(airJump ? { airJump } : {}),
    ...(wallJump ? { wallJump } : {}),
    ...(dash ? { dash } : {}),
  })
}
