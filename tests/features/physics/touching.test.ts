import { describe, expect, test } from 'vitest'
import { felt, STEEP, TOUCH_SLOP } from '#src/features/physics/touching.ts'

// The rule alone, on contacts as the adapter reports them: the normal points from the other collider toward the body,
// and y points down, so a floor under the body has a normal of (0, -1).
const contact = (nx: number, ny: number, dist = 0, moves = false, corner?: -1 | 0 | 1) => ({
  nx,
  ny,
  dist,
  moves,
  ...(corner === undefined ? {} : { corner }),
})
/** The normal of a surface that rises at `degrees`, seen from above: tilted from straight up. */
const slope = (degrees: number) => {
  const a = (degrees * Math.PI) / 180
  return contact(Math.sin(a), -Math.cos(a))
}
const none = { below: false, left: false, right: false, gx: 0, gy: -1 }

describe('felt', () => {
  test('no contacts is nothing', () => expect(felt([])).toEqual(none))

  test('flat ground is below and nothing else', () =>
    expect(felt([contact(0, -1)])).toEqual({ ...none, below: true }))

  test('a slope of 44 degrees is ground and one of 46 is not', () => {
    expect(felt([slope(44)]).below).toBe(true)
    expect(felt([slope(46)]).below).toBe(false)
  })

  test('a wall on the left pushes right, and one on the right pushes left', () => {
    expect(felt([contact(1, 0)])).toEqual({ ...none, left: true })
    expect(felt([contact(-1, 0)])).toEqual({ ...none, right: true })
  })

  test('a crate at the side is no wall, but a crate underneath is ground', () => {
    expect(felt([contact(1, 0, 0, true)])).toEqual(none)
    expect(felt([contact(-1, 0, 0, true)])).toEqual(none)
    expect(felt([contact(0, -1, 0, true)])).toEqual({ ...none, below: true })
  })

  test('a contact further than the slop away is a near miss, and one at the slop is a touch', () => {
    expect(felt([contact(0, -1, TOUCH_SLOP + 0.01)])).toEqual(none)
    expect(felt([contact(0, -1, TOUCH_SLOP)])).toEqual({ ...none, below: true })
    expect(felt([contact(0, -1, -0.05)])).toEqual({ ...none, below: true })
  })

  test('a corner in a floor and a wall is both', () =>
    expect(felt([contact(0, -1), contact(-1, 0)])).toEqual({ ...none, below: true, right: true }))

  test('a corner on the seam of the wall it leans on is not ground, but a corner on a plain ledge is', () => {
    // A hero on the left of a wall's right face is at the wall's right: the wall pushes it right, so it is `left`.
    expect(felt([contact(1, 0), contact(0, -1, 0, false, -1)])).toEqual({ ...none, left: true })
    expect(felt([contact(-1, 0), contact(0, -1, 0, false, 1)])).toEqual({ ...none, right: true })
    expect(felt([contact(0, -1, 0, false, -1)])).toEqual({ ...none, below: true })
    // The other corner is another thing: a floor under the far side is still ground beside a wall.
    expect(felt([contact(1, 0), contact(0, -1, 0, false, 1)])).toEqual({ ...none, left: true, below: true })
  })

  test('a slope of 45 degrees is ground and no wall, and its normal is what the body stands on', () => {
    const R = Math.SQRT1_2
    expect(felt([contact(R, -R)])).toEqual({ ...none, below: true, gx: R, gy: -R })
    expect(felt([contact(-R, -R)])).toEqual({ ...none, below: true, gx: -R, gy: -R })
  })

  test('on two grounds the most upright one is what is stood on', () => {
    expect(felt([contact(Math.SQRT1_2, -Math.SQRT1_2), contact(0, -1)])).toMatchObject({ gx: 0, gy: -1 })
    expect(felt([contact(0, -1), contact(Math.SQRT1_2, -Math.SQRT1_2)])).toMatchObject({ gx: 0, gy: -1 })
    // A steeper one that is not ground (a 46 degree face) is not counted, and nor is a near miss.
    expect(felt([slope(46), contact(0, -1)])).toMatchObject({ gx: 0, gy: -1 })
    expect(felt([contact(Math.SQRT1_2, -Math.SQRT1_2, TOUCH_SLOP + 0.01)])).toEqual(none)
  })

  test('a ceiling is nothing', () => expect(felt([contact(0, 1)])).toEqual(none))

  test('the steepness is the one the file says', () => {
    expect(STEEP).toBe(0.7)
    expect(TOUCH_SLOP).toBe(0.02)
  })
})
