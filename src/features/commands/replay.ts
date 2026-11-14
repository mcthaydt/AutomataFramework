// The replay file: a play recorded as JSON, small enough for a person or an agent to read, diff and edit.
// It holds the seed, the tick rate and the commands, plus the hashes seen while it was recorded; it holds no snapshot,
// so it can be played against content that has changed since, and `verifyReplay` says so when it has. Format 2 also
// holds the hash of the sim's schema (the shape of its rules), so a replay can say the rules changed. Format 1 is still
// read and written as it was.

import { canonicalJson } from '../../lib/canonical.ts'
import { z } from '../../lib/zod.ts'
import type { Command } from '../sim/sim.ts'

export interface ReplayCheck {
  readonly tick: number
  readonly hash: string
}

/** The format a recorder writes now. */
export const REPLAY_FORMAT = 2

export interface Replay {
  /** 1 is the first format, with no `schemaHash`; 2 records it. */
  readonly format: 1 | 2
  /** The framework version that recorded it, for information. */
  readonly framework: string
  readonly tickHz: number
  readonly seed: number
  /** 16 hex digits: the hash of the content the run used. */
  readonly contentHash: string
  /** Format 2 only, 16 hex digits: the hash of the sim's schema, the shape of the rules the run used. */
  readonly schemaHash?: string
  /** How many ticks the run lasted. */
  readonly ticks: number
  /** In ascending tick order. */
  readonly commands: readonly Command[]
  /** The sim's hash after each recorded tick that is a multiple of the check interval, except the last tick. */
  readonly checks: readonly ReplayCheck[]
  /** The sim's hash after the last tick. */
  readonly finalHash: string
  /** Anything the recorder wants to remember about the run (the level, the build). Words only. */
  readonly meta: Readonly<Record<string, string>>
}

const Hash = z.string().regex(/^[0-9a-f]{16}$/, 'a hash is 16 lower-case hex digits')
const Int = z.number().int().min(0)

const commandSchema = z.strictObject({
  tick: Int,
  source: Int.max(255),
  seq: Int.max(4294967295),
  type: z.string().min(1),
  payload: z.json(),
})

/** The strict shape of a replay file. A key it does not know is an error, so a typo is not silently dropped. */
export const ReplaySchema: z.ZodType<Replay> = z.strictObject({
  format: z.literal([1, 2]),
  framework: z.string(),
  tickHz: Int.min(1).max(1000),
  seed: z.number().int(),
  contentHash: Hash,
  schemaHash: Hash.optional(),
  ticks: Int,
  commands: z.array(commandSchema),
  checks: z.array(z.strictObject({ tick: Int, hash: Hash })),
  finalHash: Hash,
  meta: z.record(z.string(), z.string()),
}) as unknown as z.ZodType<Replay>

/** Thrown for text that is not a replay. The message says where, in words. */
export class ReplayFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReplayFormatError'
  }
}

/** Reads a replay from its text. Throws `ReplayFormatError` for anything that is not one. */
export function parseReplay(text: string): Replay {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ReplayFormatError('This is not a replay: it is not valid JSON.')
  }
  const parsed = ReplaySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first && first.path.length > 0 ? first.path.join('.') : 'the file'
    throw new ReplayFormatError(`This is not a replay: ${where}: ${first?.message ?? 'it does not match'}.`)
  }
  const replay = parsed.data
  if ((replay.format === 2) !== (replay.schemaHash !== undefined)) {
    throw new ReplayFormatError(
      'This is not a replay: schemaHash: a format 2 replay has one and a format 1 replay has none.',
    )
  }
  for (let i = 1; i < replay.commands.length; i++) {
    if ((replay.commands[i]?.tick ?? 0) < (replay.commands[i - 1]?.tick ?? 0)) {
      throw new ReplayFormatError(`This is not a replay: commands.${i}: commands must be in order of tick.`)
    }
  }
  const last = replay.commands[replay.commands.length - 1]
  if (last !== undefined && last.tick >= replay.ticks) {
    throw new ReplayFormatError(
      `This is not a replay: commands: a command is for tick ${last.tick}, after the run ended.`,
    )
  }
  checkChecks(replay)
  return replay
}

/**
 * The hashes taken on the way must be for ticks the run had, once each and in order, so a check is for "that tick" and
 * not "the nth one". The last tick is `finalHash`, never also a check; tick 0 is before anything happened.
 */
function checkChecks(replay: Replay): void {
  let before = 0
  for (let i = 0; i < replay.checks.length; i++) {
    const tick = (replay.checks[i] as ReplayCheck).tick
    if (tick === 0) {
      throw new ReplayFormatError(
        `This is not a replay: checks.${i}: a check is for tick 0, before anything was played. The first can be tick 1.`,
      )
    }
    if (tick >= replay.ticks) {
      throw new ReplayFormatError(
        `This is not a replay: checks.${i}: a check is for tick ${tick}, but the run ended at tick ${replay.ticks}. The last tick has finalHash.`,
      )
    }
    if (tick <= before) {
      throw new ReplayFormatError(
        `This is not a replay: checks.${i}: checks must be in order of tick, each tick once.`,
      )
    }
    before = tick
  }
}

/**
 * The replay as text: two-space JSON, keys in the order of `Replay`, payload keys sorted, one newline at the end. Two
 * writers of the same replay produce the same bytes, so a diff or a merge only shows what changed.
 */
export function writeReplay(replay: Replay): string {
  const ordered = {
    format: replay.format,
    framework: replay.framework,
    tickHz: replay.tickHz,
    seed: replay.seed,
    contentHash: replay.contentHash,
    ...(replay.schemaHash === undefined ? {} : { schemaHash: replay.schemaHash }),
    ticks: replay.ticks,
    commands: replay.commands.map((c) => ({
      tick: c.tick,
      source: c.source,
      seq: c.seq,
      type: c.type,
      payload: JSON.parse(canonicalJson(c.payload)) as unknown,
    })),
    checks: replay.checks.map((c) => ({ tick: c.tick, hash: c.hash })),
    finalHash: replay.finalHash,
    meta: Object.fromEntries(Object.entries(replay.meta).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
  }
  return `${JSON.stringify(ordered, null, 2)}\n`
}
