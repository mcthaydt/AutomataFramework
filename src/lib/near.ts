// The closest word in a list, for a message that says "did you mean". Edits are insertions, deletions and changes of
// one letter, counted over UTF-16 code units: the words here are the ids of numbers, files and the like, in plain ASCII.

/** How many one-letter edits turn `a` into `b`. */
export function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      const change = (row[j - 1] ?? 0) + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
      next.push(Math.min(change, (row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1))
    }
    row = next
  }
  return row[b.length] ?? 0
}

/**
 * The word in `words` that `word` is a near miss of: the closest one within `limit` edits, the first of two equally
 * close. A word that is in the list is no miss, and a word the list does not come near gets `undefined`.
 */
export function nearest(word: string, words: readonly string[], limit: number): string | undefined {
  let best: string | undefined
  let bestDistance = limit + 1
  for (const one of words) {
    if (one === word) return undefined
    const distance = editDistance(word, one)
    if (distance < bestDistance) {
      best = one
      bestDistance = distance
    }
  }
  return best
}
