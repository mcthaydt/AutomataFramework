import { expect, test } from 'vitest'
import { CONTENT_TYPES, formatDiagnostic } from '#src/features/content/content.ts'

test('a problem reads as file: place: message, and without a place as file: message', () => {
  expect(formatDiagnostic({ file: 'a.json', path: 'tiles[1]', message: 'Too short.' })).toBe(
    'a.json: tiles[1]: Too short.',
  )
  expect(formatDiagnostic({ file: 'a.json', path: '', message: 'Not JSON.' })).toBe('a.json: Not JSON.')
})

test('each content type names the editor that opens it', () => {
  expect(CONTENT_TYPES.level.editor).toBe('levels')
  expect(CONTENT_TYPES.character.editor).toBe('characters')
})
