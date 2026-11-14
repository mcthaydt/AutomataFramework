import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { artGame, BACKDROP_PATH, valleyBackdrop } from '../../fixtures/content/art.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const file = BACKDROP_PATH
const said = (value: unknown): string[] => problemsOf('backdrop', value, file)
const list = (value: Json, key: string): Json[] => value[key] as Json[]
const edit = (change: (value: Json) => void): Json => {
  const value = valleyBackdrop() as Json
  change(value)
  return value
}

test('a backdrop reads, and writes back to the same bytes twice', () =>
  expectRoundTrip('backdrop', valleyBackdrop()))

test('a backdrop is written in the schema’s order', () =>
  expect(Object.keys(JSON.parse(writeContent('backdrop', valleyBackdrop() as never)))).toEqual([
    'format',
    'id',
    'seed',
    'tile',
    'width',
    'layers',
    'props',
  ]))

test('two layers or props with one id', () => {
  expect(said(edit((v) => list(v, 'layers').push({ ...list(v, 'layers')[0] })))).toEqual([
    `${file}: layers[3].id: "haze" is used twice. Each layer needs its own id.`,
  ])
  expect(said(edit((v) => list(v, 'props').push({ ...list(v, 'props')[0] })))).toEqual([
    `${file}: props[1].id: "tree-1" is used twice. Each prop needs its own id.`,
  ])
})

test('a prop on a layer the backdrop does not have', () => {
  const wrong = edit((v) => Object.assign(list(v, 'props')[0] as Json, { layer: 'hils' }))
  expect(said(wrong)).toEqual([
    `${file}: props[0].layer: There is no layer called "hils". This backdrop has: far, haze, near.`,
  ])
})

test('a backdrop whose picture would be too wide', () =>
  expect(said(edit((v) => Object.assign(v, { width: 128, tile: 32 })))).toEqual([
    `${file}: width: This backdrop's picture would be 4096 pixels wide. A picture can be 2048 at most: use a smaller "width" or "tile".`,
  ]))

test('a backdrop whose picture would be too tall', () => {
  // Three layers 20 tiles high at 64 pixels a tile are 1280 pixels each.
  const tall = edit((v) => {
    Object.assign(v, { width: 4, tile: 64 })
    for (const layer of list(v, 'layers')) layer.height = 20
  })
  expect(said(tall)).toEqual([
    `${file}: layers: This backdrop's picture would be 3840 pixels tall. A picture can be 2048 at most: use lower layers or a smaller "tile".`,
  ])
})

const layer = (value: Json, i = 0): Json => list(value, 'layers')[i] as Json

test('a drift, a height and a seed out of range', () => {
  expect(said(edit((v) => Object.assign(layer(v), { drift: 2 })))).toEqual([
    `${file}: layers[0].drift: This must be 1 or less.`,
  ])
  expect(said(edit((v) => Object.assign(layer(v), { height: 0 })))).toEqual([
    `${file}: layers[0].height: This must be more than 0.`,
  ])
  expect(said(edit((v) => Object.assign(v, { seed: -1 })))).toEqual([`${file}: seed: This must be 0 or more.`])
})

test('a layer that is not a kind the painter knows', () =>
  expect(said(edit((v) => Object.assign(layer(v), { kind: 'sea' })))).toEqual([
    `${file}: layers[0].kind: This must be one of: flat, hills, mountains, clouds.`,
  ]))

test('a missing field says what to write', () =>
  expect(said(edit((v) => delete v.props))).toEqual([
    `${file}: props: This is missing. Write [] if nothing stands on the layers.`,
  ]))

test('an unknown key', () =>
  expect(said(edit((v) => Object.assign(v, { wind: 3 })))).toEqual([
    `${file}: wind: This is not something a backdrop has. Remove it or check the spelling.`,
  ]))

const inGame = (value: unknown, replace: Record<string, string | undefined> = {}) =>
  artGame([{ type: 'backdrop', path: file, text: writeContent('backdrop', value as never) }], replace)

test('a backdrop whose props are figures of the game loads', async () =>
  expect(await gameProblems(inGame(valleyBackdrop()))).toEqual([]))

test('a prop that is a figure the game does not have, or a pose the figure lacks', async () => {
  const problems = await gameProblems(
    inGame(
      edit((v) => {
        list(v, 'props').push({ id: 'tree-2', figure: 'tre', layer: 'near', x: 9, up: 0 })
        Object.assign(list(v, 'props')[0] as Json, { pose: 'wave' })
      }),
    ),
  )
  expect(problems).toEqual([
    `${file}: props[0].pose: The figure "keeper" has no pose called "wave". It has: idle, talk.`,
    `${file}: props[1].figure: There is no figure called "tre". This game has: hero, keeper.`,
  ])
})
