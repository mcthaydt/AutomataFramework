import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { BehaviourFile } from './behaviour.ts'
import type { Character } from './character.ts'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'
import type { Diagnostic } from './diagnostics.ts'
import type { Level } from './level.ts'
import { type Parsed, parseContent } from './parse.ts'
import type { ContentRef } from './project.ts'
import { PROJECT_FILE, type Project, parseProject } from './project.ts'
import { noSuch } from './shared.ts'
import type { TilesetFile } from './tileset.ts'
import type { Listed } from './type-info.ts'

/**
 * A whole game's content, read and checked, and frozen so nothing can change it by accident. `levels` and
 * `characters` are always there; another kind's map is there only when the project lists at least one file of that
 * kind, because the whole of this is hashed into every snapshot and a game that uses nothing new must hash as it did.
 * Each map has no prototype, so `constructor` is an ordinary name.
 */
export interface GameContent {
  readonly project: Project
  readonly levels: Readonly<Record<string, Level>>
  readonly characters: Readonly<Record<string, Character>>
  readonly tilesets?: Readonly<Record<string, TilesetFile>>
  readonly behaviours?: Readonly<Record<string, BehaviourFile>>
}

/** What a file's id has to be: its name without `.json`. */
function fileId(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
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

/** "a level", "an apple": the article follows the first letter of the noun. */
const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`

/**
 * When a file does not read as its listed kind, says so in one sentence if exactly one other kind reads it: a
 * sound listed as music should not give a page of "this is missing" and "this is not something a music has".
 */
function wrongKind(ref: ContentRef, text: string): Diagnostic | undefined {
  const reads = (Object.keys(CONTENT_TYPES) as ContentType[]).filter(
    (type) => type !== ref.type && parseContent(type, text, ref.path).ok,
  )
  const [only] = reads
  if (reads.length !== 1 || only === undefined) return undefined
  return {
    file: ref.path,
    path: '',
    message: `This file is listed as ${withArticle(CONTENT_TYPES[ref.type].noun)}, but it reads as ${withArticle(CONTENT_TYPES[only].noun)}. Change its type in ${PROJECT_FILE}.`,
  }
}

/** One listed file while the game is read: its problems so far, and its value once it read and its id was right. */
interface Slot {
  readonly ref: ContentRef
  readonly problems: Diagnostic[]
  value?: unknown
}

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
  const named = (type: ContentType): string[] =>
    project.content.filter((r) => r.type === type).map((r) => fileId(r.path))

  const projectProblems: Diagnostic[] = []
  const unknown = (path: string, what: string, id: string): void => {
    projectProblems.push({
      file: PROJECT_FILE,
      path,
      message: noSuch(what, id, named(what as ContentType)),
    })
  }
  if (!named('level').includes(project.start)) unknown('start', 'level', project.start)
  if (!named('character').includes(project.hero)) unknown('hero', 'character', project.hero)

  const texts = await Promise.all(project.content.map((r) => readText(read, r.path)))
  const values = new Map<string, unknown>()
  const firstPath = new Map<string, string>()

  /** Checks a parsed file's id against its name and against every other file of its kind. True if it is fine. */
  const claim = (slot: Slot, id: string): boolean => {
    const { ref } = slot
    const key = `${ref.type}:${id}`
    const earlier = firstPath.get(key)
    if (id !== fileId(ref.path))
      slot.problems.push({
        file: ref.path,
        path: 'id',
        message: `This must be "${fileId(ref.path)}", the same as the file name.`,
      })
    else if (earlier !== undefined)
      slot.problems.push({
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

  // First every file is read on its own; the checks across files come after, when every value is known.
  const slots: Slot[] = project.content.map((ref, i) => {
    const slot: Slot = { ref, problems: [] }
    const text = texts[i]
    if (text === undefined) {
      slot.problems.push({
        file: ref.path,
        path: '',
        message: `This file is listed in ${PROJECT_FILE} but is missing.`,
      })
      return slot
    }
    const parsed = parseContent(ref.type, text, ref.path)
    if (!parsed.ok) {
      const wrong = wrongKind(ref, text)
      slot.problems.push(...(wrong === undefined ? parsed.diagnostics : [wrong]))
    } else if (claim(slot, (parsed.value as { id: string }).id)) {
      slot.value = parsed.value
      values.set(`${ref.type}:${(parsed.value as { id: string }).id}`, parsed.value)
    }
    return slot
  })

  const game: Listed = {
    has: (type, id) => named(type).includes(id),
    ids: (type) => named(type).sort(),
    get: ((type: ContentType, id: string) => values.get(`${type}:${id}`)) as Listed['get'],
  }
  for (const slot of slots) {
    if (slot.value === undefined) continue
    const check = CONTENT_TYPES[slot.ref.type].check as
      | ((value: unknown, game: Listed, report: (path: string, message: string) => void) => void)
      | undefined
    check?.(slot.value, game, (path, message) => {
      slot.problems.push({ file: slot.ref.path, path, message })
    })
  }

  const problems = [...projectProblems, ...slots.flatMap((slot) => slot.problems)]
  if (problems.length > 0) return fail(problems)

  // The maps: `levels` and `characters` always, the rest only when a file of that kind is listed.
  const maps: Record<string, Record<string, unknown>> = {
    levels: Object.create(null),
    characters: Object.create(null),
  }
  for (const slot of slots) {
    const plural = CONTENT_TYPES[slot.ref.type].plural
    const map = maps[plural] ?? Object.create(null)
    maps[plural] = map
    map[(slot.value as { id: string }).id] = slot.value
  }
  return { ok: true, value: deepFreeze({ project, ...maps }) as GameContent }
}

/**
 * Reads a game: the project file, then every file it lists, through `read` (a fetch, the file system, GitHub).
 * Every problem in every file comes back at once: the project file's own first, then, in the order the project
 * lists the files, each file's reading problems, or else its id problem, or else its checks against the other
 * files. Never throws.
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
