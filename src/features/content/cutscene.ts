import { z } from 'zod'
import { Id } from './ids.ts'
import { englishLacks, englishMissing } from './messages.ts'
import { list, MessageKey, noSuch, ticks } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** How the camera gets from one key to the next. */
export type Ease = 'cut' | 'linear' | 'smooth'

/** Where the camera is at a tick, and how it gets there. `x` and `y` are the middle of the picture, in tiles. */
export interface CameraKey {
  readonly at: number
  readonly x: number
  readonly y: number
  readonly zoom: number
  readonly ease: Ease
}

/** Where an actor is at a tick: which thing, where, and which way it faces. */
export interface ActorKey {
  readonly at: number
  /** A thing's id in the level, or `player-1` to `player-4`. */
  readonly who: string
  readonly x: number
  readonly y: number
  readonly face?: 'left' | 'right' | undefined
}

/** A line said on screen between two ticks. */
export interface CutsceneLine {
  readonly at: number
  readonly until: number
  /** A message key. */
  readonly line: string
  readonly speaker?: string | undefined
}

/** A cutscene file once read: camera and actor keys on a timeline, staged in one level. */
export interface CutsceneFile {
  readonly format: 1
  readonly id: string
  readonly level: string
  /** How long it lasts, in ticks. */
  readonly length: number
  readonly camera: readonly CameraKey[]
  readonly actors: readonly ActorKey[]
  readonly lines: readonly CutsceneLine[]
}

const MAX_TICKS = 3600
const at = z.int().min(0).max(MAX_TICKS).describe('The tick it happens at. 60 ticks is one second.')
const tilesFromLeft = (what: string): z.ZodNumber =>
  z.number().describe(`${what}, in tiles from the left edge of the level.`)
const tilesFromTop = (what: string): z.ZodNumber =>
  z.number().describe(`${what}, in tiles from the top edge of the level.`)

const camera = z.strictObject({
  at,
  x: tilesFromLeft('The middle of the picture'),
  y: tilesFromTop('The middle of the picture'),
  zoom: z.number().min(0.25).max(4).describe('How close the camera is: 1 is the usual, 2 is twice as close.'),
  ease: z
    .enum(['cut', 'linear', 'smooth'])
    .describe('How it gets here: "cut" at once, "linear" steadily, "smooth" slowing at the ends.'),
})

const actor = z.strictObject({
  at,
  who: Id.describe("Which thing: its id in the level, or player-1 to player-4 for a player's hero."),
  x: tilesFromLeft('Where it stands'),
  y: tilesFromTop('Where it stands'),
  face: z.enum(['left', 'right']).optional().describe('Which way it faces. Left out means no change.'),
})

const line = z.strictObject({
  at,
  until: z.int().min(1).max(MAX_TICKS).describe('The tick it goes away.'),
  line: MessageKey.describe('What is said, as a message key, like "keeper.hello".'),
  speaker: Id.optional().describe('The character who says it, by id, like "keeper".'),
})

/** Keys must be in time order and inside the length; a line must end after it starts. */
function checkCutscene(file: Partial<CutsceneFile>, ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const end = file.length ?? MAX_TICKS
  const inOrder = (keys: readonly { at: number }[], name: string, who?: (i: number) => string): void => {
    const last = new Map<string, number>()
    keys.forEach((key, i) => {
      const owner = who?.(i) ?? ''
      const before = last.get(owner)
      if (before !== undefined && key.at < before)
        add(
          [name, i, 'at'],
          // Two actors' keys may interleave, so the key above is the same actor's, and the words say whose.
          `This key is at tick ${key.at}, before ${owner === '' ? 'the one above it' : `"${owner}"'s key above it`} (${before}). Keys go in time order.`,
        )
      else last.set(owner, key.at)
      if (key.at > end) add([name, i, 'at'], `This is after the cutscene ends, at tick ${end}.`)
    })
  }
  const keys = file.camera ?? []
  const actors = file.actors ?? []
  inOrder(keys, 'camera')
  inOrder(actors, 'actors', (i) => (actors[i] as ActorKey).who)
  ;(file.lines ?? []).forEach((l, i) => {
    if (l.at > end) add(['lines', i, 'at'], `This is after the cutscene ends, at tick ${end}.`)
    if (l.until <= l.at) add(['lines', i, 'until'], 'A line must end after it starts.')
    if (l.until > end) add(['lines', i, 'until'], `This is after the cutscene ends, at tick ${end}.`)
  })
}

/** What a cutscene may name in its level: the level's things, and a hero for each start. */
function actorsIn(level: {
  things: readonly { id: string }[]
  starts: readonly { player: number }[]
}): string[] {
  return [...level.things.map((t) => t.id), ...level.starts.map((s) => `player-${s.player}`)]
}

/** Everything a cutscene names must be in the game, and every place it names must be inside the level. */
function checkNames(file: CutsceneFile, game: Listed, report: Report): void {
  const level = game.get('level', file.level)
  if (!game.has('level', file.level)) report('level', noSuch('level', file.level, game.ids('level')))
  if (level !== undefined) {
    const width = level.tiles[0]?.length ?? 0
    const height = level.tiles.length
    const inside = (path: string, x: number, y: number): void => {
      if (x < 0 || x > width) report(`${path}.x`, `${x} is outside the level, which is ${width} tiles wide.`)
      if (y < 0 || y > height)
        report(`${path}.y`, `${y} is outside the level, which is ${height} tiles tall.`)
    }
    file.camera.forEach((k, i) => {
      inside(`camera[${i}]`, k.x, k.y)
    })
    const names = actorsIn(level)
    file.actors.forEach((a, i) => {
      if (!names.includes(a.who))
        report(
          `actors[${i}].who`,
          `There is nothing called "${a.who}" in the level "${level.id}". It has: ${list(names)}.`,
        )
      inside(`actors[${i}]`, a.x, a.y)
    })
  }
  file.lines.forEach((l, i) => {
    if (englishLacks(game, l.line)) report(`lines[${i}].line`, englishMissing(l.line))
    if (l.speaker !== undefined && !game.has('character', l.speaker))
      report(`lines[${i}].speaker`, noSuch('character', l.speaker, game.ids('character')))
  })
}

/** The rules for a cutscene file; unknown keys are refused. */
export const CutsceneSchema: z.ZodType<CutsceneFile, CutsceneFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this cutscene, like "level-1-intro". It matches the file name.'),
    level: Id.describe('The level it is staged in, by id, like "level-1".'),
    length: ticks('How long the cutscene lasts', MAX_TICKS),
    camera: z.array(camera).min(1).max(64).describe('Where the camera is, key by key, in time order.'),
    actors: z
      .array(actor)
      .max(256)
      .describe('Where each thing stands and what it does, key by key, in time order.'),
    lines: z.array(line).max(64).describe('What is said, and when.'),
  })
  .superRefine(checkCutscene)

/** The cutscene's row of the content table. */
export const cutsceneInfo: ContentTypeInfo<CutsceneFile, CutsceneFile> = {
  schema: CutsceneSchema,
  title: 'Cutscene',
  plural: 'cutscenes',
  editor: 'story',
  part: 'sequence',
  noun: 'cutscene',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the cutscene a name like "level-1-intro".',
    level: 'Write the id of the level it is staged in, like "level-1".',
    length: 'Write how many ticks it lasts, like 300. 60 ticks is one second.',
    camera: 'List at least one camera key, each with at, x, y, zoom and ease.',
    actors: 'Write [] if nobody moves.',
    lines: 'Write [] if nothing is said.',
    'camera.at': 'Write the tick it happens at, like 0.',
    'camera.x': 'Write the middle of the picture, in tiles from the left, like 8.',
    'camera.y': 'Write the middle of the picture, in tiles from the top, like 4.',
    'camera.zoom': 'Write how close the camera is, like 1.',
    'camera.ease': 'Write "cut", "linear" or "smooth".',
    'actors.at': 'Write the tick it happens at, like 0.',
    'actors.who': 'Write which thing it is, by its id in the level, like "keeper".',
    'actors.x': 'Write where it stands, in tiles from the left.',
    'actors.y': 'Write where it stands, in tiles from the top.',
    'lines.at': 'Write the tick it appears at, like 60.',
    'lines.until': 'Write the tick it goes away, like 180.',
    'lines.line': 'Write what is said, as a message key, like "keeper.hello".',
  },
  check: checkNames,
}
