// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/util/sorted.ts
// The only place in packages/sim allowed to enumerate object keys (check-boundaries exempts this file).
// Engines enumerate integer-like keys first and insertion order otherwise; sorting removes that dependency.

/** Own enumerable string keys, sorted by UTF-16 code unit. */
export function sortedKeys(obj: object): string[] {
  return Object.keys(obj).sort()
}

/** Own enumerable [key, value] pairs, sorted by key. */
export function sortedEntries<V>(obj: Readonly<Record<string, V>>): Array<[string, V]> {
  return sortedKeys(obj).map((k) => [k, obj[k] as V])
}

/** How many own enumerable string keys `obj` has; cheaper than sortedKeys when only the count matters. */
export function ownKeyCount(obj: object): number {
  return Object.keys(obj).length
}
