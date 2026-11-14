import { expect, test } from 'vitest'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

const landDust = () => ({
  format: 1 as const,
  id: 'land-dust',
  on: 'hero.landed',
  dust: { count: 8, color: '#e8dcc0', speed: 2, life: 20 },
})
const crateShake = () => ({
  format: 1 as const,
  id: 'crate-shake',
  on: 'crate.landed',
  shake: { strength: 0.1, ticks: 10 },
})
const sparkFreeze = () => ({
  format: 1 as const,
  id: 'spark-freeze',
  on: 'spark.taken',
  freeze: { ticks: 4 },
})
const file = 'content/feels/land-dust.json'
const said = (value: unknown): string[] => problemsOf('feel', value, file)

test('each effect reads, and writes back to the same bytes twice', () => {
  for (const feel of [landDust(), crateShake(), sparkFreeze()]) expectRoundTrip('feel', feel)
})

test('a feel that does nothing', () =>
  expect(said({ format: 1, id: 'land-dust', on: 'hero.landed' })).toEqual([
    `${file}: Say what happens: add "dust", "shake" or "freeze".`,
  ]))

test('no file can shake more than a tile or hold still for more than half a second', () => {
  expect(said({ ...crateShake(), shake: { strength: 1.5, ticks: 10 } })).toEqual([
    `${file}: shake.strength: This must be 1 or less.`,
  ])
  expect(said({ ...crateShake(), shake: { strength: 0.1, ticks: 61 } })).toEqual([
    `${file}: shake.ticks: This must be 60 or less.`,
  ])
  expect(said({ ...sparkFreeze(), freeze: { ticks: 31 } })).toEqual([
    `${file}: freeze.ticks: This must be 30 or less.`,
  ])
})

test('dust has to have at least one speck, and ticks are whole', () => {
  expect(said({ ...landDust(), dust: { count: 0, color: '#e8dcc0', speed: 2, life: 20 } })).toEqual([
    `${file}: dust.count: This must be 1 or more.`,
  ])
  expect(said({ ...landDust(), dust: { count: 8, color: '#e8dcc0', speed: 2, life: 1.5 } })).toEqual([
    `${file}: dust.life: This must be a whole number.`,
  ])
})

test('an event name that is not lower-case words', () =>
  expect(said({ ...landDust(), on: 'Hero Landed' })).toEqual([
    `${file}: on: Write the event's name, like "hero.landed".`,
  ]))

test('a missing field says what to write', () =>
  expect(said({ ...landDust(), dust: { color: '#e8dcc0', speed: 2, life: 20 } })).toEqual([
    `${file}: dust.count: This is missing. Write how many specks, like 8.`,
  ]))

test('an unknown key', () =>
  expect(said({ ...landDust(), loud: true })).toEqual([
    `${file}: loud: This is not something a feel has. Remove it or check the spelling.`,
  ]))
