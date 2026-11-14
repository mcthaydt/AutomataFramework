// Small games built in memory for the story's tests: the M1 fixture's hero, a level 16 tiles wide and 9 tall with a floor
// and a wall up each side, and whatever a test adds (a keeper, a critter, their files). Every file is written with
// `writeContent`, so each one loads as an author's would, and a bad game fails here with the sentences an author gets.
import {
  type ContentType,
  formatDiagnostic,
  type GameContent,
  loadGame,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles, readFiles } from '../content/kind.ts'
import { fixtureFiles } from '../game/read.ts'

/** The player start points, one tile apart from the second on, along the floor. */
const STARTS = [2.5, 4.5, 6.5, 8.5]

/** The full game's critter and its behaviour: run from a hero within 3 tiles, else wander. */
export const critterFile: Record<string, unknown> = {
  format: 1,
  id: 'critter',
  body: 'dynamic',
  size: { w: 0.6, h: 0.6 },
  color: '#4f9d9d',
  upright: true,
  kind: 'critter',
  behaviour: 'critter',
}
export const critterBehaviour: Record<string, unknown> = {
  format: 1,
  id: 'critter',
  rules: [
    {
      id: 'run-away',
      when: [{ sense: 'near', kind: 'hero', within: 3 }],
      do: { act: 'flee', from: 'hero', speed: 4 },
    },
    { id: 'wander', when: [], do: { act: 'wander', speed: 1, turnEvery: 90 } },
  ],
}

/** The full game's keeper: fixed, with a name and a conversation to open. */
export const keeperFile: Record<string, unknown> = {
  format: 1,
  id: 'keeper',
  body: 'fixed',
  size: { w: 0.8, h: 1 },
  color: '#7a9e3b',
  upright: false,
  kind: 'keeper',
  name: 'keeper.name',
  conversation: 'keeper',
}

/** The keeper's talk: a greeting with two choices; the first leads to a tip that ends, the second to a goodbye. */
export const keeperTalk: Record<string, unknown> = {
  format: 1,
  id: 'keeper',
  start: 'hello',
  nodes: [
    {
      id: 'hello',
      speaker: 'keeper',
      lines: ['keeper.hello'],
      choices: [
        { line: 'hero.ask', next: 'tip' },
        { line: 'hero.bye', next: 'bye' },
      ],
    },
    { id: 'tip', speaker: 'keeper', lines: ['keeper.tip'] },
    { id: 'bye', speaker: 'keeper', lines: ['keeper.bye'] },
  ],
}

/** The English words of the keeper's talk. */
export const keeperWords: Readonly<Record<string, string>> = {
  'hero.ask': 'Any tips?',
  'hero.bye': 'See you.',
  'keeper.bye': 'Take care.',
  'keeper.hello': 'Hello there!',
  'keeper.name': 'Keeper',
  'keeper.tip': 'Push the crate onto the ledge.',
  'keeper.welcome': 'Welcome!',
}

/** What a mini game has beyond the M1 fixture's hero and crate. Each file is a value `writeContent` accepts. */
export interface MiniGame {
  /** How many players the game is for; default 1. Each has a start point along the floor. */
  readonly players?: number
  /** Where each player starts, from the left (the first is player 1), instead of the default places. */
  readonly starts?: readonly number[]
  readonly things?: readonly { id: string; character: string; x: number; y: number }[]
  /** Levels beyond `level-1`, each a value `writeContent` accepts. */
  readonly levels?: readonly object[]
  readonly characters?: readonly object[]
  readonly behaviours?: readonly object[]
  readonly conversations?: readonly object[]
  readonly cutscenes?: readonly object[]
  /** English words, by key. */
  readonly words?: Readonly<Record<string, string>>
}

/** The level: a floor, a wall each side, nothing else. */
const tiles = [...Array.from({ length: 8 }, () => `#${'.'.repeat(14)}#`), '#'.repeat(16)]

/** The files of a mini game, by path. */
export function miniFiles(game: MiniGame = {}): Record<string, string | undefined> {
  const xs = game.starts ?? STARTS.slice(0, game.players ?? 1)
  const players = xs.length
  const listed = (type: ContentType, plural: string, files: readonly object[] = []) =>
    files.map((file) => {
      const id = (file as { id: string }).id
      return { type, path: `content/${plural}/${id}.json`, text: writeContent(type, file as never) }
    })
  const base = {
    ...fixtureFiles,
    'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace(
      'hero = "hero"\n',
      players > 1 ? `hero = "hero"\nplayers = ${players}\n` : 'hero = "hero"\n',
    ),
    // The behaviours look for a hero by its kind.
    'content/characters/hero.json': writeContent('character', {
      ...(JSON.parse(fixtureFiles['content/characters/hero.json'] ?? '') as object),
      kind: 'hero',
    } as never),
  }
  return gameFiles(
    base,
    [
      ...listed('level', 'levels', game.levels),
      ...listed('character', 'characters', game.characters),
      ...listed('behaviour', 'behaviours', game.behaviours),
      ...listed('conversation', 'conversations', game.conversations),
      ...listed('cutscene', 'cutscenes', game.cutscenes),
      ...(game.words === undefined
        ? []
        : [
            {
              type: 'messages' as const,
              path: 'content/messages/en.json',
              text: writeContent('messages', { format: 1, id: 'en', messages: { ...game.words } }),
            },
          ]),
    ],
    {
      'content/levels/level-1.json': writeContent('level', {
        format: 1,
        id: 'level-1',
        tiles,
        things: [...(game.things ?? [])],
        starts: xs.map((x, i) => ({ player: i + 1, x, y: 7.5 })),
      } as never),
    },
  )
}

/** A mini game, loaded. Throws, naming every problem, when it does not load. */
export async function miniGame(game: MiniGame = {}): Promise<GameContent> {
  const loaded = await loadGame(readFiles(miniFiles(game)))
  if (!loaded.ok)
    throw new Error(`The mini game did not load:\n${loaded.diagnostics.map(formatDiagnostic).join('\n')}`)
  return loaded.value
}
