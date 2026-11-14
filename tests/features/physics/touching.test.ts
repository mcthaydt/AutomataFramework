import { describe, expect, test } from 'vitest'
import { felt, STEEP, TOUCH_SLOP } from '#src/features/physics/touching.ts'

// The rule alone, on contacts as the adapter reports them: the normal points from the other collider toward the body,
// and y points down, so a floor under the body has a normal of (0, -1).
const contact = (nx: number, ny: number, dist = 0, moves = false) => ({ nx, ny, dist, moves })
/** The normal of a surface that rises at `degrees`, seen from above: tilted from straight up. */
const slope = (degrees: number) => {
  const a = (degrees * Math.PI) / 180
  return contact(Math.sin(a), -Math.cos(a))
}
const none = { below: false, left: false, right: false }

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
    expect(felt([contact(0, -1), contact(-1, 0)])).toEqual({ below: true, left: false, right: true }))

  test('a ceiling is nothing', () => expect(felt([contact(0, 1)])).toEqual(none))

  test('the steepness is the one the file says', () => {
    expect(STEEP).toBe(0.7)
    expect(TOUCH_SLOP).toBe(0.02)
  })
})
