// What the package ships for an agent to read: the content kinds with their JSON Schemas, and the skills. `automata mcp`
// offers them as tools (`content_types`, `schema`, `skill`) and as resources, both from the one reading here. They are
// read through the `Files` port, from the package's own folder, so a test runs on files in memory.
import { join } from 'node:path'
import { Effect } from 'effect'
import { CONTENT_TYPES, type ContentType } from '../content/content.ts'
import { CliError, Files, type FilesService } from './ports.ts'
import { packageRoot } from './template.ts'

/** The kinds of content file, then the recording's own kind, which has a schema too. */
export const SCHEMA_TYPES: readonly string[] = [...Object.keys(CONTENT_TYPES), 'replay']

/** The skill every agent starts from, whose sections say what each kind of content file is. */
const CONTENT_SKILL = 'automata-content'

const read = (path: string, what: string): Effect.Effect<string, CliError, FilesService> =>
  Effect.flatMap(Files, (files) => files.readText(path)).pipe(
    Effect.flatMap((text) =>
      text === undefined
        ? Effect.fail(
            new CliError(`${what} could not be read from ${path}. Run npm install to get a whole copy.`),
          )
        : Effect.succeed(text),
    ),
  )

/** The JSON Schema of a kind (or of `replay`), as read from `schemas/<type>.schema.json`. */
export function schemaOf(type: string): Effect.Effect<unknown, CliError, FilesService> {
  if (!SCHEMA_TYPES.includes(type))
    return Effect.fail(
      new CliError(`There is no kind called "${type}". The kinds are: ${SCHEMA_TYPES.join(', ')}.`),
    )
  return Effect.map(
    read(join(packageRoot(), 'schemas', `${type}.schema.json`), `The ${type} schema`),
    (text) => JSON.parse(text) as unknown,
  )
}

/** One skill: the folder name, the line that says when to read it, and the whole text. */
export interface Skill {
  readonly name: string
  readonly description: string
  readonly text: string
}

/** A skill file's `name:` and `description:` lines, from the front of the file. */
function frontMatter(text: string): { name?: string; description?: string } {
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? ''
  const found: { name?: string; description?: string } = {}
  for (const line of head.split(/\r?\n/)) {
    const [key, ...value] = line.split(': ')
    if (key === 'name') found.name = value.join(': ').trim()
    if (key === 'description') found.description = value.join(': ').trim()
  }
  return found
}

/** Every skill in the package's `skills/`, by name. */
export function skills(): Effect.Effect<readonly Skill[], CliError, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const root = join(packageRoot(), 'skills')
    const names = (yield* files.list(root))
      .filter((path) => path.endsWith('/SKILL.md'))
      .map((path) => path.slice(0, -'/SKILL.md'.length))
      .filter((name) => !name.includes('/'))
      .sort()
    const found: Skill[] = []
    for (const name of names) {
      const text = yield* read(join(root, name, 'SKILL.md'), `The ${name} skill`)
      found.push({ name, description: frontMatter(text).description ?? '', text })
    }
    return found
  })
}

/** What one kind of content file is, for `content_types`. */
export interface Kind {
  readonly kind: string
  /** What the kind holds, in the skill's own words. */
  readonly what: string
  /** Where its files go in a game. */
  readonly folder: string
  /** The editor that opens it. */
  readonly editor: string
  /** The resource that holds its JSON Schema. */
  readonly schema: string
}

/** The sentence that opens a kind's section in the content skill, before it says where the files go. */
function whatOf(skill: string, kind: string): string | undefined {
  const section = new RegExp(`^## ${kind}\\r?\\n\\r?\\n([^\\n]*?)\\s+Put the files in `, 'm').exec(skill)
  return section?.[1]?.trim()
}

/** Every kind of content file, in the table's order. */
export function kinds(): Effect.Effect<readonly Kind[], CliError, FilesService> {
  return Effect.map(skills(), (all) => {
    const content = all.find((skill) => skill.name === CONTENT_SKILL)?.text ?? ''
    return (Object.keys(CONTENT_TYPES) as ContentType[]).map((kind) => ({
      kind,
      what: whatOf(content, kind) ?? CONTENT_TYPES[kind].title,
      folder: `content/${CONTENT_TYPES[kind].plural}/`,
      editor: CONTENT_TYPES[kind].editor,
      schema: schemaUri(kind),
    }))
  })
}

export const schemaUri = (type: string): string => `automata://schemas/${type}`
export const skillUri = (name: string): string => `automata://skills/${name}`

/** One thing an agent may read by its address. */
export interface Resource {
  readonly uri: string
  readonly name: string
  readonly description: string
  readonly mimeType: string
}

const SCHEMA_TYPE = 'application/schema+json'
const MARKDOWN = 'text/markdown'

/** A resource per kind's schema, the recording's schema, and a text per skill. */
export function resources(): Effect.Effect<readonly Resource[], CliError, FilesService> {
  return Effect.map(skills(), (all) => [
    ...SCHEMA_TYPES.map((type) => ({
      uri: schemaUri(type),
      name: `${type} schema`,
      description:
        type === 'replay'
          ? 'The JSON Schema of a recording, the file in replays/.'
          : `The JSON Schema of a ${type} file.`,
      mimeType: SCHEMA_TYPE,
    })),
    ...all.map((skill) => ({
      uri: skillUri(skill.name),
      name: skill.name,
      description: skill.description,
      mimeType: MARKDOWN,
    })),
  ])
}

/** What a resource holds, or `undefined` when there is no such address. */
export function readResource(
  uri: string,
): Effect.Effect<{ uri: string; mimeType: string; text: string } | undefined, CliError, FilesService> {
  return Effect.gen(function* () {
    const schemaPrefix = schemaUri('')
    const skillPrefix = skillUri('')
    if (uri.startsWith(schemaPrefix) && SCHEMA_TYPES.includes(uri.slice(schemaPrefix.length))) {
      const schema = yield* schemaOf(uri.slice(schemaPrefix.length))
      return { uri, mimeType: SCHEMA_TYPE, text: JSON.stringify(schema, null, 2) }
    }
    if (uri.startsWith(skillPrefix)) {
      const skill = (yield* skills()).find((one) => one.name === uri.slice(skillPrefix.length))
      if (skill !== undefined) return { uri, mimeType: MARKDOWN, text: skill.text }
    }
    return undefined
  })
}
