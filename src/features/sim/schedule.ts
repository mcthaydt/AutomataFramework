// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/schedule/schedule.ts
import { PHASES, type PluginDef, type SystemDef } from './definitions.ts'

/**
 * Kahn's algorithm that always takes the alphabetically smallest ready node, so the result depends only on
 * the nodes and edges, never on input order. Edges are [from, to]: `from` runs before `to`.
 */
function stableTopo(
  what: string,
  nodes: readonly string[],
  edges: ReadonlyArray<readonly [string, string]>,
): string[] {
  const indegree = new Map<string, number>(nodes.map((n) => [n, 0]))
  const next = new Map<string, string[]>(nodes.map((n) => [n, []]))
  for (const [from, to] of edges) {
    next.get(from)?.push(to)
    indegree.set(to, (indegree.get(to) ?? 0) + 1)
  }
  const ready = nodes.filter((n) => indegree.get(n) === 0)
  const out: string[] = []
  while (ready.length > 0) {
    ready.sort()
    const n = ready.shift() as string
    out.push(n)
    for (const m of next.get(n) ?? []) {
      const d = (indegree.get(m) ?? 0) - 1
      indegree.set(m, d)
      if (d === 0) ready.push(m)
    }
  }
  if (out.length !== nodes.length) {
    const stuck = nodes.filter((n) => !out.includes(n)).sort()
    throw new Error(`${what} ordering has a cycle among: ${stuck.join(', ')}`)
  }
  return out
}

/** Plugins in dependency order, ties broken by name. */
export function orderPlugins(plugins: readonly PluginDef[]): PluginDef[] {
  const byName = new Map<string, PluginDef>()
  for (const p of plugins) {
    if (byName.has(p.name)) throw new Error(`duplicate plugin "${p.name}"`)
    byName.set(p.name, p)
  }
  const edges: Array<[string, string]> = []
  for (const p of plugins) {
    for (const dep of p.dependsOn) {
      if (!byName.has(dep)) throw new Error(`plugin "${p.name}" depends on unknown plugin "${dep}"`)
      edges.push([dep, p.name])
    }
  }
  return stableTopo('plugin', [...byName.keys()], edges).map((n) => byName.get(n) as PluginDef)
}

/** Systems grouped by phase (fixed order); within a phase, before/after constraints, ties by name. */
export function orderSystems(systems: readonly SystemDef[]): SystemDef[] {
  const byName = new Map<string, SystemDef>()
  for (const s of systems) {
    if (byName.has(s.name)) throw new Error(`duplicate system "${s.name}"`)
    byName.set(s.name, s)
  }
  const ordered: SystemDef[] = []
  for (const phase of PHASES) {
    const inPhase = systems.filter((s) => s.phase === phase)
    const edges: Array<[string, string]> = []
    for (const s of inPhase) {
      for (const [list, dir] of [
        [s.after, 'after'],
        [s.before, 'before'],
      ] as const) {
        for (const ref of list) {
          const other = byName.get(ref)
          if (!other) throw new Error(`system "${s.name}" is ${dir} unknown system "${ref}"`)
          if (other.phase !== s.phase) {
            throw new Error(
              `system "${s.name}" (${s.phase}) is ${dir} "${ref}", which is in a different phase (${other.phase})`,
            )
          }
          edges.push(dir === 'after' ? [ref, s.name] : [s.name, ref])
        }
      }
    }
    for (const n of stableTopo(
      'system',
      inPhase.map((s) => s.name),
      edges,
    ))
      ordered.push(byName.get(n) as SystemDef)
  }
  return ordered
}
