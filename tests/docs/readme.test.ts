import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { CONTENT_TYPES } from '#src/features/content/content-types.ts'
import { TOUCH_PROPERTIES } from '#src/features/input/touch.ts'
import * as framework from '#src/headless.ts'

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

// `${d.file}: ${d.message}` drops `d.path`, the part that says where in the file to look, so the example must use the
// function that keeps it.
test('the README prints a problem with its place, using what the package exports (the browser entry re-exports the headless one)', () => {
  expect(readme).toContain('formatDiagnostic')
  expect(readme).not.toContain('d.message')
  expect(typeof framework.formatDiagnostic).toBe('function')
})

// A game can only set what it can find: every property the buttons read is named in the README.
test('the README names every property a game can set on the touch buttons', () => {
  expect(TOUCH_PROPERTIES).toHaveLength(7)
  for (const property of TOUCH_PROPERTIES) expect(readme).toContain(property)
})

// A game can only write what it can find: every kind's schema is named, and the folder its files go in.
test('the README names every kind of content file, its schema and its folder', () => {
  for (const [type, info] of Object.entries(CONTENT_TYPES)) {
    expect(readme, type).toContain(`schemas/${type}.schema.json`)
    expect(readme, type).toContain(`content/${info.plural}/`)
  }
})
