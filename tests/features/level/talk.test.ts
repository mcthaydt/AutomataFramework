// Where a conversation goes next, as plain values: no sim.
import { expect, test } from 'vitest'
import { type ConversationFile, parseContent } from '#src/features/content/content.ts'
import { choosePlace, nextPlace, openAt } from '#src/features/level/talk.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

/** The full game's keeper: `hello` offers two choices; `tip` and `bye` end. */
function fullGameConversation(): ConversationFile {
  const path = 'content/conversations/keeper.json'
  const parsed = parseContent('conversation', fullGameFiles[path] ?? '', path)
  if (!parsed.ok) throw new Error('the keeper did not read')
  return parsed.value
}
const keeper = fullGameConversation()

test('hello waits for a pick; "Any tips?" leads to the tip, which ends', () => {
  expect(openAt(keeper)).toEqual({ node: 'hello', line: 0 })
  expect(nextPlace(keeper, { node: 'hello', line: 0 })).toBe('pick')
  expect(choosePlace(keeper, { node: 'hello', line: 0 }, 0)).toEqual({ node: 'tip', line: 0 })
  expect(choosePlace(keeper, { node: 'hello', line: 0 }, 1)).toEqual({ node: 'bye', line: 0 })
  expect(choosePlace(keeper, { node: 'hello', line: 0 }, 2)).toBeUndefined()
  expect(choosePlace(keeper, { node: 'tip', line: 0 }, 0)).toBeUndefined()
  expect(nextPlace(keeper, { node: 'tip', line: 0 })).toBe('end')
})

const talk = (nodes: ConversationFile['nodes']): ConversationFile => ({
  format: 1,
  id: 'talk',
  start: 'a',
  nodes,
})

test('lines of one node are said in order, then "next" is followed', () => {
  const file = talk([
    { id: 'a', lines: ['one', 'two', 'three'], next: 'b' },
    { id: 'b', lines: ['four'] },
  ])
  expect(nextPlace(file, { node: 'a', line: 0 })).toEqual({ node: 'a', line: 1 })
  expect(nextPlace(file, { node: 'a', line: 1 })).toEqual({ node: 'a', line: 2 })
  expect(nextPlace(file, { node: 'a', line: 2 })).toEqual({ node: 'b', line: 0 })
  expect(nextPlace(file, { node: 'b', line: 0 })).toBe('end')
})

test('a choice is offered after the last line of its node, and not before', () => {
  const file = talk([
    {
      id: 'a',
      lines: ['one', 'two'],
      choices: [
        { line: 'left', next: 'b' },
        { line: 'right', next: 'c' },
      ],
    },
    { id: 'b', lines: ['four'] },
    { id: 'c', lines: ['five'] },
  ])
  expect(nextPlace(file, { node: 'a', line: 0 })).toEqual({ node: 'a', line: 1 })
  expect(choosePlace(file, { node: 'a', line: 0 }, 0)).toBeUndefined()
  expect(nextPlace(file, { node: 'a', line: 1 })).toBe('pick')
  expect(choosePlace(file, { node: 'a', line: 1 }, 1)).toEqual({ node: 'c', line: 0 })
})

test('a choice is a whole number inside the choices', () => {
  const at = { node: 'hello', line: 0 }
  expect(choosePlace(keeper, at, -1)).toBeUndefined()
  expect(choosePlace(keeper, at, 0.5)).toBeUndefined()
  expect(choosePlace(keeper, at, Number.NaN)).toBeUndefined()
})

test('a node the file does not have is the end', () => {
  const nowhere = { node: 'nowhere', line: 0 }
  expect(nextPlace(keeper, nowhere)).toBe('end')
  expect(choosePlace(keeper, nowhere, 0)).toBeUndefined()
})
