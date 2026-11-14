// The example story files and a game to put them in: the fixture game, with a keeper to talk to and English words.
import { type MessagesFile, writeContent } from '#src/features/content/content.ts'
import { fixtureFiles } from '../game/read.ts'
import { changed, gameFiles } from './kind.ts'

/** A file as an author writes it: the two keys every file has, and the rest as a test wants to change it. */
export type Written = { format: 1; id: string } & Record<string, unknown>

/** The keeper's conversation: a greeting, a choice of two, and two ways it ends. */
export const keeperTalk = (): Written => ({
  format: 1 as const,
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
})

/** The cutscene that opens level 1. */
export const intro = (): Written => ({
  format: 1 as const,
  id: 'level-1-intro',
  level: 'level-1',
  length: 300,
  camera: [
    { at: 0, x: 4, y: 4, zoom: 1, ease: 'cut' },
    { at: 120, x: 8, y: 4, zoom: 1.5, ease: 'smooth' },
  ],
  actors: [
    { at: 0, who: 'keeper', x: 8.5, y: 7.5 },
    { at: 60, who: 'keeper', x: 8.5, y: 7.5 },
  ],
  lines: [{ at: 60, until: 180, line: 'keeper.hello', speaker: 'keeper' }],
})

/** English words for the keeper's talk and the intro. */
export const english = (): MessagesFile => ({
  format: 1 as const,
  id: 'en',
  messages: {
    'hero.ask': 'Any tips?',
    'hero.bye': 'See you.',
    'keeper.bye': 'Take care.',
    'keeper.hello': 'Hello there!',
    'keeper.tip': 'Push the crate onto the ledge.',
  },
})

export const keeperCharacter = (): string =>
  writeContent('character', {
    format: 1,
    id: 'keeper',
    body: 'fixed',
    size: { w: 0.8, h: 1 },
    color: '#7a9e3b',
  } as never)

export const KEEPER_PATH = 'content/characters/keeper.json'

/**
 * The fixture game with a keeper (a character, standing in level 1), and whatever else a test lists. `replace` has the
 * last word on any path, and `undefined` makes a listed file missing.
 */
export function storyGame(
  extra: Parameters<typeof gameFiles>[1] = [],
  replace: Parameters<typeof gameFiles>[2] = {},
): Record<string, string | undefined> {
  return gameFiles(
    fixtureFiles,
    [{ type: 'character', path: KEEPER_PATH, text: keeperCharacter() }, ...extra],
    {
      'content/levels/level-1.json': changed(
        'level',
        fixtureFiles['content/levels/level-1.json'],
        (level) => {
          ;(level.things as Record<string, unknown>[]).push({
            id: 'keeper',
            character: 'keeper',
            x: 8.5,
            y: 7.5,
          })
        },
      ),
      ...replace,
    },
  )
}
