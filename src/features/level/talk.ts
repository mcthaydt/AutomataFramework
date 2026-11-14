// Where a conversation goes next, as plain values: no sim. `story.ts` keeps the place in the `Story` resource, and the
// page's box reads it back to know whether to show a line, the choices, or nothing.
import type { ConversationFile, ConversationNode } from '../content/content.ts'

/** One line of one node: where a conversation is up to. */
export interface TalkPlace {
  readonly node: string
  /** Which of the node's lines, from 0. */
  readonly line: number
}

/** The node with this id, or undefined when the file has none (the content checks stop that, so it means "end"). */
function nodeOf(file: ConversationFile, id: string): ConversationNode | undefined {
  return file.nodes.find((node) => node.id === id)
}

/** The first line of the node a conversation opens on. */
export function openAt(file: ConversationFile): TalkPlace {
  return { node: file.start, line: 0 }
}

/**
 * What follows the line at `place`: the node's next line; `'pick'` after its last line when it has choices; the first
 * line of the node it goes on to; or `'end'`. A node the file does not have is the end.
 */
export function nextPlace(file: ConversationFile, place: TalkPlace): TalkPlace | 'pick' | 'end' {
  const node = nodeOf(file, place.node)
  if (node === undefined) return 'end'
  if (place.line + 1 < node.lines.length) return { node: node.id, line: place.line + 1 }
  if (node.choices !== undefined && node.choices.length > 0) return 'pick'
  if (node.next !== undefined) return { node: node.next, line: 0 }
  return 'end'
}

/**
 * Where choice `choice` (0 is the first) leads. Undefined unless `place` is the last line of a node that offers that
 * choice, so a pick that was never offered changes nothing.
 */
export function choosePlace(file: ConversationFile, place: TalkPlace, choice: number): TalkPlace | undefined {
  const node = nodeOf(file, place.node)
  if (node === undefined || place.line !== node.lines.length - 1) return undefined
  if (!Number.isInteger(choice)) return undefined
  const picked = node.choices?.[choice]
  return picked === undefined ? undefined : { node: picked.next, line: 0 }
}
