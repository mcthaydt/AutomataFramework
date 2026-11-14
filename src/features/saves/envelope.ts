// The stored form of one save slot: a small envelope around the game's data. It is canonical JSON, so the same save is
// the same bytes in every engine, and it carries the version of the data so a later build can upgrade it. This file
// checks the envelope's shape only, never the data inside: that is the game's schema's job (define.ts).
import { CanonicalJsonError, canonicalJson } from '../../lib/canonical.ts'

/** What is stored for one slot. */
export interface Envelope {
  /** The envelope's own layout. A later plan may add a second one; stored saves of this one stay readable. */
  readonly format: 1
  /** The game's version of `data`. */
  readonly version: number
  /** Milliseconds since 1970 when it was saved. For a slot list only: it never reaches the sim. */
  readonly savedAt: number
  /** A short name a saves screen may show, 1 to 80 characters. */
  readonly label?: string
  readonly data: unknown
}

/** The longest label, so a saves screen has a size to design for. */
const MAX_LABEL = 80

/**
 * Canonical JSON for something a game or a setting stored. A value JSON cannot keep exactly (a Date, `undefined`,
 * NaN, a class instance) is a mistake in the game, and is thrown as a `RangeError` in plain words, before anything
 * is written, rather than as the hashing code's own error.
 */
export function plainJson(value: unknown): string {
  try {
    return canonicalJson(value)
  } catch (error) {
    if (!(error instanceof CanonicalJsonError)) throw error
    throw new RangeError(
      `A save holds plain data only (text, numbers, true or false, lists and objects). ${error.message.replace(/^canonicalJson: /, '')}.`,
    )
  }
}

/** The text to store. Throws a `RangeError` for data JSON cannot keep (see `plainJson`). */
export function writeEnvelope(envelope: Envelope): string {
  return plainJson(envelope)
}

/** Why text could not be read as an envelope, in words a screen may show. */
export type EnvelopeRead =
  | { readonly ok: true; readonly envelope: Envelope }
  | { readonly ok: false; readonly detail: string }

function fail(detail: string): EnvelopeRead {
  return { ok: false, detail }
}

/** Checks the shape only, never the data. Order matters: the first thing wrong is the thing said. */
export function readEnvelope(text: string): EnvelopeRead {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return fail('This is not JSON.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    return fail('This is not a save.')
  const found = parsed as Record<string, unknown>
  if (typeof found.format !== 'number') return fail('This is not a save.')
  if (found.format !== 1) return fail(`This save is in a format this game does not know (${found.format}).`)
  const { version, savedAt, label } = found
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return fail('This save has no version.')
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return fail('This save has no date.')
  if (!('data' in found)) return fail('This save has nothing in it.')
  if (label !== undefined && (typeof label !== 'string' || label.length < 1 || label.length > MAX_LABEL))
    return fail('This save has a label that cannot be read.')
  return {
    ok: true,
    envelope: {
      format: 1,
      version,
      savedAt,
      ...(label === undefined ? {} : { label }),
      data: found.data,
    },
  }
}
