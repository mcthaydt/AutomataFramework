// The two-thumb rules, as a person's thumbs would say them: a landing, a slide, a lift, each with its time.
import { expect, test } from 'vitest'
import {
  createThumbRules,
  DEAD_ZONE_PX,
  FLICK_MS,
  FLICK_PX,
  FOLLOW_PX,
} from '#src/features/input/thumb-rules.ts'

const rules = (dash = true) => createThumbRules({ dash })
const names = (set: ReadonlySet<string>): string[] => [...set].sort()

test('the numbers the Owner saw', () => {
  expect([DEAD_ZONE_PX, FOLLOW_PX, FLICK_PX, FLICK_MS]).toEqual([12, 56, 56, 110])
})

test('a thumb down in the walk half holds nothing until it slides 12 px', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  expect(names(r.held())).toEqual([])
  r.move(1, 100 + DEAD_ZONE_PX, 300, 50)
  expect(names(r.held())).toEqual([])
  r.move(1, 100 + DEAD_ZONE_PX + 1, 300, 100)
  expect(names(r.held())).toEqual(['right'])
})

test('13 px right holds right; back inside the dead zone holds nothing; 13 px left holds left', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 113, 300, 200)
  expect(names(r.held())).toEqual(['right'])
  r.move(1, 105, 300, 400)
  expect(names(r.held())).toEqual([])
  r.move(1, 87, 300, 600)
  expect(names(r.held())).toEqual(['left'])
})

test('a thumb that slides 200 px drags the ring, so 69 px back the other way turns round', () => {
  const r = rules()
  r.down(1, 'walk', 0, 300, 0)
  // Slowly, so it is a walk and no flick.
  for (let x = 20, ms = 300; x <= 200; x += 20, ms += 300) r.move(1, x, 300, ms)
  expect(r.ring()).toEqual({ cx: 144, cy: 300, x: 200, y: 300 })
  expect(names(r.held())).toEqual(['right'])
  r.move(1, 200 - 69, 300, 4000)
  expect(names(r.held())).toEqual(['left'])
  r.move(1, 200 - 60, 300, 4300)
  expect(names(r.held())).toEqual([])
})

test('a thumb down in the jump half holds jump at once, and lets go on up', () => {
  const r = rules()
  r.down(2, 'jump', 300, 300, 0)
  expect(names(r.held())).toEqual(['jump'])
  r.up(2)
  expect(names(r.held())).toEqual([])
})

test('down and up before a drain still gives jump once, then nothing', () => {
  const r = rules()
  r.down(2, 'jump', 300, 300, 0)
  r.up(2)
  expect(names(r.drain())).toEqual(['jump'])
  expect(names(r.drain())).toEqual([])
})

test('a second finger in a half does nothing; when the first lifts, the next finger down takes the half', () => {
  const r = rules()
  r.down(1, 'jump', 300, 300, 0)
  r.down(2, 'jump', 320, 300, 10)
  r.up(1)
  // The second finger is still down, and never took the half.
  expect(names(r.held())).toEqual([])
  r.up(2)
  r.down(3, 'jump', 300, 300, 100)
  expect(names(r.held())).toEqual(['jump'])
  expect(r.uses().jump).toBe(2)

  const w = rules()
  w.down(1, 'walk', 100, 300, 0)
  w.down(2, 'walk', 20, 300, 10)
  w.move(2, 20, 300, 20)
  w.move(2, 0, 300, 400)
  expect(names(w.held())).toEqual([])
  w.move(1, 130, 300, 500)
  expect(names(w.held())).toEqual(['right'])
})

test('a walking thumb that slides into the jump half still walks and never jumps', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  for (let x = 120, ms = 300; x <= 400; x += 20, ms += 300) r.move(1, x, 300, ms)
  expect(names(r.held())).toEqual(['right'])
  expect(r.uses().jump).toBe(0)
})

test('60 px in 100 ms is a flick: dash and that side, once', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 160, 300, 100)
  expect(names(r.drain())).toEqual(['dash', 'right'])
  expect(r.uses().dash).toBe(1)
  // Still moving fast the same way is the same swipe: no second dash.
  r.move(1, 230, 300, 150)
  expect(names(r.drain())).toEqual(['right'])
  expect(r.uses().dash).toBe(1)
})

test('after a flick, the next one needs the thumb to have slowed down', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 160, 300, 100)
  r.drain()
  // A pause: the thumb is slow for a moment, then flicks back.
  r.move(1, 161, 300, 400)
  r.move(1, 100, 300, 480)
  expect(names(r.drain())).toEqual(['dash', 'left'])
  expect(r.uses().dash).toBe(2)
})

test('60 px in 300 ms is a walk, not a flick', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 120, 300, 100)
  r.move(1, 140, 300, 200)
  r.move(1, 160, 300, 300)
  expect(names(r.drain())).toEqual(['right'])
  expect(r.uses().dash).toBe(0)
})

test('a flick up or down is not a dash', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 160, 360, 100)
  expect(names(r.drain())).not.toContain('dash')
  const up = rules()
  up.down(1, 'walk', 100, 300, 0)
  up.move(1, 100, 200, 100)
  expect(names(up.drain())).toEqual([])
})

test('a flick with the thumb lifted at its end still gives dash and its side in the next drain', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 40, 300, 90)
  r.up(1)
  expect(names(r.held())).toEqual([])
  expect(names(r.drain())).toEqual(['dash', 'left'])
  expect(names(r.drain())).toEqual([])
})

test('with dash off, no flick is a dash', () => {
  const r = rules(false)
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 160, 300, 100)
  expect(names(r.drain())).toEqual(['right'])
  expect(r.uses().dash).toBe(0)
})

test('a walk is counted when a side is first held, and a jump on each landing', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 130, 300, 300)
  r.move(1, 140, 300, 600)
  expect(r.uses().walk).toBe(1)
  r.up(1)
  r.down(2, 'walk', 100, 300, 1000)
  r.move(2, 70, 300, 1300)
  expect(r.uses().walk).toBe(2)
})

test('mask holds back what is down until it lifts', () => {
  const r = rules()
  r.down(1, 'jump', 300, 300, 0)
  r.down(2, 'walk', 100, 300, 0)
  r.mask()
  r.move(2, 160, 300, 500)
  expect(names(r.held())).toEqual([])
  expect(r.ring()).toBeUndefined()
  r.up(1)
  r.down(3, 'jump', 300, 300, 800)
  expect(names(r.held())).toEqual(['jump'])
})

test('mask drops a press that has not been drained, so a pause does not swallow a jump for later', () => {
  const r = rules()
  r.down(1, 'jump', 300, 300, 0)
  r.up(1)
  r.mask()
  expect(names(r.drain())).toEqual([])
  r.down(2, 'jump', 300, 300, 100)
  expect(names(r.drain())).toEqual(['jump'])
})

test('touching is true for as long as a finger is down, moving or not, and masked or not', () => {
  const r = rules()
  expect(r.touching()).toBe(false)
  r.down(1, 'walk', 100, 300, 0)
  expect(r.touching()).toBe(true)
  r.mask()
  expect(r.touching()).toBe(true)
  r.up(1)
  expect(r.touching()).toBe(false)
})

test('clear lets go of everything, and the ring is gone', () => {
  const r = rules()
  r.down(1, 'walk', 100, 300, 0)
  r.move(1, 160, 300, 100)
  r.down(2, 'jump', 300, 300, 100)
  r.clear()
  expect(names(r.held())).toEqual([])
  expect(names(r.drain())).toEqual([])
  expect(r.ring()).toBeUndefined()
})
