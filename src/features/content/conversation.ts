import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import { englishLacks, englishMissing } from './messages.ts'
import { MessageKey, noSuch, unique } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** One thing a player may say or pick, and where the conversation goes next. */
export interface Choice {
  readonly line: string
  readonly next: string
}

/** One step of a conversation: someone says lines, then the player picks, or it goes on, or it ends. */
export interface ConversationNode {
  readonly id: string
  /** The character who says the lines. */
  readonly speaker?: string | undefined
  /** Message keys, said in order. */
  readonly lines: readonly string[]
  readonly choices?: readonly Choice[] | undefined
  /** The node that follows. A node with neither `choices` nor `next` ends the conversation. */
  readonly next?: string | undefined
}

/** A conversation file once read: nodes that say lines by key, then offer choices or go on. */
export interface ConversationFile {
  readonly format: 1
  readonly id: string
  /** The node it opens on. */
  readonly start: string
  readonly nodes: readonly ConversationNode[]
}

const choice = z.strictObject({
  line: MessageKey.describe('What the player says, as a message key, like "keeper.ask".'),
  next: Id.describe('The node it leads to.'),
})

const node = z.strictObject({
  id: Id.describe('A name for this node, like "hello".'),
  speaker: Id.optional().describe('The character who says the lines, by id, like "keeper".'),
  lines: z.array(MessageKey).min(1).max(8).describe('What is said, as message keys, in order.'),
  choices: z
    .array(choice)
    .min(2)
    .max(4)
    .optional()
    .describe('What the player may pick. Left out means no choice.'),
  next: Id.optional().describe('The node that follows. Left out, with no choices, ends the conversation.'),
})

/** The sentence for a node that is not there. */
const noNode = (id: string, nodes: readonly ConversationNode[]): string =>
  noSuch(
    'node',
    id,
    nodes.map((n) => n.id),
    'This conversation',
  )

/** Finds the loops of `next` links with no choice in them, once each, and says the first node of each in file order. */
function loops(nodes: readonly ConversationNode[]): { at: number; ids: string[] }[] {
  const byId = new Map<string, number>()
  nodes.forEach((n, i) => {
    if (!byId.has(n.id)) byId.set(n.id, i)
  })
  const found: { at: number; ids: string[] }[] = []
  nodes.forEach((first, i) => {
    if (first.choices !== undefined || first.next === undefined) return
    const walk = [i]
    let at = byId.get(first.next)
    while (at !== undefined) {
      if (at === i) {
        // Reported only from the first node of the loop in file order, so each loop is said once.
        if (Math.min(...walk) === i)
          found.push({ at: i, ids: walk.map((w) => (nodes[w] as ConversationNode).id) })
        return
      }
      const here = nodes[at] as ConversationNode
      if (walk.includes(at) || here.choices !== undefined || here.next === undefined) return
      walk.push(at)
      at = byId.get(here.next)
    }
  })
  return found
}

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkConversation(file: Partial<ConversationFile>, ctx: z.core.$RefinementCtx): void {
  const nodes = file.nodes ?? []
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  unique(nodes, 'id', 'node', ['nodes'], ctx)
  const known = new Set(nodes.map((n) => n.id))
  const pointedAt = new Set<string>()
  if (file.start !== undefined && !known.has(file.start)) add(['start'], noNode(file.start, nodes))
  nodes.forEach((n, i) => {
    if (n.choices !== undefined && n.next !== undefined)
      add(['nodes', i], 'A node has choices or a "next", not both.')
    if (n.next !== undefined) {
      pointedAt.add(n.next)
      if (!known.has(n.next)) add(['nodes', i, 'next'], noNode(n.next, nodes))
    }
    n.choices?.forEach((c, j) => {
      pointedAt.add(c.next)
      if (!known.has(c.next)) add(['nodes', i, 'choices', j, 'next'], noNode(c.next, nodes))
    })
  })
  nodes.forEach((n, i) => {
    if (n.id !== file.start && !pointedAt.has(n.id))
      add(['nodes', i], 'Nothing leads to this node. Remove it, or point a "next" or a choice at it.')
  })
  for (const loop of loops(nodes))
    add(
      ['nodes', loop.at, 'next'],
      `This goes round and round with no choice and no end: ${[...loop.ids, loop.ids[0]].join(', then ')}. Give one of them a choice, or remove a "next".`,
    )
}

/** Speakers must be characters, and every line and choice must be in English. */
function checkNames(file: ConversationFile, game: Listed, report: Report): void {
  file.nodes.forEach((n, i) => {
    if (n.speaker !== undefined && !game.has('character', n.speaker))
      report(`nodes[${i}].speaker`, noSuch('character', n.speaker, game.ids('character')))
    n.lines.forEach((key, j) => {
      if (englishLacks(game, key)) report(`nodes[${i}].lines[${j}]`, englishMissing(key))
    })
    n.choices?.forEach((c, j) => {
      if (englishLacks(game, c.line)) report(`nodes[${i}].choices[${j}].line`, englishMissing(c.line))
    })
  })
}

/** The rules for a conversation file; unknown keys are refused. */
export const ConversationSchema: z.ZodType<ConversationFile, ConversationFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this conversation, like "keeper". It matches the file name.'),
    start: Id.describe('The node it opens on, by id, like "hello".'),
    nodes: z.array(node).min(1).max(128).describe('The steps of the conversation.'),
  })
  .superRefine(checkConversation)

/** The conversation's row of the content table. */
export const conversationInfo: ContentTypeInfo<ConversationFile, ConversationFile> = {
  schema: ConversationSchema,
  title: 'Conversation',
  plural: 'conversations',
  editor: 'story',
  part: 'writer',
  noun: 'conversation',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the conversation a name like "keeper".',
    start: 'Write the id of the node it opens on, like "hello".',
    nodes: 'List at least one node, each with an id and its lines.',
    'nodes.id': 'Give the node a name like "hello".',
    'nodes.lines': 'List what is said as message keys, like ["keeper.hello"].',
    'nodes.choices.line': 'Write what the player says, as a message key, like "keeper.ask".',
    'nodes.choices.next': 'Write which node the choice leads to, like "bye".',
  },
  check: checkNames,
}
