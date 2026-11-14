// What a character senses and which rule fits, as plain numbers: no sim.
import { expect, test } from 'vitest'
import { type BehaviourFile, parseContent } from '#src/features/content/content.ts'
import { firstRule, Mind, type Sensed, stepOf } from '#src/features/level/mind.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

/** The full game's critter: run away from a hero within 3 tiles, else wander. */
function fullGameBehaviour(): BehaviourFile {
  const path = 'content/behaviours/critter.json'
  const parsed = parseContent('behaviour', fullGameFiles[path] ?? '', path)
  if (!parsed.ok) throw new Error('the critter did not read')
  return parsed.value
}
const critter = fullGameBehaviour()

/** What a thing senses: the nearest of each kind, and the two flags. */
const sensed = (
  nearest: Sensed['nearest'],
  flags: { blocked?: boolean; onGround?: boolean } = {},
): Sensed => ({
  blocked: flags.blocked ?? false,
  onGround: flags.onGround ?? false,
  nearest,
})

test('a mind is the component a thing with a behaviour carries', () => expect(Mind.id).toBe('mind'))

test('with the hero near, the critter runs away; with no hero, it wanders', () => {
  expect(firstRule(critter.rules, sensed({ hero: { distance: 2, side: -1 } })).id).toBe('run-away')
  expect(firstRule(critter.rules, sensed({ hero: { distance: 3, side: -1 } })).id).toBe('wander') // 3 is not within 3
  expect(firstRule(critter.rules, sensed({})).id).toBe('wander')
})

test('"far" holds when there is none of that kind, and "near" does not', () => {
  const rules: BehaviourFile['rules'] = [
    { id: 'far', when: [{ sense: 'far', kind: 'hero', beyond: 5 }], do: { act: 'stay' } },
    { id: 'near', when: [{ sense: 'near', kind: 'hero', within: 5 }], do: { act: 'stay' } },
    { id: 'rest', when: [], do: { act: 'stay' } },
  ]
  expect(firstRule(rules, sensed({})).id).toBe('far')
  expect(firstRule(rules, sensed({ hero: { distance: 6, side: 1 } })).id).toBe('far')
  expect(firstRule(rules, sensed({ hero: { distance: 5, side: 1 } })).id).toBe('rest') // not beyond 5, not within 5
  expect(firstRule(rules, sensed({ hero: { distance: 4, side: 1 } })).id).toBe('near')
})

test('every sense of a rule must hold, and "blocked" and "on-ground" read the flags', () => {
  const rules: BehaviourFile['rules'] = [
    { id: 'hop', when: [{ sense: 'blocked' }, { sense: 'on-ground' }], do: { act: 'jump', speed: 5 } },
    { id: 'rest', when: [], do: { act: 'stay' } },
  ]
  expect(firstRule(rules, sensed({}, { blocked: true })).id).toBe('rest')
  expect(firstRule(rules, sensed({}, { onGround: true })).id).toBe('rest')
  expect(firstRule(rules, sensed({}, { blocked: true, onGround: true })).id).toBe('hop')
})

test('flee runs away from the side the hero is on', () => {
  const flee = { act: 'flee', from: 'hero', speed: 4 } as const
  expect(stepOf(flee, sensed({ hero: { distance: 2, side: -1 } }), { dir: -1, since: 0 }, 10)).toEqual({
    vx: 4,
    dir: 1,
    since: 0,
  })
  expect(stepOf(flee, sensed({ hero: { distance: 2, side: 1 } }), { dir: 1, since: 0 }, 10)).toEqual({
    vx: -4,
    dir: -1,
    since: 0,
  })
  // On the very same spot it keeps the way it was going, and with nobody near it stands.
  expect(stepOf(flee, sensed({ hero: { distance: 0, side: 0 } }), { dir: -1, since: 0 }, 10)).toEqual({
    vx: -4,
    dir: -1,
    since: 0,
  })
  expect(stepOf(flee, sensed({}), { dir: -1, since: 0 }, 10)).toEqual({ vx: 0, dir: -1, since: 0 })
})

test('wander turns round on time, and at once when it walks into something', () => {
  const wander = { act: 'wander', speed: 1, turnEvery: 90 } as const
  expect(stepOf(wander, sensed({}), { dir: 1, since: 0 }, 89)).toEqual({ vx: 1, dir: 1, since: 0 })
  expect(stepOf(wander, sensed({}), { dir: 1, since: 0 }, 90)).toEqual({ vx: -1, dir: -1, since: 90 })
  expect(stepOf(wander, sensed({}, { blocked: true }), { dir: 1, since: 0 }, 5)).toEqual({
    vx: -1,
    dir: -1,
    since: 5,
  })
  // It turned this very tick, so being blocked does not turn it back.
  expect(stepOf(wander, sensed({}, { blocked: true }), { dir: -1, since: 5 }, 5)).toEqual({
    vx: -1,
    dir: -1,
    since: 5,
  })
})

test('follow walks toward the nearest, and stops when it has arrived or has nobody to follow', () => {
  const follow = { act: 'follow', to: 'hero', speed: 2 } as const
  expect(stepOf(follow, sensed({ hero: { distance: 3, side: 1 } }), { dir: -1, since: 7 }, 10)).toEqual({
    vx: 2,
    dir: 1,
    since: 7,
  })
  expect(stepOf(follow, sensed({ hero: { distance: 3, side: -1 } }), { dir: 1, since: 7 }, 10)).toEqual({
    vx: -2,
    dir: -1,
    since: 7,
  })
  expect(stepOf(follow, sensed({ hero: { distance: 0.04, side: 1 } }), { dir: 1, since: 7 }, 10)).toEqual({
    vx: 0,
    dir: 1,
    since: 7,
  })
  expect(stepOf(follow, sensed({ hero: { distance: 2, side: 0 } }), { dir: 1, since: 7 }, 10)).toEqual({
    vx: 0,
    dir: 1,
    since: 7,
  })
  expect(stepOf(follow, sensed({}), { dir: 1, since: 7 }, 10)).toEqual({ vx: 0, dir: 1, since: 7 })
})

test('stay stops sideways and leaves the rest alone, and jump only leaves the ground', () => {
  expect(stepOf({ act: 'stay' }, sensed({}), { dir: -1, since: 3 }, 10)).toEqual({ vx: 0, dir: -1, since: 3 })
  const jump = { act: 'jump', speed: 9 } as const
  // y points down, so up is negative.
  expect(stepOf(jump, sensed({}, { onGround: true }), { dir: 1, since: 3 }, 10)).toEqual({
    vy: -9,
    dir: 1,
    since: 3,
  })
  expect(stepOf(jump, sensed({}), { dir: 1, since: 3 }, 10)).toEqual({ dir: 1, since: 3 })
})
