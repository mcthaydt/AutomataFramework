// What the sim keeps of a story, the three commands a player sends it and the six events it tells the page. Nothing here
// moves anything: `story.ts` has the systems. Only a game with a conversation or a cutscene gets the plugin that
// registers these, so every other game's recorded hashes stay as they were.
import { z } from '../../lib/zod.ts'
import {
  type Command,
  type CommandDef,
  defineCommand,
  defineEvent,
  defineResource,
  type EventDef,
  type ResourceDef,
} from '../sim/sim.ts'

/** A conversation that is open: who opened it, with which thing, and which line it is up to. */
export interface StoryTalk {
  readonly conversation: string
  /** The player it is with: the only one whose commands move it. */
  readonly player: number
  /** The sid of the thing talked to, or 0 when game code opened it with none (sids start at 1). */
  readonly thing: number
  readonly node: string
  readonly line: number
}

/** A cutscene that is playing, and the tick it started. */
export interface StoryScene {
  readonly cutscene: string
  readonly since: number
}

/**
 * The story's whole state, kept as a resource: it is in every snapshot and every hash, so a rollback or a restored run
 * is in the same conversation or cutscene, on the same line, as the straight one.
 */
export interface StoryState {
  /** The level that is open. */
  level: string
  talk: StoryTalk | null
  scene: StoryScene | null
  /** What each held player is really holding, by player number, while their hands are held (see `story.ts`). */
  hands: Record<string, string>
  /** `'<thing sid>:<player>'` for every pair within reach last tick, sorted. */
  met: string[]
  /** For each conversation, the node it last finished on. */
  ended: Record<string, string>
  /** The cutscenes that have ended, sorted. */
  seen: string[]
}

const talkSchema: z.ZodType<StoryTalk, StoryTalk> = z.strictObject({
  conversation: z.string(),
  player: z.number().int().min(0),
  thing: z.number().int().min(0),
  node: z.string(),
  line: z.number().int().min(0),
})
const sceneSchema: z.ZodType<StoryScene, StoryScene> = z.strictObject({
  cutscene: z.string(),
  since: z.number().int().min(0),
})
const stateSchema: z.ZodType<StoryState, StoryState> = z.strictObject({
  level: z.string(),
  talk: talkSchema.nullable(),
  scene: sceneSchema.nullable(),
  hands: z.record(z.string(), z.string()),
  met: z.array(z.string()),
  ended: z.record(z.string(), z.string()),
  seen: z.array(z.string()),
})

/** The story's state: id `story`. */
export const Story: ResourceDef<z.ZodType<StoryState, StoryState>> = defineResource(
  'story',
  stateSchema,
  () => ({ level: '', talk: null, scene: null, hands: {}, met: [], ended: {}, seen: [] }),
)

/** How close a hero's middle must be to a thing's middle to talk to it, in tiles. */
export const TALK_REACH = 1.5
/** A cutscene has to have played this many ticks before a player can skip it, so a press meant for something else does not. */
export const SKIP_AFTER = 30

const noPayload: z.ZodObject<Record<string, never>, z.core.$strict> = z.strictObject({})
const choicePayload: z.ZodObject<{ choice: z.ZodNumber }, z.core.$strict> = z.strictObject({
  choice: z.number().int().min(0).max(3),
})

/** The player says the next line. A press that has nowhere to go does nothing. */
export const NextCommand: CommandDef<typeof noPayload> = defineCommand('story.next', noPayload)
/** The player picks one of the choices, from 0. */
export const ChooseCommand: CommandDef<typeof choicePayload> = defineCommand('story.choose', choicePayload)
/** The player skips the cutscene that is playing, once it has played `SKIP_AFTER` ticks. */
export const SkipCommand: CommandDef<typeof noPayload> = defineCommand('story.skip', noPayload)

/** The command for `player` at `tick`; `seq` goes up by one per command that player sends. */
export function nextCommand(tick: number, player: number, seq: number): Command {
  return { tick, source: player, seq, type: NextCommand.id, payload: {} }
}
/** The command for `player` to pick choice `choice` (from 0). */
export function chooseCommand(tick: number, player: number, seq: number, choice: number): Command {
  return { tick, source: player, seq, type: ChooseCommand.id, payload: { choice } }
}
/** The command for `player` to skip the cutscene. */
export function skipCommand(tick: number, player: number, seq: number): Command {
  return { tick, source: player, seq, type: SkipCommand.id, payload: {} }
}

/** What each event says. `thing` and `speaker` are ids, and '' when there is none. */
export interface ConversationStartedPayload {
  readonly conversation: string
  readonly player: number
  readonly thing: string
}
export interface ConversationSaidPayload {
  readonly conversation: string
  readonly node: string
  /** The message key of the line. */
  readonly line: string
  readonly speaker: string
}
export interface ConversationChosenPayload {
  readonly conversation: string
  readonly node: string
  readonly choice: number
  /** The message key of the choice. */
  readonly line: string
  readonly player: number
}
export interface ConversationEndedPayload {
  readonly conversation: string
  readonly node: string
  readonly player: number
  /** False when it was cut short: the hero or the thing went away, or a game's code started something else. */
  readonly finished: boolean
}
export interface CutsceneStartedPayload {
  readonly cutscene: string
}
export interface CutsceneEndedPayload {
  readonly cutscene: string
  readonly skipped: boolean
}

const startedSchema: z.ZodType<ConversationStartedPayload, ConversationStartedPayload> = z.strictObject({
  conversation: z.string(),
  player: z.number().int(),
  thing: z.string(),
})
const saidSchema: z.ZodType<ConversationSaidPayload, ConversationSaidPayload> = z.strictObject({
  conversation: z.string(),
  node: z.string(),
  line: z.string(),
  speaker: z.string(),
})
const chosenSchema: z.ZodType<ConversationChosenPayload, ConversationChosenPayload> = z.strictObject({
  conversation: z.string(),
  node: z.string(),
  choice: z.number().int(),
  line: z.string(),
  player: z.number().int(),
})
const endedSchema: z.ZodType<ConversationEndedPayload, ConversationEndedPayload> = z.strictObject({
  conversation: z.string(),
  node: z.string(),
  player: z.number().int(),
  finished: z.boolean(),
})
const sceneStartedSchema: z.ZodType<CutsceneStartedPayload, CutsceneStartedPayload> = z.strictObject({
  cutscene: z.string(),
})
const sceneEndedSchema: z.ZodType<CutsceneEndedPayload, CutsceneEndedPayload> = z.strictObject({
  cutscene: z.string(),
  skipped: z.boolean(),
})

export const ConversationStarted: EventDef<typeof startedSchema> = defineEvent(
  'conversation.started',
  startedSchema,
)
export const ConversationSaid: EventDef<typeof saidSchema> = defineEvent('conversation.said', saidSchema)
export const ConversationChosen: EventDef<typeof chosenSchema> = defineEvent(
  'conversation.chosen',
  chosenSchema,
)
export const ConversationEnded: EventDef<typeof endedSchema> = defineEvent('conversation.ended', endedSchema)
export const CutsceneStarted: EventDef<typeof sceneStartedSchema> = defineEvent(
  'cutscene.started',
  sceneStartedSchema,
)
export const CutsceneEnded: EventDef<typeof sceneEndedSchema> = defineEvent(
  'cutscene.ended',
  sceneEndedSchema,
)

/** What a save keeps of a story, and what a game hands back when it continues. */
export interface StoryProgress {
  /** For each conversation, the node it last finished on. */
  readonly ended: Readonly<Record<string, string>>
  /** The cutscenes that have ended. A cutscene in here does not open its level again. */
  readonly seen: readonly string[]
}

/** `StoryProgress` as the one place that checks it: a save, and a replay's `meta.story`. */
export const StoryProgressSchema: z.ZodType<StoryProgress, StoryProgress> = z.strictObject({
  ended: z.record(z.string(), z.string()),
  seen: z.array(z.string()),
})
