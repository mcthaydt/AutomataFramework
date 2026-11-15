import { expect, test } from 'vitest'
import { burst, SPECK_SIZE, type Speck, speckAt } from '#src/features/feel/dust.ts'

// The template's land.json.
const DUST = { count: 6, color: '#e8dcc0', speed: 2, life: 18 }
const AT = { x: 3, y: 6 }
const KEY = { seed: 1, tick: 40, sid: 7 }
const HZ = 60

const aged = (speck: Speck, age: number): Speck => ({ ...speck, age })

test("a burst has `count` specks, all starting at the place, in the file's colour", () => {
  const specks = burst(DUST, AT, KEY, HZ)
  expect(specks).toHaveLength(6)
  for (const speck of specks) {
    expect(speck.x0).toBe(3)
    expect(speck.y0).toBe(6)
    expect(speck.color).toBe(0xe8dcc0)
    expect(speck.age).toBe(0)
    expect(speck.life).toBeCloseTo(18 / 60, 12)
  }
})

test('every speck starts going up, within 60 degrees of straight up, at half to all of the speed', () => {
  for (let sid = 0; sid < 50; sid++) {
    for (const speck of burst({ ...DUST, count: 20 }, AT, { ...KEY, sid }, HZ)) {
      expect(speck.vy).toBeLessThan(0)
      expect(Math.abs(speck.vx)).toBeLessThanOrEqual(Math.abs(speck.vy) * 1.7321)
      const speed = Math.hypot(speck.vx, speck.vy)
      expect(speed).toBeGreaterThanOrEqual(1 - 1e-9)
      expect(speed).toBeLessThanOrEqual(2 + 1e-9)
    }
  }
})

test('the same key gives the same burst; another tick or sid gives another', () => {
  expect(burst(DUST, AT, KEY, HZ)).toEqual(burst(DUST, AT, KEY, HZ))
  expect(burst(DUST, AT, { ...KEY, tick: 41 }, HZ)).not.toEqual(burst(DUST, AT, KEY, HZ))
  expect(burst(DUST, AT, { ...KEY, sid: 8 }, HZ)).not.toEqual(burst(DUST, AT, KEY, HZ))
  expect(burst(DUST, AT, { ...KEY, seed: 2 }, HZ)).not.toEqual(burst(DUST, AT, KEY, HZ))
})

test('a speck is drawn at full strength at age 0 and is gone at its life', () => {
  const [first] = burst(DUST, AT, KEY, HZ)
  if (first === undefined) throw new Error('no speck')
  expect(speckAt(first)).toMatchObject({ x: 3, y: 6, alpha: 1 })
  expect(speckAt(aged(first, 18 / 60))).toBeUndefined()
  expect(speckAt(aged(first, 99))).toBeUndefined()
  expect(speckAt(aged(first, 18 / 60 - 1e-6))).toBeDefined()
})

test('a speck fades and never goes below 0 or above 1', () => {
  const [first] = burst(DUST, AT, KEY, HZ)
  if (first === undefined) throw new Error('no speck')
  let last = 1
  for (let i = 0; i < 100; i++) {
    const drawn = speckAt(aged(first, (first.life * i) / 100))
    expect(drawn).toBeDefined()
    const alpha = drawn?.alpha ?? -1
    expect(alpha).toBeGreaterThanOrEqual(0)
    expect(alpha).toBeLessThanOrEqual(1)
    expect(alpha).toBeLessThanOrEqual(last)
    last = alpha
  }
})

test('a speck ends a quarter of a tile below where its speed alone would leave it', () => {
  const [first] = burst(DUST, AT, KEY, HZ)
  if (first === undefined) throw new Error('no speck')
  const near = speckAt(aged(first, first.life * 0.999999))
  // Its speed alone, slowing to a stop, carries it half of `vy * life`.
  const alone = first.y0 + first.vy * first.life * 0.5
  expect(near?.y).toBeCloseTo(alone + 0.25, 4)
})

test('a speck is an eighth of a tile', () => {
  const [first] = burst(DUST, AT, KEY, HZ)
  if (first === undefined) throw new Error('no speck')
  expect(speckAt(first)?.size).toBe(0.125)
  expect(SPECK_SIZE).toBe(0.125)
})

test('where a speck is does not depend on how its age was reached', () => {
  const [first] = burst(DUST, AT, KEY, HZ)
  if (first === undefined) throw new Error('no speck')
  const once = speckAt(aged(first, 0.2))
  let age = 0
  for (let i = 0; i < 20; i++) age += 0.01
  expect(speckAt(aged(first, age))?.x).toBeCloseTo(once?.x ?? Number.NaN, 9)
})
