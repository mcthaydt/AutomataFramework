import { describe, expect, test } from 'vitest'
import { MOVE_NUMBERS, type MoveNumbers, moveNumbers } from '#src/features/content/content.ts'
import {
  MOVE_START,
  type MoveInput,
  MoveMode,
  type MoveResult,
  type MoveState,
  type MoveSwitches,
  stepMoves,
} from '#src/features/level/move-step.ts'

const N: MoveNumbers = moveNumbers(undefined)
const OFF: MoveSwitches = { doubleJump: false, wallJump: false, dash: false }
const ALL: MoveSwitches = { doubleJump: true, wallJump: true, dash: true }
/** One tick of gravity's worth of lift, so a dash holds its height. */
const HOVER = -0.5

/** A tick's input: on the ground and holding nothing, with any of it changed. */
const tick = (over: Partial<MoveInput> = {}): MoveInput => ({
  dir: 0,
  jumpPressed: false,
  jumpHeld: false,
  dashPressed: false,
  below: true,
  wall: 0,
  vx: 0,
  vy: 0,
  ...over,
})
const AIR = { below: false } as const

/** Feeds a list of ticks through the step, from `from`, and gives back every answer. */
function run(
  inputs: readonly MoveInput[],
  numbers: MoveNumbers = N,
  on: MoveSwitches = OFF,
  from: MoveState = MOVE_START,
): MoveResult[] {
  const out: MoveResult[] = []
  let state = from
  for (const input of inputs) {
    const result = stepMoves(state, input, numbers, on, HOVER)
    out.push(result)
    state = result.state
  }
  return out
}
const repeat = <T>(n: number, value: T): T[] => Array.from({ length: n }, () => value)
const saw = (results: readonly MoveResult[], name: string): number =>
  results.filter((r) => (r.events as readonly string[]).includes(name)).length
const last = <T>(list: readonly T[]): T => list[list.length - 1] as T
/** A hero standing on the ground, ticks into it. */
const standing = (): MoveState => (run([tick()])[0] as MoveResult).state
/** A hero in the air, off the ground for good. */
const falling = (): MoveState => ({ ...MOVE_START, stood: false })

describe('walking', () => {
  test('walk reaches 6 in 3 ticks on the ground and 6 in the air, and at grip 0 at once', () => {
    expect(run(repeat(4, tick({ dir: 1 }))).map((r) => r.vx)).toEqual([2, 4, 6, 6])
    expect(run(repeat(7, tick({ dir: 1, ...AIR }))).map((r) => r.vx)).toEqual([1, 2, 3, 4, 5, 6, 6])
    expect(run(repeat(2, tick({ dir: 1 })), { ...N, walkGrip: 0 }).map((r) => r.vx)).toEqual([6, 6])
  })

  test('letting go slows to nothing at the same rate, and going the other way turns round', () => {
    const going = run([...repeat(3, tick({ dir: 1 })), ...repeat(3, tick())])
    expect(going.map((r) => r.vx)).toEqual([2, 4, 6, 4, 2, 0])
    const turning = run([...repeat(3, tick({ dir: 1 })), ...repeat(7, tick({ dir: -1 }))])
    expect(last(turning).vx).toBe(-6)
    expect(last(turning).state.face).toBe(-1)
  })

  test('the walk goes from the speed it asked for, not the one friction left', () => {
    const results = run(repeat(5, tick({ dir: 1, vx: 0.5 }))) // physics keeps cutting the speed it was given
    expect(results.map((r) => r.vx)).toEqual([2, 4, 6, 6, 6])
  })

  test('walking toward a wall keeps the sideways speed at nothing', () => {
    expect(run(repeat(5, tick({ dir: 1, wall: 1 }))).map((r) => r.vx)).toEqual([0, 0, 0, 0, 0])
    expect(run(repeat(3, tick({ dir: -1, wall: -1, ...AIR }))).map((r) => r.vx)).toEqual([0, 0, 0])
  })

  test('walking away from a wall is free, and coasting into one stops at it', () => {
    expect(last(run(repeat(5, tick({ dir: -1, wall: 1 })))).vx).toBe(-6)
    const coasting = run([...repeat(3, tick({ dir: 1 })), tick({ wall: 1 })])
    expect(last(coasting).vx).toBe(0)
  })

  test('walked is said on the first step after standing, not on every tick', () => {
    const results = run([tick({ dir: 1 }), tick({ dir: 1 }), tick(), tick({ dir: 1 })])
    expect(results.map((r) => r.events.includes('walked'))).toEqual([true, false, false, true])
    expect(saw(run(repeat(3, tick({ dir: 1, ...AIR }))), 'walked')).toBe(0)
  })
})

describe('jumping', () => {
  test('a press on the ground leaves at -12 and says jumped once', () => {
    const results = run([
      tick(),
      tick({ jumpPressed: true, jumpHeld: true }),
      tick({ jumpHeld: true, ...AIR, vy: -12 }),
    ])
    expect(results[1]?.vy).toBe(-12)
    expect(saw(results, 'jumped')).toBe(1)
    expect(results[2]?.vy).toBe(-12)
  })

  test('ledge grace: a press 6 ticks after the ground still jumps, 7 does not', () => {
    const pressedAfter = (k: number) =>
      last(run([tick(), ...repeat(k - 1, tick(AIR)), tick({ jumpPressed: true, jumpHeld: true, ...AIR })]))
    expect(pressedAfter(6).events).toContain('jumped')
    expect(pressedAfter(6).vy).toBe(-12)
    expect(pressedAfter(7).events).not.toContain('jumped')
  })

  test('early press: a press 6 ticks before the ground jumps on landing, 7 does not', () => {
    const pressedBefore = (k: number) =>
      last(
        run(
          [
            tick({ jumpPressed: true, jumpHeld: true, ...AIR, vy: 5 }),
            ...repeat(k - 1, tick({ ...AIR, jumpHeld: true, vy: 5 })),
            tick({ jumpHeld: true }),
          ],
          N,
          OFF,
          falling(),
        ),
      )
    expect(pressedBefore(6).events).toEqual(expect.arrayContaining(['landed', 'jumped']))
    expect(pressedBefore(7).events).toEqual(['landed'])
  })

  test('letting go while rising keeps half; holding keeps all; letting go while falling does nothing', () => {
    const rising = (held: boolean) =>
      run([tick({ ...AIR, vy: -12, jumpHeld: held })], N, OFF, { ...falling(), rising: true })[0]
    expect(rising(true)?.vy).toBe(-12)
    expect(rising(false)?.vy).toBe(-6)
    expect(run([tick({ ...AIR, vy: 3 })], N, OFF, { ...falling(), rising: true })[0]?.vy).toBe(3)
    // A press and a lift inside one tick jumps and is cut at once: a short jump.
    expect(run([tick({ jumpPressed: true })])[0]?.vy).toBe(-6)
  })

  test('falling never passes 20', () => {
    expect(run([tick({ ...AIR, vy: 25 })])[0]?.vy).toBe(20)
    expect(run([tick({ ...AIR, vy: 19 })])[0]?.vy).toBe(19)
  })

  test('landed and left-ground are each said once, and a jump is not left-ground', () => {
    const walkOff = run([tick(), tick(AIR), tick(AIR), tick()])
    expect(saw(walkOff, 'landed')).toBe(2)
    expect(saw(walkOff, 'left-ground')).toBe(1)
    const jump = run([
      tick(),
      tick({ jumpPressed: true, jumpHeld: true }),
      tick({ ...AIR, jumpHeld: true, vy: -12 }),
    ])
    expect(saw(jump, 'left-ground')).toBe(0)
  })
})

describe('the air jump', () => {
  const press = tick({ ...AIR, jumpPressed: true, jumpHeld: true, vy: 4 })

  test('double jump off: a press in the air does nothing', () => {
    const [result] = run([press], N, OFF, falling())
    expect(result?.events).toEqual([])
    expect(result?.vy).toBe(4)
  })

  test('double jump: one press in the air goes up at -10, a second does nothing, the ground resets', () => {
    const results = run([press, press, tick(), press], N, { ...OFF, doubleJump: true }, falling())
    expect(results[0]?.vy).toBe(-10)
    expect(results[0]?.events).toEqual(['air-jumped'])
    expect(results[1]?.events).toEqual([])
    expect(results[3]?.events).toEqual(['air-jumped'])
  })

  test('air-jumps 3 gives three', () => {
    const results = run(repeat(5, press), { ...N, airJumps: 3 }, { ...OFF, doubleJump: true }, falling())
    expect(saw(results, 'air-jumped')).toBe(3)
  })

  test('a wall gives the air jump back', () => {
    const on = { ...ALL, dash: false }
    const slide = tick({ ...AIR, dir: 1, wall: 1, vy: 5 })
    const results = run([press, slide, press], N, on, falling())
    expect(results[0]?.events).toEqual(['air-jumped'])
    expect(results[2]?.events).toEqual(['air-jumped'])
  })
})

describe('the wall', () => {
  const on = { ...OFF, wallJump: true }
  const slide = tick({ ...AIR, dir: 1, wall: 1, vy: 8 })

  test('wall slide: held toward the wall and falling, the fall is 3 at most, wall-slid said once', () => {
    const results = run([slide, slide, slide], N, on, falling())
    expect(results.map((r) => r.vy)).toEqual([3, 3, 3])
    expect(saw(results, 'wall-slid')).toBe(1)
    expect(results[0]?.state.mode).toBe(MoveMode.wall)
  })

  test('no slide without the switch, without the hold, or while rising', () => {
    expect(run([slide], N, OFF, falling())[0]?.vy).toBe(8)
    expect(run([tick({ ...AIR, wall: 1, vy: 8 })], N, on, falling())[0]?.vy).toBe(8)
    expect(run([tick({ ...AIR, dir: 1, wall: 1, vy: -4 })], N, on, falling())[0]?.vy).toBe(-4)
  })

  test('wall jump: up at -11 and away at 7, and for 8 ticks holding toward the wall changes nothing', () => {
    const jump = tick({ ...AIR, dir: 1, wall: 1, jumpPressed: true, jumpHeld: true, vy: 4 })
    const away = tick({ ...AIR, dir: 1, jumpHeld: true, vy: -11 })
    const results = run([jump, ...repeat(9, away)], N, on, falling())
    expect(results[0]).toMatchObject({ vx: -7, vy: -11 })
    expect(results[0]?.events).toEqual(['wall-jumped'])
    expect(results[0]?.state.face).toBe(-1)
    expect(results.slice(1, 9).map((r) => r.vx)).toEqual(repeat(8, -7))
    expect(results[9]?.vx).toBe(-6) // the lock is over: the walk takes it toward what is held, a tick's worth
    expect(results[9]?.state.face).toBe(1)
  })

  test('a wall jump needs no hold toward the wall', () => {
    const jump = tick({ ...AIR, wall: -1, jumpPressed: true, jumpHeld: true, vy: 4 })
    const [result] = run([jump], N, on, falling())
    expect(result).toMatchObject({ vx: 7, vy: -11 })
  })

  test('without the switch a wall is only a wall', () => {
    const jump = tick({ ...AIR, wall: 1, jumpPressed: true, vy: 4 })
    expect(run([jump], N, OFF, falling())[0]?.events).toEqual([])
  })
})

describe('the dash', () => {
  const on = { ...OFF, dash: true }
  const dash = tick({ dashPressed: true })

  test('dash: 18 along the facing for 10 ticks with no fall, then 30 ticks before the next', () => {
    const results = run([dash, ...repeat(11, tick())], N, on, standing())
    expect(results.slice(0, 10).map((r) => r.vx)).toEqual(repeat(10, 18))
    expect(results.slice(0, 10).map((r) => r.vy)).toEqual(repeat(10, HOVER))
    expect(results[0]?.events).toEqual(['dashed'])
    expect(results[10]?.vx).not.toBe(18)
    // The 30 ticks of rest begin when the dash ends (its tenth tick, index 9); the next dash may start 30 ticks on.
    const gap = (ticksAfter: number) =>
      last(run([dash, ...repeat(9, tick()), ...repeat(ticksAfter - 1, tick()), dash], N, on, standing()))
    expect(gap(29).events).not.toContain('dashed')
    expect(gap(30).events).toContain('dashed')
  })

  test('a dash goes the way that is held, not the facing', () => {
    const [result] = run([tick({ dashPressed: true, dir: -1 })], N, on, standing())
    expect(result?.vx).toBe(-18)
    expect(result?.state.face).toBe(-1)
  })

  test('without the switch a press does nothing', () =>
    expect(run([dash], N, OFF, standing())[0]?.events).toEqual([]))

  test('air-dashes 1: one dash in the air until the ground', () => {
    const quick = { ...N, dashRest: 0, dashTicks: 4 }
    const airDash = tick({ ...AIR, dashPressed: true })
    const wait = repeat(3, tick(AIR))
    const results = run([airDash, ...wait, airDash, ...wait, tick(), tick(), airDash], quick, on, falling())
    expect(saw(results.slice(0, 9), 'dashed')).toBe(1)
    expect(results[9]?.events).toContain('dashed')
  })

  test('a dash into a wall ends at the wall', () => {
    const results = run([dash, tick({ wall: 1 }), tick({ wall: 1 })], N, on, standing())
    expect(results[1]?.vx).toBe(0)
    expect(results[1]?.state.dash).toBe(0)
    expect(results[1]?.state.rest).toBe(30)
  })

  test('jump pressed during a dash is kept and used when the dash ends on the ground', () => {
    const hold = tick({ jumpHeld: true })
    const results = run(
      [dash, ...repeat(6, tick()), tick({ jumpPressed: true, jumpHeld: true }), hold, hold, hold],
      N,
      on,
      standing(),
    )
    expect(results[10]?.events).toContain('jumped')
    expect(results[10]?.vy).toBe(-12)
  })

  test('a dash ends at walk speed; one that ends at a wall ends at nothing', () => {
    const through = run([dash, ...repeat(10, tick({ dir: 1 }))], N, on, standing())
    expect(through[10]?.vx).toBe(6)
    const wallend = run([dash, tick({ wall: 1 }), tick({ dir: 1, wall: 1 })], N, on, standing())
    expect(wallend[1]?.vx).toBe(0)
    expect(wallend[2]?.vx).toBe(0)
  })
})

describe('the mode', () => {
  test('the mode is dash, wall, airJump and plain at the right ticks', () => {
    const on = ALL
    const dashTick = run([tick({ dashPressed: true })], N, on, standing())[0]
    expect(dashTick?.state.mode).toBe(MoveMode.dash)
    const air = run(
      [
        tick({ ...AIR, jumpPressed: true, jumpHeld: true, vy: 4 }),
        tick({ ...AIR, jumpHeld: true, vy: -9 }),
        tick({ ...AIR, jumpHeld: true, vy: 1 }),
      ],
      N,
      on,
      falling(),
    )
    expect(air.map((r) => r.state.mode)).toEqual([MoveMode.airJump, MoveMode.airJump, MoveMode.plain])
    const sliding = run([tick({ ...AIR, dir: 1, wall: 1, vy: 6 })], N, on, falling())
    expect(sliding[0]?.state.mode).toBe(MoveMode.wall)
    expect(run([tick()], N, on)[0]?.state.mode).toBe(MoveMode.plain)
  })
})

describe('the numbers at their limits', () => {
  const holdJump = { jumpPressed: true, jumpHeld: true } as const
  const waterfall = { ...OFF, wallJump: true }
  const doubleJump = { ...OFF, doubleJump: true }
  const dashOn = { ...OFF, dash: true }
  /** The first count that fails the test, from 0: the length of the run of successes. */
  const countWhile = (works: (k: number) => boolean): number => {
    let k = 0
    while (k < 40 && works(k)) k++
    return k
  }
  /** A press this many ticks after the ground: the ground tick, `k` in the air, then the press. */
  const pressAfter = (n: MoveNumbers, k: number): MoveResult =>
    last(run([tick(), ...repeat(k, tick(AIR)), tick({ ...AIR, ...holdJump })], n))
  /** A press this many ticks before the ground: the press, `gap - 1` in the air, then the landing. */
  const landAfter = (n: MoveNumbers, gap: number): MoveResult =>
    last(run([tick({ ...AIR, ...holdJump }), ...repeat(gap - 1, tick(AIR)), tick()], n, OFF, falling()))
  const wallJumpFrom = (n: MoveNumbers, ticks: MoveInput[]): MoveResult[] =>
    run([tick({ ...AIR, wall: 1, ...holdJump }), ...ticks], n, waterfall, falling())
  const airPress = tick({ ...AIR, ...holdJump, vy: 4 })
  const airDash = tick({ ...AIR, dashPressed: true })

  // For each number, a way to measure what it does from the step's answers, and what the measure should be.
  const measure: Record<keyof MoveNumbers, (n: MoveNumbers) => number> = {
    walkSpeed: (n) => last(run(repeat(40, tick({ dir: 1 })), n)).vx,
    walkGrip: (n) => run(repeat(60, tick({ dir: 1 })), n).findIndex((r) => r.vx === n.walkSpeed) + 1,
    airGrip: (n) =>
      run(repeat(90, tick({ dir: 1, ...AIR })), n, OFF, falling()).findIndex((r) => r.vx === n.walkSpeed) + 1,
    jumpSpeed: (n) => -(run([tick(holdJump)], n)[0]?.vy ?? 0),
    jumpCut: (n) =>
      -(run([tick({ ...AIR, vy: -20 })], n, OFF, { ...falling(), rising: true })[0]?.vy ?? 0) / 20,
    ledgeGrace: (n) => countWhile((k) => pressAfter(n, k).events.includes('jumped')),
    earlyPress: (n) => countWhile((k) => landAfter(n, k + 1).events.includes('jumped')),
    fallSpeed: (n) => run([tick({ ...AIR, vy: 100 })], n)[0]?.vy ?? 0,
    airJumps: (n) => saw(run(repeat(6, airPress), n, doubleJump, falling()), 'air-jumped'),
    airJumpSpeed: (n) => -(run([airPress], n, doubleJump, falling())[0]?.vy ?? 0),
    wallSlideSpeed: (n) => {
      const slide = tick({ ...AIR, dir: 1, wall: 1, vy: 100 })
      return run([slide], { ...n, fallSpeed: 40 }, waterfall, falling())[0]?.vy ?? 0
    },
    wallJumpOut: (n) => -(wallJumpFrom(n, [])[0]?.vx ?? 0),
    wallJumpUp: (n) => -(wallJumpFrom(n, [])[0]?.vy ?? 0),
    wallJumpLock: (n) => {
      const results = wallJumpFrom(n, repeat(40, tick({ ...AIR, dir: 1, jumpHeld: true, vy: -3 })))
      return results.slice(1).findIndex((r) => r.vx !== results[0]?.vx)
    },
    dashSpeed: (n) => run([tick({ dashPressed: true })], n, dashOn, standing())[0]?.vx ?? 0,
    dashTicks: (n) =>
      run([tick({ dashPressed: true }), ...repeat(60, tick())], n, dashOn, standing()).findIndex(
        (r) => r.vx !== n.dashSpeed,
      ),
    dashRest: (n) => {
      const results = run(repeat(n.dashTicks + 130, tick({ dashPressed: true })), n, dashOn, standing())
      const starts = results.flatMap((r, i) => (r.events.includes('dashed') ? [i] : []))
      return (starts[1] ?? 0) - (starts[0] ?? 0) - n.dashTicks + 1
    },
    airDashes: (n) => saw(run(repeat(400, airDash), { ...n, dashRest: 0 }, dashOn, falling()), 'dashed'),
  }
  /** What each measure should be at a value: the value itself, and at least one tick where a tick is the least. */
  const expected = (key: keyof MoveNumbers, value: number): number =>
    key === 'walkGrip' || key === 'airGrip' || key === 'dashRest' ? Math.max(1, value) : value

  test.each(MOVE_NUMBERS.flatMap((info) => [[info.key, info.min] as const, [info.key, info.max] as const]))(
    '%s at %d moves the hero as the limit says',
    (key, value) => {
      expect(measure[key]({ ...N, [key]: value })).toBeCloseTo(expected(key, value), 5)
    },
  )
})

describe('the state', () => {
  test('the state that comes back is a new object; the one given is not changed', () => {
    const given: MoveState = { ...MOVE_START }
    const copy = { ...given }
    const [result] = run([tick({ dir: 1, jumpPressed: true, jumpHeld: true })], N, OFF, given)
    expect(result?.state).not.toBe(given)
    expect(given).toEqual(copy)
    expect(MOVE_START.face).toBe(1)
    expect(Object.isFrozen(MOVE_START)).toBe(true)
  })
})
