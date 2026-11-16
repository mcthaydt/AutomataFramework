// What `automata.toml` says about how a level ends, held against what the game's sim can really raise: a `done` that
// nothing raises is a level that can never be finished, and that is found before anyone plays.
import { type Diagnostic, type GameContent, PROJECT_FILE } from '../content/content.ts'
import type { PluginDef } from '../sim/sim.ts'

const TOUCH_EVENT = /^(.+)\.(?:touched|left|taken)$/

/** The event and resource ids these plugins register, read from each plugin's own `events` and `resources`. */
export function simIds(plugins: readonly PluginDef[]): {
  readonly events: readonly string[]
  readonly resources: readonly string[]
} {
  return {
    events: plugins.flatMap((plugin) => plugin.events.map((event) => event.id)),
    resources: plugins.flatMap((plugin) => plugin.resources.map((resource) => resource.id)),
  }
}

/** Where each level's file is, from the project's list, by level id. */
function levelPaths(content: GameContent): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  for (const entry of content.project.content) {
    if (entry.type !== 'level') continue
    paths.set(entry.path.slice(entry.path.lastIndexOf('/') + 1, -'.json'.length), entry.path)
  }
  return paths
}

/**
 * What is wrong with how the game's levels end. `ids` is `simIds` of the game's whole list of plugins; `read` gives a
 * resource's value at tick 0 (`Sim.read`), for the score's field.
 */
export function endProblems(
  content: GameContent,
  sim: {
    readonly ids: ReturnType<typeof simIds>
    readonly read: (resourceId: string) => unknown
  },
): { readonly problems: Diagnostic[]; readonly notes: string[] } {
  const { done, lost, score } = content.project
  const problems: Diagnostic[] = []
  const notes: string[] = []
  const at = (path: string, message: string): number => problems.push({ file: PROJECT_FILE, path, message })

  if (done !== undefined) {
    if (!sim.ids.events.includes(done))
      at(
        'done',
        `done = "${done}" can never happen: nothing in this game raises it. A door needs a character with "kind": "door" and "touch": "sense".`,
      )
    else {
      const kind = TOUCH_EVENT.exec(done)?.[1]
      const made = Object.values(content.characters).some((character) => character.kind === kind)
      if (kind !== undefined && made) {
        const paths = levelPaths(content)
        for (const id of content.project.levels ?? [content.project.start]) {
          const level = content.levels[id]
          if (level === undefined) continue
          const has = level.things.some((thing) => content.characters[thing.character]?.kind === kind)
          if (!has)
            problems.push({
              file: paths.get(id) ?? `content/levels/${id}.json`,
              path: 'things',
              message: `This level has no ${kind}, so it can never be finished. Put one in "things".`,
            })
        }
      }
    }
  }
  if (lost !== undefined && !sim.ids.events.includes(lost))
    at(
      'lost',
      `lost = "${lost}" can never happen: nothing in this game raises it. Write lost = "hero.fell" and the framework raises it when a hero falls out of the level, or name an event your own rules raise.`,
    )
  if (score !== undefined) {
    const dot = score.lastIndexOf('.')
    const resource = score.slice(0, dot)
    const field = score.slice(dot + 1)
    let counted = false
    if (sim.ids.resources.includes(resource)) {
      try {
        const value = sim.read(resource) as Record<string, unknown> | null
        counted = typeof value?.[field] === 'number'
      } catch {
        counted = false
      }
    }
    if (!counted)
      at(
        'score',
        `score = "${score}" is not a number this game counts. Name a resource and one of its numbers, like "hero.score.sparks".`,
      )
  }
  if (done === undefined && lost === undefined)
    notes.push(
      'This game can be neither won nor lost. Add done = "…" or lost = "…" to automata.toml, or give the player something to aim for.',
    )
  return { problems, notes }
}
