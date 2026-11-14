// A conversation with `automata mcp`: messages in, the lines it answered with, parsed.
import type { Layer } from 'effect'
import { serveMcp } from '#src/features/cli/mcp.ts'
import type { Ports } from '#src/features/cli/ports.ts'

export interface Reply {
  readonly jsonrpc: string
  readonly id: unknown
  readonly result?: Record<string, unknown>
  readonly error?: { readonly code: number; readonly message: string }
}

/** A request. */
export const rpc = (id: number, method: string, params?: object): object => ({
  jsonrpc: '2.0',
  id,
  method,
  ...(params === undefined ? {} : { params }),
})

/** A `tools/call` request. */
export const call = (id: number, name: string, args: object = {}): object =>
  rpc(id, 'tools/call', { name, arguments: args })

/** Sends each message (text as it is, an object as JSON) as a line, until the input ends, and gives every line back. */
export async function talk(
  layer: Layer.Layer<Ports>,
  messages: readonly (string | object)[],
): Promise<Reply[]> {
  const replies: Reply[] = []
  async function* lines(): AsyncGenerator<string> {
    for (const message of messages) yield typeof message === 'string' ? message : JSON.stringify(message)
  }
  await serveMcp(lines(), (line) => void replies.push(JSON.parse(line) as Reply), layer)
  return replies
}

/** The one reply of a one-message conversation. */
export async function ask(layer: Layer.Layer<Ports>, message: string | object): Promise<Reply> {
  const [reply] = await talk(layer, [message])
  if (reply === undefined) throw new Error('There was no reply.')
  return reply
}

/** A tool's text block, and whether it says something is wrong. */
export const answerOf = (reply: Reply): { text: string; isError: boolean } => {
  const content = reply.result?.content as { type: string; text: string }[] | undefined
  return { text: content?.[0]?.text ?? '', isError: reply.result?.isError === true }
}

/** What `resources/read` gave. */
export const contentsOf = (reply: Reply): { uri: string; mimeType: string; text: string }[] =>
  (reply.result?.contents ?? []) as { uri: string; mimeType: string; text: string }[]

/** What `tools/list` gave. */
export const toolsOf = (
  reply: Reply,
): { name: string; description: string; inputSchema: { type: string } }[] =>
  (reply.result?.tools ?? []) as { name: string; description: string; inputSchema: { type: string } }[]
