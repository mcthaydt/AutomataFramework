import { describe, expect, test } from 'vitest'
import {
  parseContent,
  SHOWN_FOR,
  shownOf,
  withDefaults,
  writeContent,
} from '#src/features/content/content.ts'
import { onStep } from '#src/features/content/values.ts'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

const FILE = 'content/x/character.json'

/** A plate: fixed, sensed, and listing what it opens. */
const plate = (extra: Record<string, unknown> = {}) => ({
  format: 1,
  id: 'plate',
  body: 'fixed',
  size: { w: 1, h: 0.25 },
  color: '#aaaaaa',
  upright: false,
  kind: 'plate',
  touch: 'sense',
  values: [{ id: 'opens', name: 'Opens', type: 'thing', kinds: ['gate'], most: 4 }],
  switch: { opens: 'opens' },
  ...extra,
})

const number = (extra: Record<string, unknown> = {}) => ({
  id: 'reach',
  name: 'Reach',
  type: 'number',
  least: 1,
  most: 8,
  default: 3,
  ...extra,
})

const problems = (value: unknown): string[] => problemsOf('character', value, FILE)

/** A plate that is no switch, holding only these values. */
const holding = (values: unknown[]) => plate({ values, switch: undefined })

describe('every type of value is accepted', () => {
  test('one of each, and written back the way it was written', () => {
    const everything = plate({
      touch: undefined,
      kind: 'thing',
      switch: undefined,
      values: [
        number({ step: 0.5, shown: 'reach' }),
        { id: 'stays', name: 'Stays', type: 'switch', default: false, shown: 'none' },
        {
          id: 'colour',
          name: 'Colour',
          type: 'choice',
          from: [
            { id: 'red', name: 'Red' },
            { id: 'blue', name: 'Blue' },
          ],
          default: 'red',
        },
        { id: 'says', name: 'Says', type: 'words', about: 'What a sign shows.', default: 'sign.welcome' },
        { id: 'opens', name: 'Opens', type: 'thing', kinds: ['gate'], most: 4, needed: true },
        { id: 'walk', name: 'Walk', type: 'path', least: 2, most: 8, loop: true },
        { id: 'to', name: 'Leads to', type: 'leads-to', needed: true },
      ],
    })
    expect(problems(everything)).toEqual([])
    expectRoundTrip('character', JSON.parse(JSON.stringify(everything)))
  })

  test('a gate and a goal say how they behave', () => {
    const gate = {
      format: 1,
      id: 'gate',
      body: 'fixed',
      size: { w: 0.5, h: 8 },
      color: '#888888',
      upright: false,
      kind: 'gate',
      opens: 'walk-through',
      'one-per-level': true,
    }
    expect(problems(gate)).toEqual([])
    expectRoundTrip('character', gate)
  })
})

describe('what is written, and where', () => {
  test('a character that writes none of the four fields parses to a value with none of them', () => {
    const plain = { format: 1, id: 'crate', body: 'dynamic', size: { w: 1, h: 1 }, color: '#c9a227' }
    const parsed = parseContent('character', JSON.stringify(plain), FILE)
    expect(parsed.ok && Object.keys(parsed.value)).toEqual([
      'format',
      'id',
      'body',
      'size',
      'color',
      'upright',
    ])
  })

  test('the new fields are written in the schema order, after moves', () => {
    const written = JSON.parse(writeContent('character', plate() as never)) as Record<string, unknown>
    expect(Object.keys(written)).toEqual([
      'format',
      'id',
      'body',
      'size',
      'color',
      'upright',
      'kind',
      'touch',
      'values',
      'switch',
    ])
    const gate = plate({ touch: undefined, switch: undefined, opens: 'walk-through', 'one-per-level': true })
    expect(Object.keys(JSON.parse(writeContent('character', gate as never))).slice(-3)).toEqual([
      'values',
      'opens',
      'one-per-level',
    ])
  })
})

describe('a value declaration that cannot be right', () => {
  test('an id used twice', () =>
    expect(problems(holding([number({ id: 'opens' }), number({ id: 'opens' })]))).toEqual([
      `${FILE}: values[1].id: "opens" is used twice. Each value needs its own id.`,
    ]))

  test('least above most', () =>
    expect(problems(holding([number({ least: 8, most: 1, default: 5 })]))).toEqual([
      `${FILE}: values[0].least: "least" must not be more than "most".`,
    ]))

  test('a number default outside its limits', () =>
    expect(problems(holding([number({ default: 9 })]))).toEqual([
      `${FILE}: values[0].default: The default must be from 1 to 8. Got 9.`,
    ]))

  test('a number default off its step', () =>
    expect(problems(holding([number({ step: 0.5, default: 1.3 })]))).toEqual([
      `${FILE}: values[0].default: The default must be 1 plus a whole number of steps of 0.5. Got 1.3.`,
    ]))

  test('a choice default that is not an option', () =>
    expect(
      problems(
        plate({
          values: [
            {
              id: 'colour',
              name: 'Colour',
              type: 'choice',
              from: [
                { id: 'red', name: 'Red' },
                { id: 'blue', name: 'Blue' },
              ],
              default: 'green',
            },
          ],
          switch: undefined,
        }),
      ),
    ).toEqual([`${FILE}: values[0].default: The default must be one of: blue, red. Got "green".`]))

  test('a shown the type cannot draw', () =>
    expect(
      problems(
        plate({
          values: [{ id: 'stays', name: 'Stays', type: 'switch', default: false, shown: 'arrow' }],
          switch: undefined,
        }),
      ),
    ).toEqual([`${FILE}: values[0].shown: A switch cannot be shown as "arrow". Use one of: none, tag.`]))

  test('more than sixteen values', () => {
    const many = Array.from({ length: 17 }, (_, i) => number({ id: `n-${i}` }))
    expect(problems(holding(many))).toEqual([
      `${FILE}: values: This has more than 16 items, which is the most allowed.`,
    ])
  })
})

describe('a character that is a switch or a gate', () => {
  test('a switch needs touch: "sense"', () =>
    expect(problems(plate({ touch: undefined }))).toEqual([
      `${FILE}: switch: A switch is pressed by what touches it: give this character "touch": "sense".`,
    ]))

  test('switch.opens must name a thing value', () => {
    expect(problems(plate({ values: [], switch: { opens: 'opens' } }))).toEqual([
      `${FILE}: switch.opens: "opens" must name one of this character's "thing" values. It has: nothing.`,
    ])
    expect(problems(plate({ values: [number()], switch: { opens: 'reach' } }))).toEqual([
      `${FILE}: switch.opens: "reach" must name one of this character's "thing" values. It has: nothing.`,
    ])
  })

  test('switch.stays must name a switch value', () =>
    expect(problems(plate({ switch: { opens: 'opens', stays: 'opens' } }))).toEqual([
      `${FILE}: switch.stays: "opens" must name one of this character's "switch" values. It has: nothing.`,
    ]))

  test('a switch whose stays names a switch value is fine', () => {
    const stays = { id: 'stays', name: 'Stays', type: 'switch', default: false }
    const value = plate({
      values: [{ id: 'opens', name: 'Opens', type: 'thing', most: 4 }, stays],
      switch: { opens: 'opens', stays: 'stays' },
    })
    expect(problems(value)).toEqual([])
  })

  test('opens is only for a fixed character with no touch', () => {
    const gate = { ...plate(), values: undefined, switch: undefined, touch: undefined, opens: 'walk-through' }
    expect(problems({ ...gate, body: 'dynamic' })).toEqual([
      `${FILE}: opens: Only a "fixed" character with no "touch" can be walked through when open.`,
    ])
    expect(problems({ ...gate, touch: 'sense' })).toEqual([
      `${FILE}: opens: Only a "fixed" character with no "touch" can be walked through when open.`,
    ])
  })
})

describe('how a value is drawn', () => {
  test('each type draws as its usual thing unless it says otherwise', () => {
    const declared = (type: string, extra: Record<string, unknown> = {}) =>
      ({ id: 'v', name: 'V', type, ...extra }) as never
    expect(shownOf(declared('number', { least: 1, most: 2, default: 1 }))).toBe('tag')
    expect(shownOf(declared('switch', { default: true }))).toBe('tag')
    expect(shownOf(declared('choice', { from: [{ id: 'a', name: 'A' }], default: 'a' }))).toBe('tag')
    expect(shownOf(declared('words'))).toBe('tag')
    expect(shownOf(declared('thing'))).toBe('arrow')
    expect(shownOf(declared('path'))).toBe('path')
    expect(shownOf(declared('leads-to'))).toBe('tag')
    expect(shownOf(declared('number', { least: 1, most: 2, default: 1, shown: 'reach' }))).toBe('reach')
  })

  test('what each type may be drawn as', () => {
    expect(SHOWN_FOR.number).toEqual(['tag', 'reach', 'none'])
    expect(SHOWN_FOR.thing).toEqual(['arrow', 'none'])
    expect(SHOWN_FOR.path).toEqual(['path', 'none'])
  })
})

describe('a step', () => {
  test('is a whole number of them from the least', () => {
    expect(onStep(1.5, 1, 0.5)).toBe(true)
    expect(onStep(1, 1, 0.5)).toBe(true)
    expect(onStep(1.3, 1, 0.5)).toBe(false)
    expect(onStep(0.3, 0, 0.1)).toBe(true)
  })
})

describe('defaults', () => {
  const character = {
    values: [
      number(),
      { id: 'stays', name: 'Stays', type: 'switch', default: false },
      { id: 'says', name: 'Says', type: 'words', default: 'sign.welcome' },
      { id: 'opens', name: 'Opens', type: 'thing' },
    ],
  } as never

  test('fill in what a thing leaves out, and keep what it wrote', () => {
    expect(withDefaults(character, {})).toEqual({ reach: 3, stays: false, says: 'sign.welcome' })
    expect(withDefaults(character, { values: { reach: 5, stays: true, opens: 'gate-1' } })).toEqual({
      reach: 5,
      stays: true,
      says: 'sign.welcome',
      opens: 'gate-1',
    })
  })

  test('a character with no values gives back what the thing wrote', () => {
    expect(withDefaults({}, { values: { x: 1 } })).toEqual({ x: 1 })
    expect(withDefaults({}, {})).toEqual({})
  })
})
