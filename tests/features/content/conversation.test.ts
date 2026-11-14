import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { english, keeperTalk, storyGame } from '../../fixtures/content/story.ts'

type Json = Record<string, unknown>
const file = 'content/conversations/keeper.json'
const said = (value: unknown): string[] => problemsOf('conversation', value, file)
const withNodes = (change: (nodes: Json[]) => void): ReturnType<typeof keeperTalk> => {
  const value = keeperTalk()
  change(value.nodes as unknown as Json[])
  return value
}
const nodeAt = (nodes: Json[], i: number): Json => nodes[i] as Json

test('a conversation reads, and writes back to the same bytes twice', () =>
  expectRoundTrip('conversation', keeperTalk()))

test('two nodes with one id', () =>
  expect(
    said(
      withNodes((n) => {
        n.push({ id: 'bye', lines: ['keeper.bye'] })
      }),
    ),
  ).toEqual([`${file}: nodes[3].id: "bye" is used twice. Each node needs its own id.`]))

test('a start, a next and a choice that lead to no node', () => {
  const found = said({
    ...withNodes((n) => {
      nodeAt(n, 1).next = 'by'
      nodeAt(n, 0).choices = [
        { line: 'hero.ask', next: 'tip' },
        { line: 'hero.bye', next: 'bey' },
      ]
    }),
    start: 'hullo',
  })
  expect(found).toEqual([
    `${file}: start: There is no node called "hullo". This conversation has: bye, hello, tip.`,
    `${file}: nodes[0].choices[1].next: There is no node called "bey". This conversation has: bye, hello, tip.`,
    `${file}: nodes[1].next: There is no node called "by". This conversation has: bye, hello, tip.`,
    `${file}: nodes[2]: Nothing leads to this node. Remove it, or point a "next" or a choice at it.`,
  ])
})

test('a node with choices and a "next"', () =>
  expect(said(withNodes((n) => (nodeAt(n, 0).next = 'bye')))).toEqual([
    `${file}: nodes[0]: A node has choices or a "next", not both.`,
  ]))

test('a node nothing leads to', () =>
  expect(
    said(
      withNodes((n) => {
        n.push({ id: 'lonely', lines: ['keeper.hello'] })
      }),
    ),
  ).toEqual([
    `${file}: nodes[3]: Nothing leads to this node. Remove it, or point a "next" or a choice at it.`,
  ]))

test('a conversation that goes round and round', () => {
  const loop = {
    format: 1,
    id: 'keeper',
    start: 'hello',
    nodes: [
      { id: 'hello', lines: ['keeper.hello'], next: 'again' },
      { id: 'again', lines: ['keeper.hello'], next: 'hello' },
    ],
  }
  expect(said(loop)).toEqual([
    `${file}: nodes[0].next: This goes round and round with no choice and no end: hello, then again, then hello. Give one of them a choice, or remove a "next".`,
  ])
  const alone = { ...loop, nodes: [{ id: 'hello', lines: ['keeper.hello'], next: 'hello' }] }
  expect(said(alone)).toEqual([
    `${file}: nodes[0].next: This goes round and round with no choice and no end: hello, then hello. Give one of them a choice, or remove a "next".`,
  ])
})

test('a loop with a choice in it is not stuck, and a chain that leads into a loop says it once', () => {
  const choiceInLoop = {
    format: 1,
    id: 'keeper',
    start: 'hello',
    nodes: [
      {
        id: 'hello',
        lines: ['keeper.hello'],
        choices: [
          { line: 'hero.ask', next: 'again' },
          { line: 'hero.bye', next: 'bye' },
        ],
      },
      { id: 'again', lines: ['keeper.tip'], next: 'hello' },
      { id: 'bye', lines: ['keeper.bye'] },
    ],
  }
  expect(said(choiceInLoop)).toEqual([])
  const intoLoop = {
    format: 1,
    id: 'keeper',
    start: 'a',
    nodes: [
      { id: 'a', lines: ['keeper.hello'], next: 'b' },
      { id: 'b', lines: ['keeper.hello'], next: 'c' },
      { id: 'c', lines: ['keeper.hello'], next: 'b' },
    ],
  }
  expect(said(intoLoop)).toEqual([
    `${file}: nodes[1].next: This goes round and round with no choice and no end: b, then c, then b. Give one of them a choice, or remove a "next".`,
  ])
})

test('one choice, and five', () => {
  expect(said(withNodes((n) => (nodeAt(n, 0).choices = [{ line: 'hero.ask', next: 'tip' }])))).toContain(
    `${file}: nodes[0].choices: This needs at least 2 items.`,
  )
  expect(
    said(
      withNodes(
        (n) => (nodeAt(n, 0).choices = Array.from({ length: 5 }, () => ({ line: 'hero.ask', next: 'tip' }))),
      ),
    ),
  ).toContain(`${file}: nodes[0].choices: This has more than 4 items, which is the most allowed.`)
})

test('a missing field says what to write', () =>
  expect(said(withNodes((n) => delete nodeAt(n, 1).lines))).toEqual([
    `${file}: nodes[1].lines: This is missing. List what is said as message keys, like ["keeper.hello"].`,
  ]))

test('an unknown key', () =>
  expect(said({ ...keeperTalk(), mood: 1 })).toEqual([
    `${file}: mood: This is not something a conversation has. Remove it or check the spelling.`,
  ]))

const inGame = (talk: unknown, withEnglish = true) =>
  storyGame([
    ...(withEnglish
      ? [
          {
            type: 'messages' as const,
            path: 'content/messages/en.json',
            text: writeContent('messages', english()),
          },
        ]
      : []),
    { type: 'conversation', path: file, text: writeContent('conversation', talk as never) },
  ])

test('a conversation whose speaker and words are all in the game loads', async () =>
  expect(await gameProblems(inGame(keeperTalk()))).toEqual([]))

test('a speaker who is not a character', async () =>
  expect(await gameProblems(inGame(withNodes((n) => (nodeAt(n, 1).speaker = 'keper'))))).toEqual([
    `${file}: nodes[1].speaker: There is no character called "keper". This game has: crate, hero, keeper.`,
  ]))

test('a line or a choice English does not have', async () =>
  expect(
    await gameProblems(
      inGame(
        withNodes((n) => {
          nodeAt(n, 1).lines = ['keeper.helo']
          nodeAt(n, 0).choices = [
            { line: 'hero.ask', next: 'tip' },
            { line: 'hero.byee', next: 'bye' },
          ]
        }),
      ),
    ),
  ).toEqual([
    `${file}: nodes[0].choices[1].line: English has no message called "hero.byee". Add it to the English file or fix the spelling.`,
    `${file}: nodes[1].lines[0]: English has no message called "keeper.helo". Add it to the English file or fix the spelling.`,
  ]))

test('a game with a conversation and no English file at all reports every line', async () => {
  const found = await gameProblems(inGame(keeperTalk(), false))
  expect(found).toHaveLength(5)
  expect(found[0]).toBe(
    `${file}: nodes[0].lines[0]: English has no message called "keeper.hello". Add it to the English file or fix the spelling.`,
  )
})
