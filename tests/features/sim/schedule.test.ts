// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/schedule/schedule.test.ts
import { expect, test } from 'vitest'
import { definePlugin, defineSystem, type Phase } from '#src/features/sim/definitions.ts'
import { orderPlugins, orderSystems } from '#src/features/sim/schedule.ts'

const sys = (name: string, phase: Phase, rel: { before?: string[]; after?: string[] } = {}) =>
  defineSystem({ name, phase, ...rel, run: () => {} })
const names = (list: ReadonlyArray<{ name: string }>) => list.map((s) => s.name)

test('systems run in fixed phase order', () => {
  const out = orderSystems([
    sys('c', 'cleanup'),
    sys('g', 'gameplay'),
    sys('i', 'input'),
    sys('p', 'physics'),
  ])
  expect(names(out)).toEqual(['i', 'p', 'g', 'c'])
})

test('within a phase: before/after constraints, ties broken by name, listing order irrelevant', () => {
  const a = [sys('zeta', 'gameplay'), sys('alpha', 'gameplay', { after: ['zeta'] }), sys('mid', 'gameplay')]
  const expected = ['mid', 'zeta', 'alpha']
  expect(names(orderSystems(a))).toEqual(expected)
  expect(names(orderSystems([...a].reverse()))).toEqual(expected)
  expect(names(orderSystems([sys('b', 'gameplay', { before: ['a'] }), sys('a', 'gameplay')]))).toEqual([
    'b',
    'a',
  ])
})

test('cycles, unknown references, duplicates and cross-phase constraints throw', () => {
  expect(() =>
    orderSystems([sys('a', 'gameplay', { after: ['b'] }), sys('b', 'gameplay', { after: ['a'] })]),
  ).toThrow(/cycle.*a.*b/)
  expect(() => orderSystems([sys('a', 'gameplay', { after: ['ghost'] })])).toThrow(/unknown system "ghost"/)
  expect(() => orderSystems([sys('a', 'gameplay'), sys('a', 'input')])).toThrow(/duplicate system "a"/)
  expect(() => orderSystems([sys('a', 'gameplay', { after: ['b'] }), sys('b', 'input')])).toThrow(
    /different phase/,
  )
})

test('plugins: dependencies first, otherwise sorted by name; listing order irrelevant', () => {
  const p = (name: string, dependsOn: string[] = []) => definePlugin({ name, dependsOn })
  const list = [p('zgame', ['physics']), p('physics'), p('audio')]
  expect(names(orderPlugins(list))).toEqual(['audio', 'physics', 'zgame'])
  expect(names(orderPlugins([...list].reverse()))).toEqual(['audio', 'physics', 'zgame'])
  expect(names(orderPlugins([p('a', ['z']), p('z')]))).toEqual(['z', 'a'])
})

test('plugin errors: unknown dependency, cycle, duplicate', () => {
  const p = (name: string, dependsOn: string[] = []) => definePlugin({ name, dependsOn })
  expect(() => orderPlugins([p('a', ['missing'])])).toThrow(/unknown plugin "missing"/)
  expect(() => orderPlugins([p('a', ['b']), p('b', ['a'])])).toThrow(/cycle/)
  expect(() => orderPlugins([p('a'), p('a')])).toThrow(/duplicate plugin "a"/)
})
