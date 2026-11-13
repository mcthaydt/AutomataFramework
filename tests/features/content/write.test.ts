import { expect, test } from 'vitest'
import { parseContent, writeContent } from '#src/features/content/content.ts'
import { exampleLevel } from './level.test.ts'

test('writeContent is stable: schema order, two spaces, one tile row per line, a newline at the end', () => {
  // The keys arrive in another order than the schema's, and `upright` is left to its default.
  const text = writeContent('character', {
    color: '#c9a227',
    size: { h: 1, w: 1 },
    body: 'dynamic',
    id: 'crate',
    format: 1,
  })
  expect(text).toBe(
    [
      '{',
      '  "format": 1,',
      '  "id": "crate",',
      '  "body": "dynamic",',
      '  "size": {',
      '    "w": 1,',
      '    "h": 1',
      '  },',
      '  "color": "#c9a227",',
      '  "upright": false',
      '}',
      '',
    ].join('\n'),
  )
})

test('a level is written with one tile row per line, and reads back as the same value', () => {
  const text = writeContent('level', exampleLevel() as Parameters<typeof writeContent<'level'>>[1])
  expect(text.endsWith('}\n')).toBe(true)
  expect(text).toContain('    "................",\n    "................",\n    "################"\n')
  const parsed = parseContent('level', text, 'content/levels/level-1.json')
  expect(parsed.ok && parsed.value).toEqual(exampleLevel())
  // Writing what was read gives the same bytes: two writers of one value never disagree.
  if (parsed.ok) expect(writeContent('level', parsed.value)).toBe(text)
})

test('writeContent refuses a value that does not pass its schema, and says why', () => {
  const bad = { ...exampleLevel(), tiles: ['....', '...'] } as Parameters<typeof writeContent<'level'>>[1]
  expect(() => writeContent('level', bad)).toThrow(
    'level: tiles[1]: This row has 3 tiles but the first row has 4. Every row must be the same length.',
  )
})
