// What a page or a save reads of the story, from the sim's own state: plain values, no sim writes. Each gives
// `undefined` (or nothing played) for a game with no story, so a caller need not know whether the plugin is in.
import type { Replay } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import type { Sim } from '../sim/sim.ts'
import { usesStory } from './story.ts'
import { Story, type StoryProgress, StoryProgressSchema } from './story-state.ts'
import { cameraAt, linesAt, type SceneCamera } from './timeline.ts'

/** What the speech box shows: who says which line, and what the player may pick now. */
export interface TalkView {
  readonly conversation: string
  /** The player the conversation is with. */
  readonly player: number
  /** A character id, or undefined when the node names no speaker. */
  readonly speaker: string | undefined
  /** The message key of the line. */
  readonly line: string
  /** Message keys, in order; empty unless the player must pick now (after the last line of a node with choices). */
  readonly choices: readonly string[]
}

/** The conversation that is open, as the box shows it, or undefined when none is. */
export function talkOf(sim: Sim, content: GameContent): TalkView | undefined {
  if (!usesStory(content)) return undefined
  const talk = sim.resource(Story).talk
  if (talk === null) return undefined
  const node = content.conversations?.[talk.conversation]?.nodes.find((n) => n.id === talk.node)
  const line = node?.lines[talk.line]
  if (node === undefined || line === undefined) return undefined
  const choosing = talk.line === node.lines.length - 1
  return {
    conversation: talk.conversation,
    player: talk.player,
    speaker: node.speaker,
    line,
    choices: choosing ? (node.choices ?? []).map((c) => c.line) : [],
  }
}

/** What the page shows of a cutscene that is playing: how far along it is, where the camera is, and what is said. */
export interface SceneView {
  readonly cutscene: string
  /** Ticks since it started, and how long it lasts. */
  readonly t: number
  readonly length: number
  readonly camera: SceneCamera
  readonly lines: readonly { readonly speaker: string | undefined; readonly line: string }[]
}

/** The cutscene that is playing, as the page shows it, or undefined when none is. */
export function sceneOf(sim: Sim, content: GameContent): SceneView | undefined {
  if (!usesStory(content)) return undefined
  const scene = sim.resource(Story).scene
  const file = scene === null ? undefined : content.cutscenes?.[scene.cutscene]
  if (scene === null || file === undefined) return undefined
  const t = sim.tick - scene.since
  return {
    cutscene: scene.cutscene,
    t,
    length: file.length,
    camera: cameraAt(file, t),
    lines: linesAt(file, t).map(({ speaker, line }) => ({ speaker, line })),
  }
}

/** What a save keeps of the story: the node each conversation last finished on, and the cutscenes seen. */
export function storyProgress(sim: Sim, content: GameContent): StoryProgress {
  if (!usesStory(content)) return { ended: {}, seen: [] }
  const { ended, seen } = sim.resource(Story)
  return { ended: { ...ended }, seen: [...seen] }
}

/**
 * The progress a replay was recorded from (its `meta.story`, written by `startGame` for a game that continued), or
 * `undefined` for a fresh start or a value that is not progress: the replay is then played from the start, as ever.
 */
export function storyOfReplay(replay: Replay): StoryProgress | undefined {
  const text = replay.meta.story
  if (text === undefined) return undefined
  try {
    const read = StoryProgressSchema.safeParse(JSON.parse(text))
    return read.success ? read.data : undefined
  } catch {
    return undefined
  }
}
