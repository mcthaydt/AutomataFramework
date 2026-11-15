import { parse as parseToml } from 'smol-toml'
import { z } from '../../lib/zod.ts'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'
import type { Voice } from './diagnostics.ts'
import { Id } from './ids.ts'
import { LANGUAGES, type Language, languageCodes } from './messages.ts'
import { checkData, type Parsed, withoutMark } from './parse.ts'
import { isGamePath, MessageKey, WORDS_PATTERN } from './shared.ts'

/** The project file's name: it sits at the top of a game's repository and lists everything else. */
export const PROJECT_FILE = 'automata.toml'

/** One content file the project lists: what kind it is, and where it is, from the game's root. */
export interface ContentRef {
  readonly type: ContentType
  readonly path: string
}

/** The project file once read. */
export interface Project {
  readonly format: 1
  readonly name: string
  /** The level a new game opens. */
  readonly start: string
  /** The character each player controls. */
  readonly hero: string
  /**
   * The most people who can play at once on one screen, 2 to 4. Left out, the game is for one player (and the parsed
   * project has no `players` key at all, so a one-player game's content hash is what it always was).
   */
  readonly players?: number | undefined
  /**
   * The language the team writes the game's words in. Every other language is checked against it, and it stands in
   * for a word a language lacks. Required as soon as the game lists any messages file, and that language's file must
   * be listed; a game with no words leaves it out (and the parsed project has no `source` key at all).
   */
  readonly source?: Language | undefined
  /**
   * The order the levels are played in. Left out, the game is its `start` level alone. The flow's fields (this one,
   * `done`, `warnings` and `splash`) say what a screen shows and never what happens, so none of them is given to the
   * sim, and the parsed project has no such key at all when the file does not write it.
   */
  readonly levels?: readonly string[] | undefined
  /** The event that ends a level, like `door.touched`. Left out, a level ends only when the game's code says so. */
  readonly done?: string | undefined
  /** The event that loses a level, like `hero.fell`. Left out, a level cannot be lost. */
  readonly lost?: string | undefined
  /** The number the game counts: a resource and one of its fields, like `hero.score.sparks`. Left out, no score. */
  readonly score?: string | undefined
  /** What a player is told before they play: keys in the game's own words, like `warning.flashing`. */
  readonly warnings?: readonly string[] | undefined
  /** The figure shown on the splash, by its id. Left out, the splash is the game's name. */
  readonly splash?: string | undefined
  readonly content: readonly ContentRef[]
}

/** What to say for a path that does not stay inside the game. */
export const PATH_HINT = 'Use a path inside the game, like content/levels/level-1.json.'

/** Every kind in the table: `z.enum` wants a non-empty list, and the table always has rows. */
const KINDS = Object.keys(CONTENT_TYPES) as [ContentType, ...ContentType[]]

const PLAYERS_HINT =
  'Write how many can play at once, 2, 3 or 4, like players = 2. Leave the line out for a one-player game.'

const SOURCE_HINT = `Write one of ${languageCodes}, like source = "es".`

const DONE_HINT = 'Write the event that ends a level, like done = "door.touched".'

const LOST_HINT = 'Write the event that loses a level, like lost = "hero.fell".'

const SCORE_HINT = 'Write a resource and one of its numbers, like score = "hero.score.sparks".'

/** A resource and one of its fields, joined by a dot: at least one dot, in the words event names use. */
function isScoreName(text: unknown): boolean {
  return typeof text === 'string' && text.length <= 96 && WORDS_PATTERN.test(text) && text.includes('.')
}

const ref = z.strictObject({
  type: z.enum(KINDS),
  path: z.string().refine((path) => isGamePath(path, '.json'), PATH_HINT),
})

/** The rules for the project file; unknown keys are refused, and a file may be listed only once. */
export const ProjectSchema: z.ZodType<Project, Project> = z
  .strictObject({
    format: z.literal(1),
    name: z.string().min(1).max(80),
    start: Id,
    hero: Id,
    players: z
      .custom<number>((n) => typeof n === 'number' && Number.isInteger(n) && n >= 2 && n <= 4, PLAYERS_HINT)
      .optional(),
    source: z
      .custom<Language>((value) => LANGUAGES.some((language) => language === value), SOURCE_HINT)
      .optional(),
    levels: z.array(Id).min(1).max(64).optional(),
    done: z
      .custom<string>(
        (text) => typeof text === 'string' && text.length <= 96 && WORDS_PATTERN.test(text),
        DONE_HINT,
      )
      .optional(),
    lost: z
      .custom<string>(
        (text) => typeof text === 'string' && text.length <= 96 && WORDS_PATTERN.test(text),
        LOST_HINT,
      )
      .optional(),
    score: z.custom<string>(isScoreName, SCORE_HINT).optional(),
    warnings: z.array(MessageKey).min(1).max(8).optional(),
    splash: Id.optional(),
    content: z.array(ref).max(1024),
  })
  .superRefine((project, ctx) => {
    if (project.lost !== undefined && project.lost === project.done)
      ctx.addIssue({
        code: 'custom',
        path: ['lost'],
        message: 'A level cannot be won and lost by the same event. Change lost or done.',
      })
    for (const [field, noun] of [
      ['levels', 'level'],
      ['warnings', 'warning'],
    ] as const) {
      const seen = new Set<string>()
      ;(project[field] ?? []).forEach((id, i) => {
        if (seen.has(id))
          ctx.addIssue({
            code: 'custom',
            path: [field, i],
            message: `This ${noun} is already in the list.`,
          })
        seen.add(id)
      })
    }
    const seen = new Set<string>()
    ;(project.content ?? []).forEach((entry, i) => {
      if (seen.has(entry.path))
        ctx.addIssue({
          code: 'custom',
          path: ['content', i, 'path'],
          message: 'This file is already listed.',
        })
      seen.add(entry.path)
    })
  })

/** The levels in the order they are played: `levels`, else the start level alone. */
export function levelOrder(project: Project): readonly string[] {
  return project.levels ?? [project.start]
}

/** The level after `level` in `levelOrder`, or `undefined` after the last (or for a level that is not in it). */
export function nextLevel(project: Project, level: string): string | undefined {
  const order = levelOrder(project)
  const at = order.indexOf(level)
  return at < 0 ? undefined : order[at + 1]
}

/**
 * `score` as its two halves: the resource and the field of it that is counted. The last dot splits them, so a
 * resource id may hold dots (`hero.score`). `undefined` when the project names no score.
 */
export function scoreRef(
  project: Project,
): { readonly resource: string; readonly field: string } | undefined {
  const { score } = project
  if (score === undefined) return undefined
  const at = score.lastIndexOf('.')
  return { resource: score.slice(0, at), field: score.slice(at + 1) }
}

const VOICE: Voice = {
  noun: 'project',
  missing: {
    format: 'Write format = 1.',
    name: 'Write the name of your game, like name = "Crate Game".',
    start: 'Write the id of the level a new game opens, like start = "level-1".',
    hero: 'Write the id of the character each player controls, like hero = "hero".',
    content: 'List every content file with a [[content]] block holding a type and a path.',
    'content.type': 'Write the kind of file, like type = "level".',
    'content.path': 'Write where the file is, like path = "content/levels/level-1.json".',
  },
}

/** Reads the text of `automata.toml`. Never throws; every problem names the file. */
export function parseProject(text: string): Parsed<Project> {
  let data: unknown
  try {
    data = parseToml(withoutMark(text))
  } catch (error) {
    const first = (error instanceof Error ? error.message : String(error)).split('\n')[0]?.trim()
    return {
      ok: false,
      diagnostics: [
        {
          file: PROJECT_FILE,
          path: '',
          message: `This file is not valid TOML. ${first || 'Check for a missing quote or bracket.'}`,
        },
      ],
    }
  }
  return checkData<Project>(ProjectSchema, data, PROJECT_FILE, VOICE)
}
