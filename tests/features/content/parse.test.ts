import { expect, test } from 'vitest'
import { CONTENT_TYPES, formatDiagnostic, parseContent, parseProject } from '#src/features/content/content.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

test('a problem reads as file: place: message, and without a place as file: message', () => {
  expect(formatDiagnostic({ file: 'a.json', path: 'tiles[1]', message: 'Too short.' })).toBe(
    'a.json: tiles[1]: Too short.',
  )
  expect(formatDiagnostic({ file: 'a.json', path: '', message: 'Not JSON.' })).toBe('a.json: Not JSON.')
})

test('each content type names the editor that opens it', () => {
  expect(CONTENT_TYPES.level.editor).toBe('world')
  expect(CONTENT_TYPES.character.editor).toBe('characters')
})

const crate = (): unknown => JSON.parse(fixtureFiles['content/characters/crate.json'] ?? '')

/** The problems of `parseContent('character', text, 'c.json')`, each as a person reads it. */
const problemsOf = (text: string): string[] => {
  const parsed = parseContent('character', text, 'c.json')
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}

test('a byte-order mark and Windows line ends change nothing', () => {
  const plain = JSON.stringify(crate(), null, 2)
  const windows = `\uFEFF${plain.replaceAll('\n', '\r\n')}\r\n`
  expect(parseContent('character', windows, 'c.json')).toEqual(parseContent('character', plain, 'c.json'))
  expect(parseContent('character', windows, 'c.json').ok).toBe(true)
  expect(parseProject(`\uFEFF${fixtureFiles['automata.toml']?.replaceAll('\n', '\r\n')}`).ok).toBe(true)
})

test('a number too big to be a number', () =>
  expect(
    problemsOf('{"format":1,"id":"crate","body":"dynamic","size":{"w":1e999,"h":1},"color":"#c9a227"}'),
  ).toEqual(['c.json: size.w: This must be a number.']))
