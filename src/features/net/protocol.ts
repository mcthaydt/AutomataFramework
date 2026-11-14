// The wire between a player and a room: the messages, the numbers that bound them, and the options a player joins
// with. Everything off the wire is parsed here before anything uses it, on both sides, and a message that does not
// parse is `undefined`, never a throw: a client that sends rubbish costs the room nothing.
//
// Messages are plain objects on the channel `m`; a snapshot's bytes follow their header on the channel `b`.
import { z } from '../../lib/zod.ts'
import { MAX_PLAYERS } from '../commands/commands.ts'
import { FRAMEWORK_VERSION, type Sim } from '../sim/sim.ts'

/** Bumped when a message changes. */
export const PROTOCOL_VERSION = 1 as const
/** The one room type the server runs. */
export const ROOM_NAME = 'game'
/** The channel messages travel on (Colyseus packs the plain objects), and the one a snapshot's bytes follow on. */
export const MESSAGE_CHANNEL = 'm'
export const BYTES_CHANNEL = 'b'
/** A larger message from a client is dropped by the transport. */
export const MAX_MESSAGE_BYTES = 16_384
/** A command stamped further ahead of the room than this many ticks is refused. */
export const MAX_LEAD_TICKS = 60
/** Per seat, commands waiting for their tick. */
export const MAX_QUEUED_COMMANDS = 32
/** Ticks between hashes: the recorder's interval, so the room's replay holds the same ones. */
export const HASH_EVERY = 60
/** How many ticks ahead of the last confirmed tick a client starts by running, at least, and at most. */
export const START_LEAD = 2
export const MIN_LEAD = 1
export const MAX_CLIENT_LEAD = 30
/** With no late command for this many ticks, a client's lead drops by 1. */
export const LEAD_DECAY_TICKS = 300
/** New predicted steps in one advance, at most. */
export const MAX_CATCH_UP = 4
/** Confirmed ticks taken in one advance, at most. */
export const MAX_CONFIRM_PER_ADVANCE = 240
/** With more tick messages than this waiting, a client asks for `sync` instead of taking them one by one. */
export const SYNC_BEHIND = 600
/** How long a dropped player's seat is kept. */
export const RECONNECT_GRACE_SECONDS = 30
/** When, in milliseconds after the drop, a page tries to get back in. */
export const RECONNECT_DELAYS_MS: readonly number[] = [500, 1000, 2000, 4000, 8000]
/** Koota allows 16 worlds in a process and each room is one. */
export const DEFAULT_MAX_ROOMS = 8

const U32: z.ZodType<number> = z.number().int().min(0).max(4_294_967_295)
const Hash: z.ZodType<string> = z.string().regex(/^[0-9a-f]{16}$/, 'a hash is 16 lower-case hex digits')
const Seat: z.ZodType<number> = z.number().int().min(1).max(MAX_PLAYERS)

/** Why a room did not take a command. */
export const REFUSALS = ['too-far-ahead', 'out-of-order', 'too-many', 'not-started', 'not-valid'] as const
export type Refusal = (typeof REFUSALS)[number]

/** What a person is told when a room cannot be joined or is lost for good; `onlineWords` says each in English. */
export type OnlineProblem =
  | 'different-version'
  | 'room-full'
  | 'no-room'
  | 'server-full'
  | 'bad-room'
  | 'no-server'
  | 'lost'

/** Thrown when a room cannot be joined or the connection is lost for good. `message` is in plain words. */
export class OnlineError extends Error {
  readonly problem: OnlineProblem
  constructor(problem: OnlineProblem, message: string) {
    super(message)
    this.name = 'OnlineError'
    this.problem = problem
  }
}

/** The problems a join can be refused with, as the room writes them before the colon of its error message. */
export const ONLINE_PROBLEMS: readonly OnlineProblem[] = [
  'different-version',
  'room-full',
  'no-room',
  'server-full',
  'bad-room',
  'no-server',
  'lost',
]

/** What a client sends: a command it predicted on `tick`, or a request for the whole state. */
export type ClientMessage =
  | {
      readonly t: 'cmd'
      readonly seq: number
      readonly tick: number
      readonly type: string
      readonly payload: unknown
    }
  | { readonly t: 'sync' }

/** A command as the room carries it in a `tick` message: the whole of the sim's `Command`, `source` set by the room. */
export interface WireCommand {
  readonly tick: number
  readonly source: number
  readonly seq: number
  readonly type: string
  readonly payload: unknown
}

/** What the room sends. */
export type ServerMessage =
  | { readonly t: 'seat'; readonly seat: number; readonly code: string; readonly nextSeq: number }
  | { readonly t: 'waiting'; readonly missing: number }
  | { readonly t: 'start' }
  | {
      readonly t: 'tick'
      readonly tick: number
      readonly commands: readonly WireCommand[]
      readonly hash?: string
    }
  | { readonly t: 'refused'; readonly seq: number; readonly reason: Refusal }
  | { readonly t: 'sync'; readonly tick: number }
  | { readonly t: 'away'; readonly seat: number }
  | { readonly t: 'back'; readonly seat: number }
  /** In a co-op room: the player left for good, and their hero goes by the sim's own `leave`. Nobody is away for them. */
  | { readonly t: 'gone'; readonly seat: number }

/**
 * What a player joins with. It also describes the room it would make, so a client builds its sims before it joins,
 * and the room can check every field against its own: a player with another version of the game is refused before a
 * seat is reserved.
 */
export interface RoomOptions {
  readonly protocol: 1
  readonly framework: string
  /** The game's code shape: the sim's snapshot header value. */
  readonly schemaHash: string
  readonly contentHash: string
  readonly tickHz: number
  readonly level: string
  readonly seed: number
  /** The room starts when this many have joined. */
  readonly seats: number
}

// The schemas are strict, so a key nobody knows is an error and a forged field never reaches the room. They are
// written against the interfaces above, since the package's declarations must not depend on Zod's inferred types.
const wireCommand = z.strictObject({
  tick: U32,
  source: Seat,
  seq: U32,
  type: z.string().min(1),
  payload: z.json(),
})

const ClientMessageSchema = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('cmd'), seq: U32, tick: U32, type: z.string().min(1), payload: z.json() }),
  z.strictObject({ t: z.literal('sync') }),
]) as unknown as z.ZodType<ClientMessage>

const ServerMessageSchema = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('seat'), seat: Seat, code: z.string().min(1), nextSeq: U32 }),
  z.strictObject({ t: z.literal('waiting'), missing: z.number().int().min(1).max(MAX_PLAYERS) }),
  z.strictObject({ t: z.literal('start') }),
  z.strictObject({ t: z.literal('tick'), tick: U32, commands: z.array(wireCommand), hash: Hash.optional() }),
  z.strictObject({ t: z.literal('refused'), seq: U32, reason: z.enum(REFUSALS) }),
  z.strictObject({ t: z.literal('sync'), tick: U32 }),
  z.strictObject({ t: z.literal('away'), seat: Seat }),
  z.strictObject({ t: z.literal('back'), seat: Seat }),
  z.strictObject({ t: z.literal('gone'), seat: Seat }),
]) as unknown as z.ZodType<ServerMessage>

const RoomOptionsSchema = z.strictObject({
  protocol: z.literal(PROTOCOL_VERSION),
  framework: z.string().min(1),
  schemaHash: Hash,
  contentHash: Hash,
  tickHz: z.number().int().min(1).max(1000),
  level: z.string().min(1),
  seed: U32,
  seats: z.number().int().min(1).max(MAX_PLAYERS),
}) as unknown as z.ZodType<RoomOptions>

/** A message from a client, or `undefined` for anything that is not one. Never throws. */
export function parseClientMessage(raw: unknown): ClientMessage | undefined {
  const parsed = ClientMessageSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

/** A message from the room, or `undefined` for anything that is not one. Never throws. */
export function parseServerMessage(raw: unknown): ServerMessage | undefined {
  const parsed = ServerMessageSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

/** A player's join options, or `undefined`. Never throws. */
export function parseRoomOptions(raw: unknown): RoomOptions | undefined {
  const parsed = RoomOptionsSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

/**
 * How many seats a room of a co-op game has, or `undefined` for a game that is not one (no `players`, or just one).
 * A seat is a player number from 1, and needs a start point in the level: so it is the run of start points numbered 1,
 * 2, 3 ... up to the project's `players`, and nobody is ever seated with no hero to play. A server and a page both
 * reckon it with this, so they always agree.
 */
export function coopSeats(
  project: { readonly players?: number | undefined },
  starts: readonly { readonly player: number }[],
): number | undefined {
  const players = project.players ?? 1
  if (players < 2) return undefined
  const have = new Set(starts.map((start) => start.player))
  let seats = 0
  while (seats < players && have.has(seats + 1)) seats++
  return seats
}

/** The options for a room that plays `room.level` on `sim`'s game: every field a room checks a joiner against. */
export function roomOptionsOf(
  sim: Sim,
  room: { readonly level: string; readonly seats: number },
): RoomOptions {
  return {
    protocol: PROTOCOL_VERSION,
    framework: FRAMEWORK_VERSION,
    schemaHash: sim.describeSnapshot().header.schemaHash,
    contentHash: sim.contentHash,
    tickHz: sim.tickHz,
    level: room.level,
    seed: sim.seed,
    seats: room.seats,
  }
}
