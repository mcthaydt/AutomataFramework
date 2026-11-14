// Pieces every kind of content file uses. A kind's file imports this and never `load.ts` or `project.ts`: `load.ts`
// imports the table and the table imports each kind, so that import would be a cycle.

/** "crate, hero", or a plain "nothing" for an empty game. Sorted by UTF-16 code unit, the same in every engine. */
export function list(ids: readonly string[]): string {
  return ids.length === 0 ? 'nothing' : [...ids].sort().join(', ')
}

/** `There is no <noun> called "<id>". This game has: a, b.` The one sentence for a name that is not there. */
export function noSuch(noun: string, id: string, known: readonly string[], owner = 'This game'): string {
  return `There is no ${noun} called "${id}". ${owner} has: ${list(known)}.`
}
