// What a page or a save reads of the story, from the sim's own state: plain values, no sim writes. Each gives
// `undefined` (or nothing played) for a game with no story, so a caller need not know whether the plugin is in.
import type { GameContent } from '../content/content.ts'
import type { Sim } from '../sim/sim.ts'
import { Story } from './story-state.ts'
import { usesStory } from './story.ts'

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
