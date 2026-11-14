// The example figures, a backdrop and the characters that wear them: the fixture game with art, for the tests of what
// refers to a figure. (The full game's own art is in tests/fixtures/full-game.) No colour is named in an id or a word.
import { writeContent } from '#src/features/content/content.ts'
import type { GameFile } from './kind.ts'
import { KEEPER_PATH, storyGame, type Written } from './story.ts'

const POSES = ['idle', 'run-1', 'run-2', 'jump', 'fall', 'land', 'push']

/** A hero in three paints, a head and an eye, seven poses and one variant: 24 pixels square. */
export const heroFigure = (): Written => ({
  format: 1 as const,
  id: 'hero',
  tile: 16,
  frame: { w: 24, h: 24 },
  outline: '#111314',
  paints: [
    { id: 'body', color: '#f37f94' },
    { id: 'trim', color: '#fdd4bd' },
    { id: 'ink', color: '#111314' },
  ],
  parts: [
    { id: 'body', shape: 'block', x: 12, y: 15, w: 10, h: 12, paint: 'body' },
    { id: 'head', shape: 'round', x: 12, y: 7, w: 10, h: 10, paint: 'trim' },
    { id: 'eye', shape: 'block', x: 15, y: 6, w: 2, h: 2, paint: 'ink' },
  ],
  poses: POSES.map((id) => ({
    id,
    moves: id === 'jump' ? [{ part: 'head', dy: -1 }] : [],
  })),
  variants: [{ id: 'two', paints: [{ id: 'body', color: '#afd472' }] }],
})

/** A keeper with two poses. */
export const keeperFigure = (): Written => ({
  format: 1 as const,
  id: 'keeper',
  tile: 16,
  frame: { w: 24, h: 24 },
  paints: [{ id: 'body', color: '#afd472' }],
  parts: [{ id: 'body', shape: 'block', x: 12, y: 14, w: 10, h: 16, paint: 'body' }],
  poses: [
    { id: 'idle', moves: [] },
    { id: 'talk', moves: [{ part: 'body', dy: -1 }] },
  ],
})

/** A backdrop with a flat sky band, mountains and hills, and a tree on the hills. */
export const valleyBackdrop = (): Written => ({
  format: 1 as const,
  id: 'valley',
  seed: 7,
  tile: 8,
  width: 32,
  layers: [
    { id: 'haze', kind: 'flat', color: '#fdd4bd', height: 3, drift: 0 },
    { id: 'far', kind: 'mountains', color: '#afd472', height: 6, drift: 0.3 },
    { id: 'near', kind: 'hills', color: '#f37f94', height: 2.5, drift: 0.7 },
  ],
  props: [{ id: 'tree-1', figure: 'keeper', pose: 'idle', layer: 'near', x: 4, up: 0 }],
})

/** The hero character as the fixture has it, with a figure and clips. */
export const heroCharacter = (): Written => ({
  format: 1 as const,
  id: 'hero',
  body: 'dynamic',
  size: { w: 0.8, h: 1 },
  color: '#e4572e',
  upright: true,
  figure: 'hero',
  clips: [
    { id: 'idle', poses: ['idle'], fps: 1, loop: true },
    { id: 'run', poses: ['run-1', 'run-2'], fps: 8, loop: true },
    { id: 'jump', poses: ['jump'], fps: 1, loop: false },
    { id: 'fall', poses: ['fall'], fps: 1, loop: false },
    { id: 'land', poses: ['land'], fps: 12, loop: false },
    { id: 'push', poses: ['push'], fps: 1, loop: true },
  ],
})

/** The keeper character with its figure and the clips `idle` and `talk`. */
export const keeperWithClips = (): Written => ({
  format: 1 as const,
  id: 'keeper',
  body: 'fixed',
  size: { w: 0.8, h: 1 },
  color: '#7a9e3b',
  upright: false,
  figure: 'keeper',
  clips: [
    { id: 'idle', poses: ['idle'], fps: 1, loop: true },
    { id: 'talk', poses: ['idle', 'talk'], fps: 6, loop: true },
  ],
})

export const HERO_FIGURE_PATH = 'content/figures/hero.json'
export const KEEPER_FIGURE_PATH = 'content/figures/keeper.json'
export const BACKDROP_PATH = 'content/backdrops/valley.json'

/** The two figures as listed files. */
export const figureFiles = (): GameFile[] => [
  { type: 'figure', path: HERO_FIGURE_PATH, text: writeContent('figure', heroFigure() as never) },
  { type: 'figure', path: KEEPER_FIGURE_PATH, text: writeContent('figure', keeperFigure() as never) },
]

/**
 * The fixture game with a keeper standing in level 1, the hero and the keeper wearing figures, and the two figures
 * listed. `extra` lists more files and `replace` has the last word on any path.
 */
export function artGame(
  extra: readonly GameFile[] = [],
  replace: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return storyGame([...figureFiles(), ...extra], {
    [KEEPER_PATH]: writeContent('character', keeperWithClips() as never),
    'content/characters/hero.json': writeContent('character', heroCharacter() as never),
    ...replace,
  })
}
