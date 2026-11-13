import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { Character } from './character.ts'
import type { Diagnostic } from './diagnostics.ts'
import type { Level } from './level.ts'
import { type Parsed, parseContent } from './parse.ts'
import type { ContentRef } from './project.ts'
import { PROJECT_FILE, type Project, parseProject } from './project.ts'

/** A whole game's content, read and checked, and frozen so nothing can change it by accident. */
export interface GameContent {
  readonly project: Project
  readonly levels: Readonly<Record<string, Level>>
  readonly characters: Readonly<Record<string, Character>>
}

/** What a file's id has to be: its name without `.json`. */
function fileId(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
}

/** "crate, hero", or a plain "nothing" for an empty game. */
function list(ids: readonly string[]): string {
  return ids.length === 0 ? 'nothing' : [...ids].sort().join(', ')
}

/** The text of a file, or `undefined` when it cannot be read for any reason (a rejection of any kind, or a throw). */
async function readText(read: (path: string) => Promise<string>, path: string): Promise<string | undefined> {
  try {
    const text = await read(path)
    return typeof text === 'string' ? text : undefined
  } catch {
    return undefined
  }
}

const fail = (diagnostics: Diagnostic[]): Parsed<GameContent> => ({ ok: false, diagnostics })

async function load(read: (path: string) => Promise<string>): Promise<Parsed<GameContent>> {
  const projectText = await readText(read, PROJECT_FILE)
  if (projectText === undefined)
    return fail([
      {
        file: PROJECT_FILE,
        path: '',
        message: 'This file is missing. Every game needs it at the top of its repository.',
      },
    ])
  const parsedProject = parseProject(projectText)
  if (!parsedProject.ok) return fail([...parsedProject.diagnostics])
  const project = parsedProject.value

  // Ids that files will have, taken from the file names, so one broken file does not make every reference to it
  // look wrong as well.
  const named = (type: ContentRef['type']): string[] =>
    project.content.filter((r) => r.type === type).map((r) => fileId(r.path))
  const levelIds = named('level')
  const characterIds = named('character')

  const problems: Diagnostic[] = []
  const unknown = (path: string, what: string, id: string, known: readonly string[]): void => {
    problems.push({
      file: PROJECT_FILE,
      path,
      message: `There is no ${what} called "${id}". This game has: ${list(known)}.`,
    })
  }
  if (!levelIds.includes(project.start)) unknown('start', 'level', project.start, levelIds)
  if (!characterIds.includes(project.hero)) unknown('hero', 'character', project.hero, characterIds)

  const texts = await Promise.all(project.content.map((r) => readText(read, r.path)))
  const levels: Record<string, Level> = {}
  const characters: Record<string, Character> = {}
  const firstPath = new Map<string, string>()

  /** Checks a parsed file's id against its name and against every other file of its kind. Returns the id if fine. */
  const claim = (ref: ContentRef, id: string): boolean => {
    const expected = fileId(ref.path)
    const key = `${ref.type}:${id}`
    const earlier = firstPath.get(key)
    if (id !== expected)
      problems.push({
        file: ref.path,
        path: 'id',
        message: `This must be "${expected}", the same as the file name.`,
      })
    else if (earlier !== undefined)
      problems.push({
        file: ref.path,
        path: 'id',
        message: `There is already a ${ref.type} called "${id}", in ${earlier}.`,
      })
    else {
      firstPath.set(key, ref.path)
      return true
    }
    return false
  }

  for (const [i, ref] of project.content.entries()) {
    const text = texts[i]
    if (text === undefined) {
      problems.push({
        file: ref.path,
        path: '',
        message: `This file is listed in ${PROJECT_FILE} but is missing.`,
      })
    } else if (ref.type === 'level') {
      const parsed = parseContent('level', text, ref.path)
      if (!parsed.ok) problems.push(...parsed.diagnostics)
      else {
        if (claim(ref, parsed.value.id)) levels[parsed.value.id] = parsed.value
        parsed.value.things.forEach((thing, t) => {
          if (!characterIds.includes(thing.character))
            problems.push({
              file: ref.path,
              path: `things[${t}].character`,
              message: `There is no character called "${thing.character}". This game has: ${list(characterIds)}.`,
            })
        })
      }
    } else {
      const parsed = parseContent('character', text, ref.path)
      if (!parsed.ok) problems.push(...parsed.diagnostics)
      else if (claim(ref, parsed.value.id)) characters[parsed.value.id] = parsed.value
    }
  }

  if (problems.length > 0) return fail(problems)
  return { ok: true, value: deepFreeze({ project, levels, characters }) }
}

/**
 * Reads a game: the project file, then every file it lists, through `read` (a fetch, the file system, GitHub).
 * Every problem in every file comes back at once, in the order the project lists the files; the cross-file
 * checks (a file's id is its name, a thing's character exists, the start level and hero exist) run on files
 * that were read. Never throws.
 */
export async function loadGame(read: (path: string) => Promise<string>): Promise<Parsed<GameContent>> {
  try {
    return await load(read)
  } catch {
    return fail([
      {
        file: PROJECT_FILE,
        path: '',
        message: 'This game could not be read. Check that every file looks like the example.',
      },
    ])
  }
}
