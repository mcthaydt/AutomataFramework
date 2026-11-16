// What a step's events mean for the level (plan Q, Task 6): won, lost, or neither, and a win beats a loss.
import { expect, test } from 'vitest'
import { levelEnd } from '#src/features/flow/loading.ts'

const project = { done: 'door.touched', lost: 'hero.fell' }
const touched = (player: number) => ({ type: 'door.touched', payload: { player } })
const fell = { type: 'hero.fell', payload: { player: 1, sid: 4 } }

test('the done event ends it as done and the lost event as lost', () => {
  expect(levelEnd(project, [touched(1)])).toBe('done')
  expect(levelEnd(project, [fell])).toBe('lost')
})

test('both in one step is a win', () => {
  expect(levelEnd(project, [fell, touched(1)])).toBe('done')
  expect(levelEnd(project, [touched(1), fell])).toBe('done')
})

test('a crate on the door is not a win, and a crate that falls is not a loss', () => {
  expect(levelEnd(project, [touched(0)])).toBeUndefined()
  expect(levelEnd(project, [{ type: 'hero.fell', payload: { player: 0, sid: 9 } }])).toBeUndefined()
})

test('nothing named, or nothing said, ends nothing', () => {
  expect(levelEnd({ done: undefined, lost: undefined }, [touched(1), fell])).toBeUndefined()
  expect(levelEnd(project, [{ type: 'other', payload: {} }])).toBeUndefined()
  expect(levelEnd({ done: 'door.touched', lost: undefined }, [fell])).toBeUndefined()
})
