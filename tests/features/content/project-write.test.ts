import { expect, test } from 'vitest'
import {
  CONTENT_TYPES,
  formatDiagnostic,
  listContent,
  PROJECT_FILE,
  parseProject,
} from '#src/features/content/content.ts'
import automata from '../../../template/automata.toml?raw'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const FIXTURE = fixtureFiles[PROJECT_FILE] ?? ''
const KEEPER = { type: 'figure', path: 'content/figures/keeper.json' } as const

/** The new text, or the sentences that refused it, one per problem. */
function listed(text: string, entry: { type: string; path: string }, about?: string): string | string[] {
  const result = listContent(text, entry, about)
  return result.ok ? result.value : result.diagnostics.map(formatDiagnostic)
}

/** The entries a project text lists, in order. */
function entriesOf(text: string): readonly { type: string; path: string }[] {
  const parsed = parseProject(text)
  if (!parsed.ok) throw new Error(parsed.diagnostics.map(formatDiagnostic).join('\n'))
  return parsed.value.content
}

test('the template with its last block cut off, given that block back, is the template, byte for byte', () => {
  const cut = automata.slice(0, automata.lastIndexOf('\n[[content]]'))
  expect(cut).not.toBe(automata)
  expect(listed(cut, { type: 'messages', path: 'content/messages/pt.json' })).toBe(automata)
})

test('a block is added at the end after one blank line, with the note above it as a comment', () => {
  expect(listed(FIXTURE, KEEPER, "The keeper's picture.")).toBe(
    `${FIXTURE}\n# The keeper's picture.\n[[content]]\ntype = "figure"\npath = "content/figures/keeper.json"\n`,
  )
  expect(listed(FIXTURE, KEEPER)).toBe(
    `${FIXTURE}\n[[content]]\ntype = "figure"\npath = "content/figures/keeper.json"\n`,
  )
})

test('every byte that was there is still there, in order, and the new file is listed last', () => {
  const after = listed(automata, KEEPER, 'The keeper.')
  expect(typeof after === 'string' && after.startsWith(automata)).toBe(true)
  expect(entriesOf(after as string).at(-1)).toEqual(KEEPER)
  expect(entriesOf(after as string)).toHaveLength(entriesOf(automata).length + 1)
})

test('a file that uses Windows line ends gets a block with Windows line ends', () => {
  const windows = FIXTURE.replaceAll('\n', '\r\n')
  const after = listed(windows, KEEPER, 'The keeper.') as string
  expect(after).toBe(
    `${windows}\r\n# The keeper.\r\n[[content]]\r\ntype = "figure"\r\npath = "content/figures/keeper.json"\r\n`,
  )
  expect(after.replaceAll('\r\n', '').includes('\n')).toBe(false)
  expect(entriesOf(after).at(-1)).toEqual(KEEPER)
})

test('a file with no newline at the end gets the one it lacks, and then the blank line', () => {
  const bare = FIXTURE.trimEnd()
  expect(listed(bare, KEEPER)).toBe(
    `${bare}\n\n[[content]]\ntype = "figure"\npath = "content/figures/keeper.json"\n`,
  )
})

test('blank lines already at the end are the blank line: no second one is added', () => {
  const spaced = `${FIXTURE}\n\n`
  expect(listed(spaced, KEEPER)).toBe(
    `${spaced}[[content]]\ntype = "figure"\npath = "content/figures/keeper.json"\n`,
  )
})

test('a comment after the last block stays where it is, above the new block', () => {
  const ending = `${FIXTURE}\n# Everything below here is the keeper's.\n`
  const after = listed(ending, KEEPER) as string
  expect(after.startsWith(ending)).toBe(true)
  expect(entriesOf(after).at(-1)).toEqual(KEEPER)
})

test('a byte-order mark at the start is kept', () => {
  const marked = `﻿${FIXTURE}`
  const after = listed(marked, KEEPER) as string
  expect(after.startsWith(marked)).toBe(true)
  expect(entriesOf(after).at(-1)).toEqual(KEEPER)
})

test('a project that writes content = [ … ] on one line has no block to follow, so it says what to add and where', () => {
  const inline = `format = 1\nname = "Crate Game"\nstart = "level-1"\nhero = "hero"\ncontent = [ { type = "level", path = "content/levels/level-1.json" } ]\n`
  expect(listed(inline, KEEPER)).toEqual([
    'automata.toml: This automata.toml lists its files in one "content = […]" value. Add this file there by hand: { type = "figure", path = "content/figures/keeper.json" }.',
  ])
})

test('an entry that is already listed gives the text back unchanged', () => {
  const same = listContent(FIXTURE, { type: 'level', path: 'content/levels/level-1.json' }, 'Again.')
  expect(same).toEqual({ ok: true, value: FIXTURE })
})

test('an entry already listed as another kind of file is refused with the kind it is listed as', () => {
  expect(listed(FIXTURE, { type: 'figure', path: 'content/levels/level-1.json' })).toEqual([
    'automata.toml: content/levels/level-1.json is already listed as a level, not a figure.',
  ])
})

test('a path outside the game is refused with the project file’s own advice', () => {
  const hint = 'Use a path inside the game, like content/levels/level-1.json.'
  expect(listed(FIXTURE, { type: 'figure', path: '../keeper.json' })).toEqual([`automata.toml: ${hint}`])
  expect(listed(FIXTURE, { type: 'figure', path: 'content/figures/keeper.png' })).toEqual([
    `automata.toml: ${hint}`,
  ])
})

test('a kind that is not in the table names the kinds there are', () => {
  expect(listed(FIXTURE, { type: 'monster', path: 'content/monsters/blob.json' })).toEqual([
    `automata.toml: There is no kind of file called "monster". The kinds are: ${Object.keys(CONTENT_TYPES).sort().join(', ')}.`,
  ])
})

test('a project file that does not read is refused with its own problems, and nothing is added', () => {
  expect(listed(FIXTURE.replace('name = "Crate Game"\n', ''), KEEPER)).toEqual([
    'automata.toml: name: This is missing. Write the name of your game, like name = "Crate Game".',
  ])
  expect((listed('name = ', KEEPER) as string[])[0]).toMatch(/^automata\.toml: This file is not valid TOML\./)
})

test('a note with a line break in it is refused, and says to write it on one line', () => {
  for (const about of ['one\ntwo', 'one\r\ntwo', 'one\rtwo'])
    expect(listed(FIXTURE, KEEPER, about)).toEqual([
      'automata.toml: Write the note on one line, with no line break in it.',
    ])
})

test('a path with a quote in it is written escaped, so the file still reads', () => {
  const odd = { type: 'figure', path: 'content/figures/the "keeper".json' }
  expect(entriesOf(listed(FIXTURE, odd) as string).at(-1)).toEqual(odd)
})

test('ten entries added one after another read back as those ten, in order', () => {
  let text = FIXTURE
  const added: { type: string; path: string }[] = []
  for (let i = 1; i <= 10; i++) {
    const entry = { type: 'figure', path: `content/figures/figure-${i}.json` }
    const next = listed(text, entry, `Figure ${i}.`)
    expect(typeof next).toBe('string')
    text = next as string
    added.push(entry)
  }
  expect(entriesOf(text).slice(-10)).toEqual(added)
  expect(text.startsWith(FIXTURE)).toBe(true)
})
