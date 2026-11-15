// The fixture game with a hero the framework moves: its character file has `moves`, its tuning file lists the eighteen
// numbers and the controls, and the level has no crate in the way. Built in memory, as `writeContent` writes each file.
import { DEFAULT_HERO_CONTROLS, MOVE_NUMBERS, writeContent } from '#src/features/content/content.ts'
import { heroFigure } from '../content/art.ts'
import { type GameFile, gameFiles } from '../content/kind.ts'
import { fixtureFiles } from './read.ts'

/** The clips of the example hero, and one for each of the air jump, the wall and the dash, each with a pose of its own. */
const FIGURE_CLIPS = [
  { id: 'idle', poses: ['idle'], fps: 1, loop: true },
  { id: 'run', poses: ['run-1', 'run-2'], fps: 8, loop: true },
  { id: 'jump', poses: ['jump'], fps: 1, loop: false },
  { id: 'fall', poses: ['fall'], fps: 1, loop: false },
  { id: 'land', poses: ['land'], fps: 12, loop: false },
  { id: 'air-jump', poses: ['push'], fps: 1, loop: false },
  { id: 'wall', poses: ['land'], fps: 1, loop: false },
  { id: 'dash', poses: ['run-2'], fps: 1, loop: false },
]

export interface Setup {
  /** Values for the tuning file's numbers, by id; the rest are the framework's. */
  readonly numbers?: Readonly<Record<string, number>>
  readonly doubleJump?: boolean
  readonly wallJump?: boolean
  readonly dash?: boolean
  /** Gives the hero the example figure and its clips, with the three a hero the framework moves can play. */
  readonly figure?: boolean
  /** Makes it a game for this many players, with a start point for each, a metre or two apart on the floor. */
  readonly players?: number
}

/** The fixture game with a hero that has `moves`, a tuning file for it, and no crate in the way. */
export function movesFiles(setup: Setup = {}): Record<string, string | undefined> {
  const players = setup.players ?? 1
  const tuning = {
    format: 1,
    id: 'hero-moves',
    numbers: MOVE_NUMBERS.map((n) => ({
      id: n.id,
      about: n.about,
      value: setup.numbers?.[n.id] ?? n.value,
      min: n.min,
      max: n.max,
      step: n.step,
    })),
    controls: DEFAULT_HERO_CONTROLS,
  }
  const hero = {
    format: 1,
    id: 'hero',
    body: 'dynamic',
    size: { w: 0.8, h: 1 },
    color: '#e4572e',
    upright: true,
    moves: {
      tuning: 'hero-moves',
      'double-jump': setup.doubleJump ?? false,
      'wall-jump': setup.wallJump ?? false,
      dash: setup.dash ?? false,
    },
    ...(setup.figure ? { figure: 'hero', clips: FIGURE_CLIPS } : {}),
  }
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>
  const starts = Array.from({ length: players }, (_, i) => ({ player: i + 1, x: 2.5 + i * 3, y: 7.5 }))
  const listed: GameFile[] = [
    {
      type: 'tuning',
      path: 'content/tunings/hero-moves.json',
      text: writeContent('tuning', tuning as never),
    },
  ]
  if (setup.figure)
    listed.push({
      type: 'figure',
      path: 'content/figures/hero.json',
      text: writeContent('figure', heroFigure() as never),
    })
  const files = gameFiles(fixtureFiles, listed, {
    'content/characters/hero.json': writeContent('character', hero as never),
    'content/levels/level-1.json': writeContent('level', { ...level, things: [], starts } as never),
  })
  if (players > 1)
    files['automata.toml'] = (files['automata.toml'] ?? '').replace(
      'hero = "hero"\n',
      `hero = "hero"\nplayers = ${players}\n`,
    )
  return files
}
