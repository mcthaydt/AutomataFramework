import { expect, test } from 'vitest'
import { FOLDERS_FILE, filesIn, folderManifest, listFromManifest } from '#src/features/content/content.ts'

test('filesIn keeps the json files in name order and drops atlases, other files and sub-folders', () => {
  expect(filesIn(['b.json', 'a.json', 'hero.atlas.json', 'notes.txt', 'sub/x.json', 'c.JSON'])).toEqual([
    'a.json',
    'b.json',
  ])
  expect(filesIn([])).toEqual([])
})

test('the manifest is sorted, two-space JSON with a last newline', () => {
  expect(FOLDERS_FILE).toBe('automata.folders.json')
  expect(folderManifest({ 'content/sounds': ['b.json', 'a.json'], 'content/music': ['m.json'] })).toBe(
    '{\n  "content/music": [\n    "m.json"\n  ],\n  "content/sounds": [\n    "a.json",\n    "b.json"\n  ]\n}\n',
  )
})

test('listFromManifest gives back the names folderManifest was given', async () => {
  const text = folderManifest({ 'content/sounds': ['b.json', 'a.json'] })
  const list = listFromManifest(async (path) => {
    if (path !== FOLDERS_FILE) throw new Error('no such file')
    return text
  })
  expect(await list('content/sounds')).toEqual(['a.json', 'b.json'])
  expect(await list('content/music')).toEqual([])
})

test('a missing or broken manifest lists nothing and does not throw', async () => {
  const missing = listFromManifest(async () => {
    throw new Error('no such file')
  })
  expect(await missing('content/sounds')).toEqual([])
  for (const text of ['not json', '[]', 'null', '{"content/sounds": 7}']) {
    const list = listFromManifest(async () => text)
    expect(await list('content/sounds')).toEqual([])
  }
})

test('the manifest is read once', async () => {
  let reads = 0
  const list = listFromManifest(async () => {
    reads++
    return folderManifest({ 'content/sounds': ['a.json'] })
  })
  await Promise.all([list('content/sounds'), list('content/music'), list('content/sounds')])
  expect(reads).toBe(1)
})
