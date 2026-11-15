// How a hero moves, as one pure function: what a player holds and what the hero touches in, a new speed and a new
// memory out. No sim, no physics, no clock: `stepMoves` is called once a tick by the `moves` plugin (moves.ts) and by
// the tests, which feed it a list of ticks and read the list of answers.
//
// Sim math only: `+ - * /`, comparisons, `Math.min`, `Math.max` and `Math.abs`. Nothing an engine may round its own way.
import type { MoveNumbers } from '../content/content.ts'

/** What a hero looks like it is doing, for the clip: the plugin writes it, `motionClip` reads it. */
export const MoveMode = { plain: 0, airJump: 1, wall: 2, dash: 3 } as const

/** What a hero remembers between ticks. The field order is the component's (moves.ts) and never changes. */
export interface MoveState {
  /** 1 right, -1 left. */
  face: number
  /** Ground was felt at the last tick. */
  stood: boolean
  /** Ledge-grace ticks left. */
  grace: number
  /** Early-press ticks left. */
  press: number
  /** In a jump that letting go can still cut. */
  rising: boolean
  /** Air jumps used since the ground or a wall. */
  airJumps: number
  /** Sliding down a wall. */
  sliding: boolean
  /** Wall-jump-lock ticks left. */
  lock: number
  /**
   * Which way the last wall jump pushed (-1 or 1). Written and not read today. It stays because it is part of the
   * component, so of the schema hash and of both goldens that moved with it (`moves.json` and the template's replay);
   * take it out the next time those move for another reason, or when a move comes that needs it.
   */
  lockDir: number
  /** Dash ticks left. */
  dash: number
  dashDir: number
  /** Dash-rest ticks left. */
  rest: number
  /** Dashes used since the ground. */
  airDashes: number
  walking: boolean
  /** A `MoveMode`, for the clip. */
  mode: number
  /**
   * The sideways speed this step last asked for. The walk starts from it and never from the speed physics left:
   * ground friction takes about a quarter of a tile a second off every tick, and a walk that started from what was left
   * would never hold its own `walk-speed`.
   */
  run: number
}

/** A hero that has just appeared: facing right, nothing remembered. */
export const MOVE_START: MoveState = Object.freeze({
  face: 1,
  stood: false,
  grace: 0,
  press: 0,
  rising: false,
  airJumps: 0,
  sliding: false,
  lock: 0,
  lockDir: 0,
  dash: 0,
  dashDir: 0,
  rest: 0,
  airDashes: 0,
  walking: false,
  mode: MoveMode.plain,
  run: 0,
})

/** What the plugin tells the step about one hero on one tick. */
export interface MoveInput {
  /** Right held minus left held. */
  readonly dir: -1 | 0 | 1
  /** Jump went down this tick, even if it was let go again before the tick read it. */
  readonly jumpPressed: boolean
  readonly jumpHeld: boolean
  readonly dashPressed: boolean
  /** Something solid is under the hero. */
  readonly below: boolean
  /** -1 a wall on the left, 1 on the right, 0 none (or one on both sides). */
  readonly wall: -1 | 0 | 1
  /** The speed physics left the body with, in tiles a second. y points down: up is negative. */
  readonly vx: number
  readonly vy: number
  /**
   * The normal of the ground under the hero (y points down, so flat ground is (0, -1)). Given only in a game with a
   * slope. On the ground, a walk then runs along it, and a hero left alone is held on it. Left out, or flat, nothing
   * here differs from a game with no slope.
   */
  readonly slope?: { readonly nx: number; readonly ny: number } | undefined
}

/** Which of the optional moves the hero's character file switched on. */
export interface MoveSwitches {
  readonly doubleJump: boolean
  readonly wallJump: boolean
  readonly dash: boolean
}

/** Things that happened this tick: the plugin raises each as `hero.<name>`. */
export type MoveEventName =
  | 'walked'
  | 'jumped'
  | 'landed'
  | 'left-ground'
  | 'air-jumped'
  | 'wall-slid'
  | 'wall-jumped'
  | 'dashed'

/** What one tick gives back: the new memory, the speed to write to the body, and what happened. */
export interface MoveResult {
  readonly state: MoveState
  readonly vx: number
  readonly vy: number
  readonly events: readonly MoveEventName[]
}

/** A ground whose normal leans this little sideways is flat. */
const FLAT = 1e-3

/** A speed this near its target is on it: sums of a step's size, held as f32, land a hair short of a whole count. */
const ARRIVED = 1e-4

/** `value` moved toward `target` by at most `reach`. */
function toward(value: number, target: number, reach: number): number {
  if (Math.abs(target - value) <= reach + ARRIVED) return target
  return value < target ? value + reach : value - reach
}

/**
 * One tick of one hero, in the order the plan fixes (the tests pin it): ground, the press, a dash under way, a dash
 * beginning, the walk, the wall slide, the jump, the cut, the cap, the mode. `hover` is the upward speed that one
 * tick of gravity brings to nothing, so a dash holds its height.
 */
export function stepMoves(
  state: MoveState,
  input: MoveInput,
  n: MoveNumbers,
  on: MoveSwitches,
  hover: number,
): MoveResult {
  const s: MoveState = { ...state }
  const events: MoveEventName[] = []
  const { dir, wall } = input
  let vx = input.vx
  let vy = input.vy
  // A contact is one physics step old, so on the tick after a jump the feet still say they touch. A hero moving up
  // from a jump is in the air: the jump must not land at once, and letting go must still cut it.
  const below = input.below && !(state.rising && vy < 0)

  // 1. Ground. Landing gives the air moves back; the ledge grace is how long after the ground a jump still works.
  if (below && !s.stood) {
    events.push('landed')
    s.airJumps = 0
    s.airDashes = 0
    s.rising = false
  } else if (!below && s.stood) events.push('left-ground')
  s.stood = below
  const canStand = below || s.grace > 0
  s.grace = below ? n.ledgeGrace : Math.max(0, s.grace - 1)

  // 2. The press, kept for a few ticks so a jump pressed just before landing still jumps.
  if (input.jumpPressed) s.press = n.earlyPress + 1
  s.rest = Math.max(0, s.rest - 1)

  // 3 and 4. A dash under way, or one that begins now. Both are the same tick of dashing; a dash that meets a wall ends.
  let dashing = s.dash > 0
  if (dashing && wall === s.dashDir) {
    s.dash = 0
    s.rest = n.dashRest
    s.run = 0
    dashing = false
  } else if (
    !dashing &&
    on.dash &&
    input.dashPressed &&
    s.rest === 0 &&
    (below || s.airDashes < n.airDashes)
  ) {
    s.dashDir = dir !== 0 ? dir : s.face
    s.face = s.dashDir
    if (!below) s.airDashes += 1
    s.rising = false
    s.lock = 0
    s.dash = n.dashTicks
    events.push('dashed')
    dashing = true
  }
  if (dashing) {
    vx = s.dashDir * n.dashSpeed
    vy = hover
    s.dash -= 1
    if (s.dash === 0) {
      s.rest = n.dashRest
      s.run = s.dashDir * n.walkSpeed // out of a dash at a walk
    }
    s.mode = MoveMode.dash
    s.sliding = false
    // A jump pressed during the dash is remembered for the ticks it has left, and nothing else acts until it ends.
    s.press = Math.max(0, s.press - 1)
    return { state: s, vx, vy, events }
  }

  // 5. The walk. Locked after a wall jump, the sideways speed is left alone whatever is held. Otherwise it moves toward
  // what is held by `walk-speed / grip` a tick, and never pushes into a wall it is touching (so friction cannot hold a
  // hero to a wall in the air).
  if (s.lock > 0) s.lock -= 1
  else {
    const grip = below ? n.walkGrip : n.airGrip
    const target = dir * n.walkSpeed
    s.run = grip === 0 ? target : toward(s.run, target, n.walkSpeed / grip)
    if ((s.run > 0 && wall === 1) || (s.run < 0 && wall === -1)) s.run = 0
    if (dir !== 0) s.face = dir
  }
  vx = s.run
  if (below && dir !== 0 && !s.walking) events.push('walked')
  s.walking = below && dir !== 0

  // 6. The wall slide: falling, held toward a wall. It is no faster than `wall-slide-speed`, and a wall gives the air
  // jump back. A tick with a press does not slide: it jumps, off the wall, in step 7.
  const sliding = on.wallJump && !below && wall !== 0 && dir === wall && vy > 0 && s.press === 0
  if (sliding) {
    vy = Math.min(vy, n.wallSlideSpeed)
    s.airJumps = 0
    if (!s.sliding) events.push('wall-slid')
  }
  s.sliding = sliding

  // 7. The jump: the ground (or its grace), else a wall, else the air. The first that fits.
  let airJumped = false
  let jumped = false
  if (s.press > 0) {
    if (canStand) {
      jumped = true
      vy = -n.jumpSpeed
      s.grace = 0
      s.stood = false
      s.rising = true
      s.press = 0
      events.push('jumped')
    } else if (on.wallJump && !below && wall !== 0) {
      vx = -wall * n.wallJumpOut
      s.run = vx
      vy = -n.wallJumpUp
      s.lock = n.wallJumpLock
      s.lockDir = -wall
      s.face = -wall
      s.sliding = false
      s.airJumps = 0
      s.rising = true
      s.press = 0
      events.push('wall-jumped')
    } else if (on.doubleJump && !below && s.airJumps < n.airJumps) {
      vy = -n.airJumpSpeed
      s.airJumps += 1
      s.rising = true
      s.press = 0
      airJumped = true
      events.push('air-jumped')
    } else s.press -= 1
  }

  // 8. The cut: letting go while still rising keeps `jump-cut` of the upward speed. Falling ends the jump.
  if (s.rising && vy < 0 && !input.jumpHeld) {
    vy *= n.jumpCut
    s.rising = false
  } else if (vy >= 0) s.rising = false

  // 9. The cap.
  vy = Math.min(vy, n.fallSpeed)

  // 9b. A slope. On the ground, and not on the tick of a jump, the walk's speed runs along the slope and not along the
  // floor: `tx, ty` is the slope's direction, pointing right. A hero that holds nothing is given no speed, and the
  // ground's grip (hero.ts) holds it where it stands.
  const { slope } = input
  if (below && !jumped && slope !== undefined && Math.abs(slope.nx) > FLAT) {
    const tx = -slope.ny
    const ty = slope.nx
    // `+ 0` turns a minus nought into a nought, as the sim's numbers want.
    vx = s.run * tx + 0
    vy = s.run * ty + 0
  }

  // 10. The mode, for the clip.
  s.mode = s.sliding
    ? MoveMode.wall
    : airJumped || (state.mode === MoveMode.airJump && vy < 0 && !below)
      ? MoveMode.airJump
      : MoveMode.plain

  return { state: s, vx, vy, events }
}
