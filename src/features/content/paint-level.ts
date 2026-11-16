// The pictures of a level and of the world, for an agent that cannot open an editor: a level as it plays, the same level
// with what its things hold drawn on it, and the world map. A badge with a number marks each thing a person would
// otherwise have to read a file to find, and the legend that comes with the picture says what each number is, in words.
// Only whole-number work (see `paint-marks.ts`), so a picture is the same bytes in Node and in every browser.
//
// The art is flat on purpose: Node cannot yet read a tileset's picture, so a solid tile is a square of the ground's colour,
// and a thing is its figure's first pose (or a coloured box) squeezed into its box by nearest pixel.
import type { IndexedPicture } from '../../lib/png.ts'
import { doorsOf } from './doors.ts'
import type { Level, LevelPoint, LevelThing } from './level.ts'
import type { GameContent } from './load.ts'
import { paintFigure } from './paint-figure.ts'
import { type Box, badge, badgeSize, fill, line, ring } from './paint-marks.ts'
import { createPicture, type Picture, rgb } from './pixels.ts'
import { layoutWorld, openTile } from './places.ts'
import { figureSheet, MAX_PICTURE_SIDE } from './sheet.ts'
import { shownOf, type ValueDeclaration, type ValueShown, withDefaults } from './values.ts'

/** What a badge's number means: the thing, the value it is about and what that value says. */
export interface LegendLine {
  readonly n: number
  readonly level: string
  /** The thing the badge is about; empty for a level of the world's sheet. */
  readonly thing: string
  /** The id of the value the character declares (`opens`), or `level` or `door` on the world's sheet. */
  readonly value: string
  readonly shown: ValueShown
  /** The value in words: a number, yes or no, an option's name, a word, the id of a thing, or `to room-2, beside door-in`. */
  readonly says: string
}

/** A picture and the legend that says what its numbers are. */
export interface Painted {
  readonly picture: IndexedPicture
  readonly legend: readonly LegendLine[]
}

// The framework's own light blue and slate, the same two a level without colours is drawn in (`level/components.ts`; a
// test holds the two together, since `content` is below `level`).
const SKY = 0x9fd3f0
const GROUND = 0x3b4a5a
/** The dark edge round a box and the ink of a badge. */
const INK = 0x1b1b24
const PAPER = 0xfff1a8
/** The solid tiles of a picture that shows what things hold: one flat tint, so nothing competes with the marks. */
const TINT = 0x8d99a6
const ARROW = 0xd62828
const PATH = 0x7b2cbf
const REACH = 0xf77f00
const BACKGROUND = 0x23272e
const FRAME = 0xf1f3f5
const BAR = 0xffd166

/** A level wider or taller than this many tiles is drawn at half the size, so no picture is wider than 2,048 pixels. */
const BIG_SIDE = 128
/** The room round the world's sheet, so a badge on its edge is whole. */
const MARGIN = 8

/** `yes` and `no` in each of the six languages, for the legend of a game written in it. */
const YES_NO: Readonly<Record<string, readonly [string, string]>> = {
  zh: ['是', '否'],
  es: ['sí', 'no'],
  en: ['yes', 'no'],
  pt: ['sim', 'não'],
  ja: ['はい', 'いいえ'],
  ko: ['예', '아니요'],
}

/** Where to draw: the picture, and what turns a colour into its place in the palette. */
interface Surface {
  readonly picture: Picture
  readonly put: (colour: number) => number
}

/**
 * The palette of a picture: every colour in the order it is first used, 255 at most (place 0 is clear). Past that a
 * colour takes the nearest earlier one, by whole-number distance on red, green and blue, the first on a tie.
 */
export function makePalette(): { readonly colours: number[]; readonly place: (colour: number) => number } {
  const colours: number[] = [0]
  const placed = new Map<number, number>()
  const place = (colour: number): number => {
    const known = placed.get(colour)
    if (known !== undefined) return known
    let at = colours.length
    if (at < 256) colours.push(colour)
    else {
      let best = Number.POSITIVE_INFINITY
      for (let i = 1; i < colours.length; i++) {
        const other = colours[i] as number
        const [dr, dg, db] = [
          (colour >> 16) - (other >> 16),
          ((colour >> 8) & 255) - ((other >> 8) & 255),
          (colour & 255) - (other & 255),
        ]
        const far = dr * dr + dg * dg + db * db
        if (far < best) {
          best = far
          at = i
        }
      }
    }
    placed.set(colour, at)
    return at
  }
  return { colours, place }
}

/**
 * Draws a picture twice: the first time only to learn which colours it uses and in what order (a PNG's palette comes
 * before its pixels), the second into a picture that has them.
 */
function paintTwice(
  width: number,
  height: number,
  draw: (surface: Surface) => readonly LegendLine[],
): Painted {
  const palette = makePalette()
  draw({ picture: createPicture(width, height, []), put: palette.place })
  const picture = createPicture(width, height, palette.colours)
  const legend = draw({ picture, put: palette.place })
  return { picture: picture.done(), legend }
}

const everything = (picture: Picture): Box => ({ x: 0, y: 0, w: picture.width, h: picture.height })

/** The edge of a box, one pixel wide: the frame of a level on the world's sheet. */
function outline(picture: Picture, box: Box, colour: number): void {
  fill(picture, { ...box, h: 1 }, colour)
  fill(picture, { ...box, y: box.y + box.h - 1, h: 1 }, colour)
  fill(picture, { ...box, w: 1 }, colour)
  fill(picture, { ...box, x: box.x + box.w - 1, w: 1 }, colour)
}

/** Every solid tile of a level as a square of `colour`; `at` says where a tile's top left corner is, in pixels. */
function drawGround(
  surface: Surface,
  content: GameContent,
  level: Level,
  at: (column: number, row: number) => { x: number; y: number },
  colour: number,
): void {
  const open = openTile(content.tilesets)
  const paint = surface.put(colour)
  level.tiles.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (open(level, c, r)) continue
      const from = at(c, r)
      const to = at(c + 1, r + 1)
      fill(
        surface.picture,
        { x: from.x, y: from.y, w: Math.max(1, to.x - from.x), h: Math.max(1, to.y - from.y) },
        paint,
      )
    }
  })
}

/** One character as it is drawn: its figure's first pose, painted once. */
interface Look {
  readonly art: IndexedPicture
  readonly frame: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
}

/** The figures of a game, painted the first time one is asked for. */
function looks(content: GameContent): (figure: string | undefined) => Look | undefined {
  const known = new Map<string, Look | undefined>()
  return (id) => {
    if (id === undefined) return undefined
    if (!known.has(id)) {
      const figure = content.figures?.[id]
      const frame = figure === undefined ? undefined : figureSheet(figure).frames[0]
      known.set(
        id,
        figure === undefined || frame === undefined ? undefined : { art: paintFigure(figure), frame },
      )
    }
    return known.get(id)
  }
}

/**
 * Draws one character with its middle at `cx`, `cy` (pixels): its figure's first pose squeezed into its box, a pixel of
 * the box taking the pixel of the pose it falls on, or a box of its colour with a dark edge.
 */
function drawCharacter(
  surface: Surface,
  look: (figure: string | undefined) => Look | undefined,
  character: {
    readonly size: { readonly w: number; readonly h: number }
    readonly color: string
    readonly figure?: string | undefined
  },
  cx: number,
  cy: number,
  s: number,
): void {
  const w = Math.max(1, Math.round(character.size.w * s))
  const h = Math.max(1, Math.round(character.size.h * s))
  const left = cx - Math.floor(w / 2)
  const top = cy - Math.floor(h / 2)
  const shape = look(character.figure)
  if (shape === undefined) {
    fill(surface.picture, { x: left, y: top, w, h }, surface.put(INK))
    fill(
      surface.picture,
      { x: left + 1, y: top + 1, w: Math.max(0, w - 2), h: Math.max(0, h - 2) },
      surface.put(rgb(character.color)),
    )
    return
  }
  const { art, frame } = shape
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const place = art.pixels[
        (frame.y + Math.floor((y * frame.h) / h)) * art.width + frame.x + Math.floor((x * frame.w) / w)
      ] as number
      if (place !== 0) surface.picture.set(left + x, top + y, surface.put(art.palette[place] as number))
    }
  }
}

/** The tile size of a picture of a level: 16 pixels, or 8 for a level with a side over 128 tiles. */
const sizeOf = (level: Level): number =>
  Math.max(level.tiles.length, level.tiles[0]?.length ?? 0) > BIG_SIDE ? 8 : 16

/** A badge is twice as big in a picture where a tile is 8 pixels or more, so its number can be read. */
const badgeScale = (s: number): number => (s >= 8 ? 2 : 1)

/** A number a badge wants to sit on: the middle of the badge, in pixels. */
interface Wanted {
  readonly x: number
  readonly y: number
  readonly n: number
}

/** True when two boxes share a pixel. */
const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Draws the badges over the marks. One that would cover an earlier one moves down by its own height until it is clear. */
function drawBadges(surface: Surface, wanted: readonly Wanted[], scale: number): void {
  const { picture, put } = surface
  const taken: Box[] = []
  for (const want of wanted) {
    const size = badgeSize(want.n, scale)
    const x = Math.max(0, Math.min(want.x - Math.floor(size.w / 2), picture.width - size.w))
    let y = Math.max(0, Math.min(want.y - Math.floor(size.h / 2), picture.height - size.h))
    const room = Math.max(0, picture.height - size.h)
    for (let tries = 0; tries < 64 && taken.some((box) => overlaps(box, { x, y, ...size })); tries++)
      y = Math.min(y + size.h, room)
    taken.push({ x, y, ...size })
    badge(picture, x, y, want.n, put(INK), put(PAPER), scale)
  }
}

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : [])
const isPoint = (value: unknown): value is LevelPoint =>
  typeof value === 'object' && value !== null && 'x' in value && 'y' in value

/** `to room-2, beside door-in`: where a door leads, in a legend. */
const leadsTo = (to: { readonly level: string; readonly thing?: string | undefined }): string =>
  `to ${to.level}${to.thing === undefined ? '' : `, beside ${to.thing}`}`

/** What a value shown as a tag says, or `undefined` when there is no tag to draw (a switch left at its default). */
function tagSays(content: GameContent, declaration: ValueDeclaration, held: unknown): string | undefined {
  const source = content.project.source
  switch (declaration.type) {
    case 'number':
      return typeof held === 'number' ? String(held) : undefined
    case 'switch': {
      if (typeof held !== 'boolean' || held === declaration.default) return undefined
      const [yes, no] = (source === undefined ? undefined : YES_NO[source]) ?? ['yes', 'no']
      return held ? yes : no
    }
    case 'choice':
      return typeof held === 'string'
        ? (declaration.from.find((option) => option.id === held)?.name ?? held)
        : undefined
    case 'words':
      return typeof held === 'string'
        ? ((source === undefined ? undefined : content.messages?.[source]?.messages[held]) ?? held)
        : undefined
    case 'leads-to':
      return typeof held === 'object' && held !== null && 'level' in held
        ? leadsTo(held as { level: string; thing?: string })
        : undefined
    default:
      return undefined
  }
}

/**
 * Everything a level's things hold, drawn on top: an arrow to each linked thing, a line and dots for a path, a ring for a
 * reach, a badge for a tag. The legend says each badge.
 */
function drawWhatItIs(
  surface: Surface,
  content: GameContent,
  level: Level,
  s: number,
): readonly LegendLine[] {
  const { picture, put } = surface
  const legend: LegendLine[] = []
  const wanted: Wanted[] = []
  const middle = (thing: LevelThing): { x: number; y: number } => ({
    x: Math.round(thing.x * s),
    y: Math.round(thing.y * s),
  })
  for (const thing of level.things) {
    const character = content.characters[thing.character]
    if (character === undefined) continue
    const values = withDefaults(character, thing)
    const here = middle(thing)
    const corner = {
      x: Math.round((thing.x + character.size.w / 2) * s),
      y: Math.round((thing.y - character.size.h / 2) * s),
    }
    const say = (
      declaration: ValueDeclaration,
      shown: ValueShown,
      says: string,
      where: { x: number; y: number },
    ): void => {
      const n = legend.length + 1
      legend.push({ n, level: level.id, thing: thing.id, value: declaration.id, shown, says })
      wanted.push({ ...where, n })
    }
    for (const declaration of character.values ?? []) {
      const shown = shownOf(declaration)
      const held: unknown = values[declaration.id]
      if (shown === 'none' || held === undefined) continue
      if (shown === 'reach' && typeof held === 'number') {
        ring(picture, here.x, here.y, held * s, put(REACH))
        say(declaration, shown, String(held), corner)
      } else if (shown === 'arrow') {
        for (const id of typeof held === 'string' ? [held] : list(held)) {
          if (typeof id !== 'string') continue
          const target = level.things.find((other) => other.id === id)
          if (target === undefined) continue
          const end = middle(target)
          line(picture, here.x, here.y, end.x, end.y, put(ARROW))
          say(declaration, shown, id, end)
        }
      } else if (shown === 'path') {
        const points = list(held)
          .filter(isPoint)
          .map((point) => ({ x: Math.round(point.x * s), y: Math.round(point.y * s) }))
        if (points.length === 0) continue
        points.forEach((point, i) => {
          const next =
            points[i + 1] ??
            (declaration.type === 'path' && declaration.loop === true && i > 0 ? points[0] : undefined)
          if (next !== undefined) line(picture, point.x, point.y, next.x, next.y, put(PATH))
          fill(picture, { x: point.x - 1, y: point.y - 1, w: 3, h: 3 }, put(PATH))
        })
        const says = list(held)
          .filter(isPoint)
          .map((point) => `${point.x}, ${point.y}`)
          .join(' then ')
        say(
          declaration,
          shown,
          `a path of ${points.length} ${points.length === 1 ? 'point' : 'points'}: ${says}`,
          corner,
        )
      } else if (shown === 'tag') {
        const says = tagSays(content, declaration, held)
        if (says !== undefined) say(declaration, shown, says, corner)
      }
    }
  }
  drawBadges(surface, wanted, badgeScale(s))
  return legend
}

/** One level, drawn: its sky, its solid tiles, its things and each hero's start, and with `what` the marks on top. */
function drawLevel(
  surface: Surface,
  content: GameContent,
  level: Level,
  what: boolean,
): readonly LegendLine[] {
  const s = sizeOf(level)
  const { picture, put } = surface
  fill(picture, everything(picture), put(level.sky === undefined ? SKY : rgb(level.sky)))
  const ground = what ? TINT : level.ground === undefined ? GROUND : rgb(level.ground)
  drawGround(surface, content, level, (column, row) => ({ x: column * s, y: row * s }), ground)
  const look = looks(content)
  for (const thing of level.things) {
    const character = content.characters[thing.character]
    if (character !== undefined)
      drawCharacter(surface, look, character, Math.round(thing.x * s), Math.round(thing.y * s), s)
  }
  const hero = content.characters[content.project.hero]
  if (hero !== undefined)
    for (const start of level.starts)
      drawCharacter(surface, look, hero, Math.round(start.x * s), Math.round(start.y * s), s)
  return what ? drawWhatItIs(surface, content, level, s) : []
}

/**
 * The picture of a level, 16 pixels a tile (8 for a level with a side over 128 tiles): as it plays, or with `whatItIs`
 * the solid ground in one flat tint and what each thing holds drawn on top, with a legend that says each badge.
 */
export function paintLevel(
  content: GameContent,
  level: string,
  options: { readonly whatItIs?: boolean } = {},
): Painted {
  const found = Object.hasOwn(content.levels, level) ? content.levels[level] : undefined
  if (found === undefined) throw new Error(`There is no level called "${level}".`)
  const s = sizeOf(found)
  return paintTwice((found.tiles[0]?.length ?? 0) * s, found.tiles.length * s, (surface) =>
    drawLevel(surface, content, found, options.whatItIs === true),
  )
}

/** A level the world file puts on the map, with its size. */
interface Placed {
  readonly id: string
  readonly level: Level
  readonly at: LevelPoint
  readonly w: number
  readonly h: number
}

/** The sheet of the world: each level small where it sits, a bar across each join and an arrow from each door. */
function drawWorld(
  surface: Surface,
  content: GameContent,
  placed: readonly Placed[],
  corner: LevelPoint,
  s: number,
): readonly LegendLine[] {
  const { picture, put } = surface
  fill(picture, everything(picture), put(BACKGROUND))
  /** A place in a level, in tiles from its corner, as a pixel of the sheet. */
  const at = (p: Placed, x: number, y: number): { x: number; y: number } => ({
    x: MARGIN + Math.round((p.at.x - corner.x + x) * s),
    y: MARGIN + Math.round((p.at.y - corner.y + y) * s),
  })
  for (const p of placed) {
    const from = at(p, 0, 0)
    const to = at(p, p.w, p.h)
    const box = { x: from.x, y: from.y, w: Math.max(1, to.x - from.x), h: Math.max(1, to.y - from.y) }
    fill(picture, box, put(p.level.sky === undefined ? SKY : rgb(p.level.sky)))
    drawGround(
      surface,
      content,
      p.level,
      (column, row) => at(p, column, row),
      p.level.ground === undefined ? GROUND : rgb(p.level.ground),
    )
    outline(picture, box, put(FRAME))
  }
  const [world] = Object.values(content.worlds ?? {})
  const find = (id: string): Placed | undefined => placed.find((p) => p.id === id)
  const thick = Math.max(2, s)
  for (const join of world === undefined
    ? []
    : layoutWorld(world, content.levels, openTile(content.tilesets)).joins) {
    const b = find(join.b)
    if (b === undefined) continue
    const from = at(b, 0, 0)
    const spanFrom =
      MARGIN + Math.round((join.along === 'y' ? join.from - corner.y : join.from - corner.x) * s)
    const spanTo = MARGIN + Math.round((join.along === 'y' ? join.to - corner.y : join.to - corner.x) * s)
    fill(
      picture,
      join.along === 'y'
        ? { x: from.x - Math.floor(thick / 2), y: spanFrom, w: thick, h: spanTo - spanFrom }
        : { x: spanFrom, y: from.y - Math.floor(thick / 2), w: spanTo - spanFrom, h: thick },
      put(BAR),
    )
  }

  const legend: LegendLine[] = []
  const wanted: Wanted[] = []
  const size = badgeSize(placed.length, badgeScale(s))
  // Every level is numbered at its top left corner, since a picture with no words must still say which box is which.
  for (const p of placed) {
    const n = legend.length + 1
    const from = at(p, 0, 0)
    legend.push({ n, level: p.id, thing: '', value: 'level', shown: 'tag', says: `at ${p.at.x}, ${p.at.y}` })
    wanted.push({ x: from.x + 2 + Math.floor(size.w / 2), y: from.y + 2 + Math.floor(size.h / 2), n })
  }
  for (const door of doorsOf(content)) {
    const start = find(door.from.level)
    const end = find(door.to.level)
    const here = start?.level.things.find((thing) => thing.id === door.from.thing)
    if (start === undefined || end === undefined || here === undefined) continue
    const beside =
      door.to.thing === undefined ? undefined : end.level.things.find((thing) => thing.id === door.to.thing)
    const a = at(start, here.x, here.y)
    const b = beside === undefined ? at(end, end.w / 2, end.h / 2) : at(end, beside.x, beside.y)
    line(picture, a.x, a.y, b.x, b.y, put(ARROW))
    const n = legend.length + 1
    legend.push({
      n,
      level: door.from.level,
      thing: door.from.thing,
      value: 'door',
      shown: 'arrow',
      says: leadsTo(door.to),
    })
    wanted.push({ ...a, n }, { ...b, n })
  }
  drawBadges(surface, wanted, badgeScale(s))
  return legend
}

/**
 * The world file's sheet: each level small at its `at`, an arrow from each door to where it leads with a numbered
 * badge at each end, and a bar across each join. Every level is numbered too. The largest of 8, 4, 2 and 1 pixels a
 * tile that keeps both sides at 2,048 or under is used; `undefined` when the game has no world file, it places no level
 * that exists, or even one pixel a tile does not fit.
 */
export function paintWorld(content: GameContent): Painted | undefined {
  const [world] = Object.values(content.worlds ?? {})
  if (world === undefined) return undefined
  const placed: Placed[] = world.levels.flatMap((entry) => {
    const level = Object.hasOwn(content.levels, entry.level) ? content.levels[entry.level] : undefined
    return level === undefined
      ? []
      : [{ id: entry.level, level, at: entry.at, w: level.tiles[0]?.length ?? 0, h: level.tiles.length }]
  })
  if (placed.length === 0) return undefined
  const corner = { x: Math.min(...placed.map((p) => p.at.x)), y: Math.min(...placed.map((p) => p.at.y)) }
  const across = Math.max(...placed.map((p) => p.at.x + p.w)) - corner.x
  const down = Math.max(...placed.map((p) => p.at.y + p.h)) - corner.y
  const s = [8, 4, 2, 1].find(
    (each) =>
      Math.ceil(across * each) + 2 * MARGIN <= MAX_PICTURE_SIDE &&
      Math.ceil(down * each) + 2 * MARGIN <= MAX_PICTURE_SIDE,
  )
  if (s === undefined) return undefined
  return paintTwice(Math.ceil(across * s) + 2 * MARGIN, Math.ceil(down * s) + 2 * MARGIN, (surface) =>
    drawWorld(surface, content, placed, corner, s),
  )
}
