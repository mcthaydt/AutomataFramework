import { expect, test } from 'vitest'
import { CONTENT_TYPES } from '#src/features/content/content.ts'

test('every kind names its editor, its part and where its files are kept', () => {
  expect(CONTENT_TYPES.level).toMatchObject({ plural: 'levels', editor: 'world', part: 'levels' })
  expect(CONTENT_TYPES.character).toMatchObject({ plural: 'characters', editor: 'characters', part: 'clips' })
  expect(CONTENT_TYPES.figure).toMatchObject({ plural: 'figures', editor: 'characters', part: 'figure' })
  expect(CONTENT_TYPES.backdrop).toMatchObject({ plural: 'backdrops', editor: 'world', part: 'environment' })
  const plurals = Object.values(CONTENT_TYPES).map((info) => info.plural)
  expect(new Set(plurals).size).toBe(plurals.length)
})
