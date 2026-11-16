// The links game with a weighed crate: its crate names a "How heavy" number as its `weight`, and room 1's crate is set
// to the weight a test asks for. The one game F4's tests (weight.test.ts, weight.parity.test.ts) run on.
import { writeContent } from '#src/features/content/content.ts'
import { editLevel, linksFiles } from './read.ts'

/** The crate character with a "How heavy" number (least 0.5, default 1) that is its weight. */
export function heavyCrate(): Record<string, string> {
  const crate = JSON.parse(linksFiles()['content/characters/crate.json'] ?? '') as Record<string, unknown>
  return {
    'content/characters/crate.json': writeContent('character', {
      ...crate,
      values: [
        { id: 'heavy', name: 'How heavy', type: 'number', least: 0.5, most: 8, step: 0.5, default: 1 },
      ],
      weight: 'heavy',
    } as never),
  }
}

/**
 * Room 1 with the weighed crate: `crate-1` weighs `kilos` (the default when left out) and, when `second` is given, a
 * `crate-2` beside it weighs that.
 */
export function weighedRoom(kilos?: number, second?: number): Record<string, string | undefined> {
  return {
    ...heavyCrate(),
    ...editLevel('room-1', (level) => {
      const crate = level.things.find((t) => t.id === 'crate-1')
      if (crate === undefined) throw new Error('room-1 has no crate')
      if (kilos !== undefined) crate.values = { heavy: kilos }
      if (second !== undefined)
        level.things.push({ id: 'crate-2', character: 'crate', x: 4, y: 7.5, values: { heavy: second } })
    }),
  }
}
