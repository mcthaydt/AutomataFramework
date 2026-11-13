import { parse as parseToml } from 'smol-toml'
import { z } from 'zod'
import type { ContentType } from './content-types.ts'
import type { Voice } from './diagnostics.ts'
import { Id } from './ids.ts'
import { checkData, type Parsed } from './parse.ts'

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
  readonly content: readonly ContentRef[]
}

const PATH_HINT = 'Use a path inside the game, like content/levels/level-1.json.'

/** Relative, with `/`, no `.` or `..` part, ending in `.json`: nothing that could reach outside the game. */
function isGamePath(path: string): boolean {
  if (!path.endsWith('.json') || path.includes('\\') || path.includes(':')) return false
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

const ref = z.strictObject({
  type: z.enum(['level', 'character']),
  path: z.string().refine(isGamePath, PATH_HINT),
})

/** The rules for the project file; unknown keys are refused, and a file may be listed only once. */
export const ProjectSchema: z.ZodType<Project, Project> = z
  .strictObject({
    format: z.literal(1),
    name: z.string().min(1).max(80),
    start: Id,
    hero: Id,
    content: z.array(ref).max(1024),
  })
  .superRefine((project, ctx) => {
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

const VOICE: Voice = {
  noun: 'project',
  missing: {
    format: 'Write format = 1.',
    name: 'Write the name of your game, like name = "Crate Game".',
    start: 'Write the id of the level a new game opens, like start = "level-1".',
    hero: 'Write the id of the character each player controls, like hero = "hero".',
    content: 'List every content file with a [[content]] block holding a type and a path.',
    'content.type': 'Write type = "level" or type = "character".',
    'content.path': 'Write where the file is, like path = "content/levels/level-1.json".',
  },
}

/** Reads the text of `automata.toml`. Never throws; every problem names the file. */
export function parseProject(text: string): Parsed<Project> {
  let data: unknown
  try {
    data = parseToml(text)
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
