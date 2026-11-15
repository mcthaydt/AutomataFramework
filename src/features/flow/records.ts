// What a player has done on this device that is not a saved game: their best score. It is kept with the settings, not in
// a save: a game that names its own save has no place for it, and a best score belongs to the player on this device,
// not to one of the three saved games. "Delete all my saves" clears it with them.
import { z } from '../../lib/zod.ts'

/** The `records` section of the settings. */
export interface Records {
  /** The highest score of any level ended on this device. Left out until there is one. */
  readonly best?: number | undefined
}

/** The strict shape of the stored `records` section: `best` is a finite number. */
export const RecordsSchema: z.ZodType<Records, Records> = z.strictObject({ best: z.number().optional() })

/** What a new player starts with: no best score. */
export const RECORDS_DEFAULT: Records = Object.freeze({})

/**
 * `records` with `score` as the best when it beats it. The very same object comes back when it does not, or when the
 * score is not a finite number (a game that names no score gives `undefined`), so a caller can tell that nothing needs
 * keeping by comparing.
 */
export function withScore(records: Records, score: number | undefined): Records {
  if (score === undefined || !Number.isFinite(score)) return records
  return records.best !== undefined && score <= records.best ? records : { ...records, best: score }
}
