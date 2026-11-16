// `automata picture`: paints a picture of each level (as it plays, or with what its things hold drawn on it) and of the
// world map, and says in words what each numbered badge is. For an agent that cannot open an editor: the painters are the
// framework's (`paintLevel`, `paintWorld`), so a person, an agent, CI and an editor draw the same bytes. The pictures go in
// `.automata/pictures/`, which a game's `.gitignore` leaves out: they are made to be looked at, not kept.
import { join } from 'node:path'
import { Effect } from 'effect'
import { encodePng } from '../../lib/png.ts'
import { formatDiagnostic, type LegendLine } from '../content/content.ts'
import { readGame } from './game-folder.ts'
import { CliError, Files, type Ports } from './ports.ts'

/** Where the pictures go, from the game's root. */
const PICTURES = '.automata/pictures'

/** One picture written: what it is of, where it is and what its numbers mean. */
export interface PictureFile {
  readonly kind: 'level' | 'what-it-is' | 'world'
  /** The level it is of, or `null` for the world's sheet. */
  readonly level: string | null
  /** From the game's root. */
  readonly path: string
  readonly legend: readonly LegendLine[]
}

/** What `automata picture` did. */
export interface PictureReport {
  readonly ok: boolean
  readonly pictures: readonly PictureFile[]
  /** Set when something could not be painted: why. */
  readonly sentence?: string
}

/** `.automata/pictures/room-1.png`, `room-1.what.png` or `world.png`. */
const pathOf = (kind: PictureFile['kind'], level: string | null): string =>
  `${PICTURES}/${kind === 'world' ? 'world' : kind === 'what-it-is' ? `${level}.what` : level}.png`

/**
 * Paints the pictures asked for and writes them. `levels` are the levels to paint, none meaning every level (or, with
 * `world`, only the map). A game that does not load has nothing painted and nothing written.
 */
export function runPicture(options: {
  readonly folder: string
  readonly levels: readonly string[]
  readonly whatItIs: boolean
  readonly world: boolean
}): Effect.Effect<PictureReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readGame(options.folder)
    const nothing = (sentence: string): PictureReport => ({ ok: false, pictures: [], sentence })
    if (!game.loaded.ok) {
      const [first, ...more] = game.loaded.diagnostics
      return nothing(
        `The game does not load, so nothing was painted. ${first === undefined ? '' : formatDiagnostic(first)}${more.length === 0 ? '' : ` (${more.length} more: run automata check)`}`.trim(),
      )
    }
    const content = game.loaded.value
    const api = game.content
    if (typeof api.paintLevel !== 'function' || typeof api.paintWorld !== 'function')
      return nothing(
        "This game's framework is older than automata and cannot draw a picture of a level. Update the framework, then run this again.",
      )

    const all = Object.keys(content.levels).sort()
    for (const level of options.levels)
      if (!Object.hasOwn(content.levels, level))
        return yield* Effect.fail(
          new CliError(`There is no level called "${level}". The levels are: ${all.join(', ')}.`),
        )
    const levels = options.levels.length > 0 ? options.levels : options.world ? [] : all

    const pictures: PictureFile[] = []
    const write = (
      kind: PictureFile['kind'],
      level: string | null,
      painted: ReturnType<typeof api.paintLevel>,
    ) =>
      Effect.gen(function* () {
        const path = pathOf(kind, level)
        yield* files.write(join(options.folder, path), encodePng(painted.picture))
        pictures.push({ kind, level, path, legend: painted.legend })
      })
    for (const level of levels) {
      const kind = options.whatItIs ? 'what-it-is' : 'level'
      yield* write(kind, level, api.paintLevel(content, level, { whatItIs: options.whatItIs }))
    }

    if (options.world) {
      const painted = api.paintWorld(content)
      if (painted !== undefined) yield* write('world', null, painted)
      else {
        const [world] = Object.values(content.worlds ?? {})
        const sentence =
          world === undefined
            ? 'This game has no world file, so there is no map to draw. Write one in content/worlds/ and list it in automata.toml.'
            : world.levels.some((entry) => Object.hasOwn(content.levels, entry.level))
              ? `The map is too big for one picture. Name the levels you want: automata picture ${all.slice(0, 2).join(' ')}.`
              : 'The world file places no level that the game has, so there is no map to draw.'
        return { ok: false, pictures, sentence }
      }
    }
    return { ok: true, pictures }
  })
}

/** One line of a legend: its number, what it is about, the value and what it says. */
const legendLine = (line: LegendLine): string =>
  `${line.n}  ${line.level}${line.thing === '' ? '' : ` ${line.thing}`}  ${line.value}  ${line.says}`

/** What a person reads: each picture's path, then its legend a line a badge; and the sentence, if one picture could not be. */
export function describePicture(report: PictureReport): { out: string[]; err: string[] } {
  const out = report.pictures.flatMap((picture) => [picture.path, ...picture.legend.map(legendLine)])
  return { out, err: report.sentence === undefined ? [] : [report.sentence] }
}
