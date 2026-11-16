// The browsers a journey plays in. A draft runs Chromium only (the Owner, 2026-11-16): `ci.yml` sets JOURNEY_ENGINES to
// `chromium` there, and leaves it empty on the run that gates merge, where every engine plays.

/** Every browser the framework is proved in. */
export const ALL_ENGINES = ['chromium', 'webkit', 'firefox'] as const
export type EngineName = (typeof ALL_ENGINES)[number]

/** The engines this run plays in: the comma list in `list`, or all three when it is empty or not set. */
export function journeyEngines(
  list: string | undefined = process.env.JOURNEY_ENGINES,
): readonly EngineName[] {
  const named = (list ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
  if (named.length === 0) return ALL_ENGINES
  const chosen = ALL_ENGINES.filter((engine) => named.includes(engine))
  const unknown = named.filter((name) => !ALL_ENGINES.some((engine) => engine === name))
  if (unknown.length > 0)
    throw new Error(`JOURNEY_ENGINES names ${unknown.join(', ')}, which is not a browser here.`)
  return chosen
}

/** An engine this run plays in: `wanted` itself when it is in the list, else the list's first. */
export function engineFor(wanted: EngineName, engines: readonly EngineName[] = journeyEngines()): EngineName {
  return engines.includes(wanted) ? wanted : (engines[0] ?? 'chromium')
}
