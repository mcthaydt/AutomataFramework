// `docs/formats/changes.md` is the public list of format changes, shipped in the package. It is held to the schemas: a
// schema cannot change without the newest entry of its kind saying so, with the hash of the new bytes.
import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'

const page = readFileSync(new URL('../../docs/formats/changes.md', import.meta.url), 'utf8')
const SCHEMAS = new URL('../../schemas/', import.meta.url)

interface Entry {
  readonly date: string
  readonly kind: string
  readonly title: string
  /** The hash its last line ends with, or `undefined` when the entry has none. */
  readonly hash: string | undefined
}

/** The entries in the order the page has them: newest first. */
function entries(): Entry[] {
  return page
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const heading = /^(\d{4}-\d{2}-\d{2}) · (\S+) · (.+)$/m.exec(block)
      return {
        date: heading?.[1] ?? '',
        kind: heading?.[2] ?? '',
        title: heading?.[3] ?? '',
        hash: /\*\*Schema:\*\* `([0-9a-f]{16})`/.exec(block)?.[1],
      }
    })
}

/** The kinds that have a schema file: every one but the replay's, which is not a content kind. */
function kinds(): string[] {
  return readdirSync(SCHEMAS)
    .filter((name) => name.endsWith('.schema.json') && name !== 'replay.schema.json')
    .map((name) => name.slice(0, -'.schema.json'.length))
    .sort()
}

test('every entry has a date, a kind, a title and a hash, and the newest is first', () => {
  const all = entries()
  expect(all.length).toBeGreaterThan(0)
  for (const entry of all) {
    expect(entry.date, entry.title).not.toBe('')
    expect(entry.kind, entry.title).not.toBe('')
    expect(entry.hash, `${entry.kind}: ${entry.title}`).toBeDefined()
  }
  const dates = all.map((entry) => entry.date)
  expect(dates, 'the page is newest first').toEqual([...dates].sort().reverse())
})

test('the newest entry of every kind ends with the hash of its schema file', () => {
  for (const kind of kinds()) {
    const file = `schemas/${kind}.schema.json`
    const hash = hex64(xxhash64(readFileSync(new URL(`${kind}.schema.json`, SCHEMAS))))
    const newest = entries().find((entry) => entry.kind === kind)
    expect(
      newest?.hash,
      `${file} changed and docs/formats/changes.md has no entry for it. Add one, newest first, ending with: **Schema:** \`${hash}\``,
    ).toBe(hash)
  }
})

test('no entry names a kind that has no schema', () => {
  const known = new Set(kinds())
  for (const entry of entries())
    expect(known.has(entry.kind), `The page has an entry for "${entry.kind}", which has no schema.`).toBe(
      true,
    )
})
