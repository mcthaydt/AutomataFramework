// The flag drawings and the two icons are files of the framework's own: one for each language and no other, plain
// shapes with no script, no style, no words and no link, small enough to read at a glance and drawn at 44 pixels wide.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { LANGUAGES } from '#src/features/content/content.ts'

const LIBRARY = join(import.meta.dirname, '../../../src/features/web/library')
const read = (path: string): string => readFileSync(join(LIBRARY, path), 'utf8')

/** What no drawing may hold: each a way to run code, show words or fetch something. */
const FORBIDDEN: readonly [string, RegExp][] = [
  ['a style', /<style|\sstyle=/i],
  ['a script', /<script|\son[a-z]+=/i],
  ['words', /<text|<tspan|<title|<desc/i],
  ['a link', /href=|<use|<a[\s>]|<foreignObject/i],
  ['a picture', /<image/i],
  ['a data address', /data:|javascript:|https?:/i],
]

test('there is one flag for each language and no other file in the folder', () => {
  expect(readdirSync(join(LIBRARY, 'flags')).sort()).toEqual(LANGUAGES.map((l) => `${l}.svg`).sort())
})

describe.each(LANGUAGES)('the %s flag', (language) => {
  const text = read(`flags/${language}.svg`)

  test('is one drawing, 60 by 40, in plain shapes', () => {
    expect(text.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">')).toBe(true)
    expect(text.trimEnd().endsWith('</svg>')).toBe(true)
    expect(text.match(/<svg/g)).toHaveLength(1)
  })

  test('is under 2048 bytes', () => expect(Buffer.byteLength(text)).toBeLessThan(2048))

  test.each(FORBIDDEN)('holds no %s', (_name, pattern) => expect(text).not.toMatch(pattern))

  test('has more than one colour', () => {
    expect(new Set(text.match(/#[0-9a-f]{6}/gi)).size).toBeGreaterThan(1)
  })
})

test('all six drawings are different', () => {
  expect(new Set(LANGUAGES.map((language) => read(`flags/${language}.svg`))).size).toBe(LANGUAGES.length)
})

describe.each(['globe', 'check'])('the %s icon', (name) => {
  const text = read(`${name}.svg`)
  test('is a 24 by 24 line drawing in the colour of the words around it', () => {
    expect(text.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"')).toBe(true)
    expect(text).toContain('stroke="currentColor"')
    expect(text).toContain('fill="none"')
  })
  test('is under 2048 bytes and holds nothing that runs or reads', () => {
    expect(Buffer.byteLength(text)).toBeLessThan(2048)
    for (const [, pattern] of FORBIDDEN) expect(text).not.toMatch(pattern)
  })
})
