// `automata mcp`: a Model Context Protocol server over standard input and output, written by hand on JSON-RPC 2.0
// (Owner's answer to Q1, 2026-11-14: our own server, with the official SDK only as a development dependency that
// checks it in a test). One JSON message per line each way, as the specification's stdio transport says. The server
// never loads a game's code itself (audit C1): the tools run it in a child process or a Worker.
import { Effect, type Layer } from 'effect'
import { z } from '../../lib/zod.ts'
import { FRAMEWORK_VERSION } from '../sim/sim.ts'
import { readResource, resources } from './mcp-library.ts'
import { type McpTool, mcpTools } from './mcp-tools.ts'
import type { Ports } from './ports.ts'
import { createSessions } from './session.ts'
import { printToStderr } from './stderr.ts'

/** The protocol versions this server speaks, newest first. A client asking for another is answered with the first. */
export const PROTOCOL_VERSIONS: readonly string[] = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

/** JSON-RPC's own error numbers, and the MCP specification's for a resource that is not there. */
const NOT_JSON = -32700
const BAD_REQUEST = -32600
const NO_METHOD = -32601
const BAD_INPUT = -32602
const NO_RESOURCE = -32002

type Id = string | number

const result = (id: Id, value: unknown): string => JSON.stringify({ jsonrpc: '2.0', id, result: value })
const failure = (id: Id | null, code: number, message: string): string =>
  JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** What is wrong with a tool's input, in a sentence: the first few places and what each needs. */
function inputProblem(tool: string, error: z.ZodError): string {
  const places = error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || 'the input'}: ${issue.message}`)
  return `The input for ${tool} is not right. ${places.join('. ')}.`
}

/** A tool's JSON Schema, for `tools/list`. */
const schemaOfInput = (tool: McpTool): unknown => {
  const { $schema: _, ...schema } = z.toJSONSchema(tool.inputSchema, { io: 'input' })
  return schema
}

/**
 * Answers every line of `input` with lines through `write`, until the input ends, then ends every play session.
 * `layer` is what the commands behind the tools reach the world through.
 */
export async function serveMcp(
  input: AsyncIterable<string>,
  write: (line: string) => void,
  layer: Layer.Layer<Ports>,
): Promise<void> {
  const sessions = createSessions()
  const tools = mcpTools(sessions)
  const schemas = new Map(tools.map((tool) => [tool.name, schemaOfInput(tool)]))
  const restore = printToStderr()
  const run = <A, E>(effect: Effect.Effect<A, E, Ports>): Promise<A> =>
    Effect.runPromise(Effect.provide(effect, layer))

  /** A `tools/call`: the tool's own answer, or the sentence it stopped on, as a result an agent reads. */
  async function call(id: Id, params: Record<string, unknown>): Promise<string> {
    const tool = tools.find((one) => one.name === params.name)
    if (tool === undefined)
      return failure(
        id,
        BAD_INPUT,
        `There is no tool called "${String(params.name)}". The tools are: ${tools.map((one) => one.name).join(', ')}.`,
      )
    const parsed = tool.inputSchema.safeParse(params.arguments ?? {})
    if (!parsed.success) return failure(id, BAD_INPUT, inputProblem(tool.name, parsed.error))
    const text = (value: string, isError: boolean): string =>
      result(id, { content: [{ type: 'text', text: value }], ...(isError ? { isError } : {}) })
    try {
      const answer = await run(Effect.either(tool.run(parsed.data)))
      if (answer._tag === 'Left') return text(answer.left.message, true)
      return text(answer.right.text, answer.right.isError === true)
    } catch (defect) {
      const reason = defect instanceof Error ? defect.message : String(defect)
      return text(`Something went wrong inside automata. Please report this:\n${reason}`, true)
    }
  }

  async function respond(id: Id, method: string, params: Record<string, unknown>): Promise<string> {
    switch (method) {
      case 'initialize': {
        const asked = params.protocolVersion
        return result(id, {
          protocolVersion:
            typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'automata', version: FRAMEWORK_VERSION },
        })
      }
      case 'ping':
        return result(id, {})
      case 'tools/list':
        return result(id, {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: schemas.get(tool.name),
          })),
        })
      case 'tools/call':
        return call(id, params)
      case 'resources/list': {
        const listed = await run(Effect.either(resources()))
        return listed._tag === 'Left'
          ? failure(id, BAD_INPUT, listed.left.message)
          : result(id, { resources: listed.right })
      }
      case 'resources/read': {
        const uri = params.uri
        if (typeof uri !== 'string')
          return failure(id, BAD_INPUT, 'resources/read needs a uri, like automata://schemas/level.')
        const read = await run(Effect.either(readResource(uri)))
        if (read._tag === 'Left') return failure(id, BAD_INPUT, read.left.message)
        return read.right === undefined
          ? failure(id, NO_RESOURCE, `There is no resource called "${uri}". resources/list names them all.`)
          : result(id, { contents: [read.right] })
      }
      default:
        return failure(id, NO_METHOD, `automata mcp does not know the method "${method}".`)
    }
  }

  /** One line in: the line to answer with, or nothing for a notification. */
  async function line(text: string): Promise<string | undefined> {
    let message: unknown
    try {
      message = JSON.parse(text)
    } catch {
      return failure(null, NOT_JSON, 'That line is not JSON. Send one JSON-RPC message on each line.')
    }
    if (!isRecord(message) || typeof message.method !== 'string') {
      // An answer from the client to something it was asked is not ours to answer; anything else is not a message.
      return isRecord(message) && ('result' in message || 'error' in message)
        ? undefined
        : failure(null, BAD_REQUEST, 'That is not a JSON-RPC request. It needs a "method" and an "id".')
    }
    const id = message.id
    if (typeof id !== 'string' && typeof id !== 'number') return undefined // a notification: no answer, whatever it is
    return respond(id, message.method, isRecord(message.params) ? message.params : {})
  }

  try {
    for await (const text of input) {
      if (text.trim() === '') continue
      const answer = await line(text)
      if (answer !== undefined) write(answer)
    }
  } finally {
    restore()
    await Effect.runPromise(sessions.stopAll())
  }
}
