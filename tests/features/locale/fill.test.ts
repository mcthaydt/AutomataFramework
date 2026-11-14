// Values go into a text where their names are, once, in the language's own way.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { LANGUAGES } from '#src/features/content/content.ts'
import { fill } from '#src/features/locale/locale.ts'

afterEach(() => vi.unstubAllGlobals())

test('a value goes where its name is, as often as it is named', () => {
  expect(fill('Waiting for {count} more. {count}!', { count: 2 }, 'en')).toBe('Waiting for 2 more. 2!')
  expect(fill('Hola, {name}', { name: 'Ana' }, 'es')).toBe('Hola, Ana')
  expect(fill('No values asked for', { count: 2 }, 'en')).toBe('No values asked for')
})

test('a number is shown as written, and a list is joined the way the language joins one', () => {
  expect(fill('Players {players}', { players: [1, 2, 4] }, 'en')).toBe('Players 1, 2 and 4')
  expect(fill('Players {players}', { players: [1, 3] }, 'en')).toBe('Players 1 and 3')
  expect(fill('{players}', { players: [2] }, 'ko')).toBe('2')
  expect(fill('{n}', { n: 0.5 }, 'en')).toBe('0.5')
  // Every number is there, in order, in every language and every engine.
  for (const language of LANGUAGES) expect(fill('{p}', { p: [1, 2, 4] }, language)).toMatch(/1.*2.*4/)
})

test('a name with no value is shown as typed; a value nobody asked for is ignored', () => {
  expect(fill('Hi {name}', {}, 'en')).toBe('Hi {name}')
  expect(fill('Hi {name}', undefined, 'en')).toBe('Hi {name}')
  expect(fill('Hi {a} and {b}', { b: 'Bo' }, 'en')).toBe('Hi {a} and Bo')
})

test('a value is never filled a second time, and what it holds is only text', () => {
  expect(fill('{a} {b}', { a: '{b}', b: 'x' }, 'en')).toBe('{b} x')
  expect(fill('{a}', { a: '$& $1 $$' }, 'en')).toBe('$& $1 $$')
})

test('a value named like something every object has is only a value', () => {
  expect(fill('{constructor} {toString} {hasOwnProperty}', {}, 'en')).toBe('{constructor} {toString} {hasOwnProperty}')
  expect(fill('{constructor}', { constructor: 'Ana' }, 'en')).toBe('Ana')
})

test('a name that starts another name is its own name', () => {
  expect(fill('{a} {ab}', { a: '1', ab: '2' }, 'en')).toBe('1 2')
})

describe('an engine with no list formatter', () => {
  test('joins with commas', () => {
    vi.stubGlobal('Intl', Object.create(Intl, { ListFormat: { value: undefined } }))
    expect(fill('{p}', { p: [1, 2, 4] }, 'en')).toBe('1, 2, 4')
    expect(fill('{p}', { p: [1, 2, 4] }, 'ja')).toBe('1, 2, 4')
  })
})
