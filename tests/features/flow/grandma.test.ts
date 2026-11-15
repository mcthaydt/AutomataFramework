// The drunk-grandma test, as far as a file can say it: no screen of the flow has a sentence of its own in its markup or in
// its `.ts`. Every word a screen shows comes through `words(...)`, so a player sees it in their language and a game can
// change it. That every key of the words is used, and that every key used is there, is `tests/features/locale/library.test.ts`;
// that each screen names its one main button, and that no control is too small, is `journey-sizes.browser.test.ts`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const SRC = join(import.meta.dirname, '../../../src/features')

/** The files of `folder` (under `src/features`) that end in `ending`. */
const filesIn = (folder: string, ending: string): string[] =>
  readdirSync(join(SRC, folder))
    .filter((name) => name.endsWith(ending))
    .map((name) => join(SRC, folder, name))

const PARTS = [...filesIn('screens', '.svelte'), ...filesIn('ui', '.svelte')]

test('there are parts to look at', () => {
  expect(PARTS.length).toBeGreaterThan(10)
})

/** The markup of a part: no script, no style, no comment, no tag and no `{expression}`, which is what is left to read. */
function readable(file: string): string {
  let text = readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  // Svelte's own blocks and expressions (`{#if …}`, `{label}`, `{...a ? {} : {}}`), the innermost first.
  let before = ''
  while (before !== text) {
    before = text
    text = text.replace(/\{[^{}]*\}/g, '')
  }
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, '')
}

test.each(PARTS)('%s has no sentence of its own in its markup', (file) => {
  expect(readable(file), 'text between tags is a sentence the player cannot translate').toBe('')
})

test.each(PARTS)('%s has no literal name on a control', (file) => {
  const markup = readFileSync(file, 'utf8')
  const literal = /\b(aria-label|title|alt|placeholder)="[^"{]*[A-Za-z]/.exec(markup)
  expect(literal?.[0], 'a name for a screen reader must come from the words').toBeUndefined()
})

/** The props a screen gives its part that hold words. */
const WORDY = ['label', 'title', 'yes', 'no', 'hint', 'refused', 'notice', 'note', 'reload', 'cancel']
const SENTENCE = new RegExp(`\\b(?:${WORDY.join('|')}): '[^']*[A-Za-z]`)

test.each(filesIn('screens', '.ts').filter((file) => !file.endsWith('-rows.ts')))(
  '%s hands no literal sentence to its part',
  (file) => {
    expect(SENTENCE.exec(readFileSync(file, 'utf8'))?.[0]).toBeUndefined()
  },
)
