// Comparing Rapier handles exactly, for the checks a restore makes against the world it was given.

/** The exact 64 bits of a handle, so two handles compare equal only when Rapier would treat them the same. */
export function handleBits(handle: number): bigint {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, handle, true)
  return view.getBigUint64(0, true)
}

/** Whether two lists hold the same handles, in any order. */
export function sameHandles(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  const left = a.map(handleBits).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  const right = b.map(handleBits).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  return left.every((bits, i) => bits === right[i])
}
