// `automata world`: a game's levels, the doors between them and the joins where they touch on the map, as words or as
// JSON. The layout is the framework's (`layoutWorld`, the loader's own), so a person at the command line, an agent,
// `check` and an editor all say the same joins. It reads and prints; it never writes a file.
import { Effect } from 'effect'
import {
  type Door,
  doorsOf,
  formatDiagnostic,
  type GameContent,
  type Join,
  type LevelPoint,
  type PlaceLevel,
  type WorldLayout,
} from '../content/content.ts'
import { type GameFolder, readGame } from './game-folder.ts'
import type { CliError, Ports } from './ports.ts'

/** A place is "big" past this many levels or tiles: a note, never a failure (plan W, call 9). */
const BIG_LEVELS = 8
const BIG_TILES = 16_384

/** 1296 as `1,296`: written out, so it reads the same on every machine. */
const commas = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** What `automata world` found. */
export interface WorldReport {
  readonly ok: boolean
  /** Every level of the game: the ones in `levels` of `automata.toml` first, in that order, then the rest by name. */
  readonly levels: readonly {
    readonly level: string
    /** Where its top left corner is on the map, or `null` when the world file does not place it. */
    readonly at: LevelPoint | null
    readonly size: { readonly w: number; readonly h: number }
    readonly start: boolean
    /** Its place in the project's `levels` list, or `null` when it is not listed. */
    readonly order: number | null
  }[]
  readonly doors: readonly Door[]
  readonly joins: readonly Join[]
  /** Every place, those of one level too: each a list of level names, places in the order of their first level. */
  readonly places: readonly (readonly string[])[]
  readonly notes: readonly string[]
  /** Set when the game does not load: why nothing is listed. */
  readonly sentence?: string
}

/** What the game's framework can say about the map. Absent in a framework too old to have a world file. */
type Layouter = GameFolder['content']

/** The layout of the world file against the game's levels, or `undefined` when the game has none (or cannot place). */
export function layoutOf(content: GameContent, api: Layouter): WorldLayout | undefined {
  const [world] = Object.values(content.worlds ?? {})
  if (world === undefined || typeof api.layoutWorld !== 'function' || typeof api.openTile !== 'function')
    return undefined
  return api.layoutWorld(world, content.levels, api.openTile(content.tilesets))
}

/** "a", "a and b", "a, b and c". */
const andList = (words: readonly string[]): string =>
  words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`

/** `row 5`, `rows 5 to 7`, `column 3`. */
function span(unit: 'row' | 'column', from: number, to: number): string {
  return from === to ? `${unit} ${from}` : `${unit}s ${from} to ${to}`
}

const sizeOf = (content: GameContent, level: string): { w: number; h: number } => {
  const tiles = content.levels[level]?.tiles ?? []
  return { w: tiles[0]?.length ?? 0, h: tiles.length }
}

/** Every place of the game: the joined ones from the layout, and every other level alone, by their first level. */
function placesOf(content: GameContent, layout: WorldLayout | undefined): readonly (readonly string[])[] {
  const joined: readonly (readonly PlaceLevel[])[] = Object.values(layout?.places ?? {})
  const inPlace = new Set(joined.flatMap((place) => place.map((member) => member.level)))
  const places = [
    ...joined.map((place) => place.map((member) => member.level)),
    ...Object.keys(content.levels)
      .filter((level) => !inPlace.has(level))
      .map((level) => [level]),
  ]
  return places.sort((p, q) => ((p[0] ?? '') < (q[0] ?? '') ? -1 : (p[0] ?? '') > (q[0] ?? '') ? 1 : 0))
}

/**
 * What is worth saying and needs no fix: a level nothing leads to, and a place too big to run at once. `check`'s files
 * step prints the same notes.
 */
export function worldNotes(
  content: GameContent,
  places: readonly (readonly string[])[],
  doors: readonly Door[],
  joins: readonly Join[],
): string[] {
  const notes: string[] = []
  const reached = new Set<string>([
    content.project.start,
    ...(content.project.levels ?? []),
    ...doors.map((door) => door.to.level),
    ...joins.flatMap((join) => [join.a, join.b]),
  ])
  for (const level of Object.keys(content.levels).sort())
    if (!reached.has(level)) notes.push(`Nothing leads to ${level} yet.`)
  for (const place of places) {
    const tiles = place.reduce((sum, level) => sum + sizeOf(content, level).w * sizeOf(content, level).h, 0)
    if (place.length > BIG_LEVELS || tiles > BIG_TILES)
      notes.push(
        `The place of ${place[0]} has ${place.length} ${place.length === 1 ? 'level' : 'levels'} (${commas(tiles)} tiles). The whole place runs at once, so keep a place to ${BIG_LEVELS} levels and ${commas(BIG_TILES)} tiles at most.`,
      )
  }
  return notes
}

/** Everything the report says, worked out from a game that loaded. */
export function worldFacts(content: GameContent, api: Layouter): Omit<WorldReport, 'ok' | 'sentence'> {
  const layout = layoutOf(content, api)
  const [world] = Object.values(content.worlds ?? {})
  const order = content.project.levels
  const rank = (level: string): number => order?.indexOf(level) ?? -1
  const names = Object.keys(content.levels).sort((p, q) => {
    const [a, b] = [rank(p), rank(q)]
    return a >= 0 && b >= 0 ? a - b : a >= 0 ? -1 : b >= 0 ? 1 : p < q ? -1 : p > q ? 1 : 0
  })
  const levels = names.map((level) => ({
    level,
    at: world?.levels.find((entry) => entry.level === level)?.at ?? null,
    size: sizeOf(content, level),
    start: content.project.start === level,
    order: rank(level) >= 0 ? rank(level) : null,
  }))
  const doors = doorsOf(content)
  const joins = layout?.joins ?? []
  const places = placesOf(content, layout)
  return { levels, doors, joins, places, notes: worldNotes(content, places, doors, joins) }
}

const NOT_LOADED = 'The game does not load, so its world cannot be listed.'

/** `automata world [folder]`: the levels, the doors and the joins of the game in `folder`. */
export function runWorld(options: { readonly folder: string }): Effect.Effect<WorldReport, CliError, Ports> {
  return Effect.gen(function* () {
    const game = yield* readGame(options.folder)
    if (!game.loaded.ok) {
      const [first, ...more] = game.loaded.diagnostics
      const why = first === undefined ? '' : ` ${formatDiagnostic(first)}`
      const rest = more.length === 0 ? '' : ` (${more.length} more: run automata check)`
      return {
        ok: false,
        levels: [],
        doors: [],
        joins: [],
        places: [],
        notes: [],
        sentence: `${NOT_LOADED}${why}${rest}`,
      }
    }
    return { ok: true, ...worldFacts(game.loaded.value, game.content) }
  })
}

/** Where a join's stretch is, in one level's own rows or columns. */
function stretch(join: Join, at: LevelPoint): string {
  const [unit, offset] = join.along === 'y' ? (['row', at.y] as const) : (['column', at.x] as const)
  return span(unit, join.from - offset, join.to - 1 - offset)
}

/** The joins as a person reads them: the two levels, the side of the first they touch along, and where. */
function joinLine(join: Join, report: WorldReport): string {
  const at = (level: string): LevelPoint => report.levels.find((l) => l.level === level)?.at ?? { x: 0, y: 0 }
  const side = join.along === 'y' ? 'right' : 'bottom'
  const here = stretch(join, at(join.a))
  const there = stretch(join, at(join.b))
  return `${join.a} and ${join.b} touch: ${join.a}'s ${side} edge, ${here}${here === there ? '' : ` (${there} of ${join.b})`}`
}

/** What a person reads: a line for each level, each door, each join and each place of more than one level; then notes. */
export function describeWorld(report: WorldReport): { out: string[]; err: string[] } {
  if (report.sentence !== undefined) return { out: [], err: [report.sentence] }
  const out: string[] = []
  for (const l of report.levels)
    out.push(
      `${l.level}  ${l.size.w} by ${l.size.h}${l.at === null ? '' : `  at ${l.at.x}, ${l.at.y}`}${l.start ? '  start' : ''}`,
    )
  for (const door of report.doors)
    out.push(
      `${door.from.level} ${door.from.thing} leads to ${door.to.level}${door.to.thing === undefined ? '' : ` ${door.to.thing}`}`,
    )
  for (const join of report.joins) out.push(joinLine(join, report))
  for (const place of report.places) if (place.length > 1) out.push(`${andList(place)} are one place.`)
  return { out: [...out, ...report.notes], err: [] }
}
