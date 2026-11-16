import { expect, test } from 'vitest'
import { ALL_ENGINES, engineFor, journeyEngines } from '../fixtures/journey-engines.ts'

test('every engine plays unless a run says otherwise', () => {
  expect(journeyEngines(undefined)).toEqual(ALL_ENGINES)
  expect(journeyEngines('')).toEqual(ALL_ENGINES)
})

test('a draft names Chromium alone', () => {
  expect(journeyEngines('chromium')).toEqual(['chromium'])
  expect(journeyEngines(' webkit , chromium ')).toEqual(['chromium', 'webkit'])
})

test('a name that is not a browser is refused, so a typo does not quietly skip an engine', () => {
  expect(() => journeyEngines('chrome')).toThrow('chrome')
})

test('a player whose engine is not playing gets the first one that is', () => {
  expect(engineFor('webkit', ['chromium'])).toBe('chromium')
  expect(engineFor('webkit', ALL_ENGINES)).toBe('webkit')
  expect(engineFor('firefox', ['webkit', 'chromium'])).toBe('webkit')
})
