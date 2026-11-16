// The links game: the game every test of plan W's formats, checks and sim parts runs on. Three levels, 16 tiles wide and
// 9 tall, with a plate and a gate, a button that stays down, doors that lead back, a goal, and a critter with a path.
// Built in memory, each file as `writeContent` writes it, so a test changes one file by overriding its path.
import {
  DEFAULT_HERO_CONTROLS,
  formatDiagnostic,
  type GameContent,
  loadGame,
  MOVE_NUMBERS,
  writeContent,
} from '#src/features/content/content.ts'
import { readFiles } from '../content/kind.ts'

type Files = Record<string, string | undefined>

/** A row of the level's map: a solid wall at each end, or open at the right. */
const closed = '#..............#'
const openRight = '#...............'
const openLeft = '...............#'
const floor = '################'

const tiles = (upper: string, lower: string): string[] => [
  ...Array.from({ length: 5 }, () => upper),
  ...Array.from({ length: 3 }, () => lower),
  floor,
]

const starts = [
  { player: 1, x: 2.5, y: 7.5 },
  { player: 2, x: 3.5, y: 7.5 },
]

const character = (id: string, rest: Record<string, unknown>): Record<string, unknown> => ({
  format: 1,
  id,
  body: 'fixed',
  size: { w: 1, h: 1 },
  color: '#8a8a8a',
  upright: false,
  ...rest,
})

const opensValue = { id: 'opens', name: 'Opens', type: 'thing', kinds: ['gate'], most: 4 }

const CHARACTERS: Record<string, Record<string, unknown>> = {
  hero: character('hero', {
    body: 'dynamic',
    size: { w: 0.8, h: 1 },
    color: '#e4572e',
    upright: true,
    moves: { tuning: 'hero-moves', 'double-jump': false, 'wall-jump': false, dash: false },
  }),
  crate: character('crate', { body: 'dynamic', color: '#c9a227', kind: 'crate' }),
  plate: character('plate', {
    size: { w: 1, h: 0.25 },
    kind: 'plate',
    touch: 'sense',
    values: [opensValue],
    switch: { opens: 'opens' },
  }),
  button: character('button', {
    size: { w: 1, h: 0.25 },
    kind: 'button',
    touch: 'sense',
    values: [opensValue, { id: 'stays', name: 'Stays', type: 'switch', default: false }],
    switch: { opens: 'opens', stays: 'stays' },
  }),
  gate: character('gate', { size: { w: 0.5, h: 8 }, kind: 'gate', opens: 'walk-through' }),
  door: character('door', {
    size: { w: 1, h: 2 },
    kind: 'door',
    touch: 'sense',
    values: [{ id: 'to', name: 'Leads to', type: 'leads-to' }],
  }),
  goal: character('goal', { kind: 'goal', touch: 'sense', 'one-per-level': true }),
  critter: character('critter', {
    body: 'dynamic',
    upright: true,
    kind: 'critter',
    behaviour: 'patrol',
    values: [
      { id: 'walk', name: 'Walk', type: 'path' },
      {
        id: 'reach',
        name: 'Reach',
        type: 'number',
        least: 1,
        most: 8,
        step: 0.5,
        default: 3,
        shown: 'reach',
      },
    ],
  }),
}

const LEVELS: Record<string, Record<string, unknown>> = {
  'room-1': {
    format: 1,
    id: 'room-1',
    tiles: tiles(closed, closed),
    things: [
      { id: 'crate-1', character: 'crate', x: 5.5, y: 7.5 },
      { id: 'plate-1', character: 'plate', x: 8.5, y: 7.875, values: { opens: ['gate-1'] } },
      { id: 'gate-1', character: 'gate', x: 11.25, y: 4 },
      { id: 'exit', character: 'door', x: 13.5, y: 7, values: { to: { level: 'room-2', thing: 'door-in' } } },
    ],
    starts,
  },
  'room-2': {
    format: 1,
    id: 'room-2',
    tiles: tiles(closed, openRight),
    things: [
      {
        id: 'door-in',
        character: 'door',
        x: 2.5,
        y: 7,
        values: { to: { level: 'room-1', thing: 'exit' } },
      },
      { id: 'crate-1', character: 'crate', x: 5.5, y: 7.5 },
      {
        id: 'critter-1',
        character: 'critter',
        x: 7.5,
        y: 7.5,
        values: {
          walk: [
            { x: 7.5, y: 7.5 },
            { x: 9.5, y: 7.5 },
          ],
        },
      },
      {
        id: 'button-1',
        character: 'button',
        x: 11.5,
        y: 7.875,
        values: { opens: ['gate-1'], stays: true },
      },
      { id: 'gate-1', character: 'gate', x: 13.25, y: 4 },
    ],
    starts,
  },
  'room-3': {
    format: 1,
    id: 'room-3',
    tiles: tiles(closed, openLeft),
    things: [
      { id: 'goal-1', character: 'goal', x: 13.5, y: 7.5 },
      { id: 'back', character: 'door', x: 14.5, y: 7, values: { to: { level: 'room-1', thing: 'exit' } } },
    ],
    starts,
  },
}

const tuning = {
  format: 1,
  id: 'hero-moves',
  numbers: MOVE_NUMBERS.map((n) => ({
    id: n.id,
    about: n.about,
    value: n.value,
    min: n.min,
    max: n.max,
    step: n.step,
  })),
  controls: DEFAULT_HERO_CONTROLS,
}

const behaviour = {
  format: 1,
  id: 'patrol',
  rules: [{ id: 'walk', when: [], do: { act: 'walk-path', path: 'walk', speed: 2 } }],
}

/** Room 2 and room 3 touch, and are open where they meet: one place. Room 1 is a long way off. */
const world = {
  format: 1,
  id: 'world',
  levels: [
    { level: 'room-1', at: { x: 0, y: 0 } },
    { level: 'room-2', at: { x: 20, y: 0 } },
    { level: 'room-3', at: { x: 36, y: 0 } },
  ],
}

const words = { format: 1, id: 'en', messages: { 'sign.welcome': 'Welcome to the links game.' } }

/** What each file of the game is: its kind and its folder-and-name, in the order the project lists them. */
const LISTED: readonly { type: string; path: string }[] = [
  ...Object.keys(LEVELS).map((id) => ({ type: 'level', path: `content/levels/${id}.json` })),
  ...Object.keys(CHARACTERS).map((id) => ({ type: 'character', path: `content/characters/${id}.json` })),
  { type: 'behaviour', path: 'content/behaviours/patrol.json' },
  { type: 'tuning', path: 'content/tunings/hero-moves.json' },
  { type: 'messages', path: 'content/messages/en.json' },
  { type: 'world', path: 'content/worlds/world.json' },
]

const PROJECT = `format = 1
name = "Links Game"
start = "room-1"
hero = "hero"
players = 2
source = "en"
levels = ["room-1", "room-2", "room-3"]
done = "goal.touched"
${LISTED.map((f) => `\n[[content]]\ntype = "${f.type}"\npath = "${f.path}"\n`).join('')}`

/**
 * Every file of the links game by its path from the game's root. An override replaces a file (or adds one);
 * `undefined` makes it missing, the way a real read of a file that is not there rejects.
 */
export function linksFiles(overrides: Readonly<Files> = {}): Files {
  const files: Files = { 'automata.toml': PROJECT }
  for (const [id, level] of Object.entries(LEVELS))
    files[`content/levels/${id}.json`] = writeContent('level', level as never)
  for (const [id, one] of Object.entries(CHARACTERS))
    files[`content/characters/${id}.json`] = writeContent('character', one as never)
  files['content/behaviours/patrol.json'] = writeContent('behaviour', behaviour as never)
  files['content/tunings/hero-moves.json'] = writeContent('tuning', tuning as never)
  files['content/messages/en.json'] = writeContent('messages', words as never)
  files['content/worlds/world.json'] = writeContent('world', world as never)
  return { ...files, ...overrides }
}

/** The links game read; throws, naming every problem, when it does not read (a test of its files says so first). */
export async function loadLinksGame(overrides: Readonly<Files> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFiles(linksFiles(overrides)))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map(formatDiagnostic).join('\n'))
  return loaded.value
}

/** A level of the links game as a test edits it: the file's own fields, with the lists a test moves things in. */
export interface LevelJson {
  things: { id: string; character: string; x: number; y: number; values?: Record<string, unknown> }[]
  starts: { player: number; x: number; y: number }[]
  [field: string]: unknown
}

/**
 * An override that changes one level of the links game: its file is read, handed to `change`, and written back as
 * `writeContent` writes it, so the changed game is one an editor or an agent could have saved.
 */
export function editLevel(id: string, change: (level: LevelJson) => void): Files {
  const path = `content/levels/${id}.json`
  const level = JSON.parse(linksFiles()[path] ?? '') as LevelJson
  change(level)
  return { [path]: writeContent('level', level as never) }
}
