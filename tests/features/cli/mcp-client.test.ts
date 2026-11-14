// The official MCP client (the SDK, a development dependency that only tests use) talks to the real `automata mcp`, started
// as a child process the way an agent's program starts it. If our hand-written server strays from the protocol, this is
// where the client refuses it.
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { PROTOCOL_VERSIONS } from '#src/features/cli/mcp.ts'
import { FRAMEWORK_VERSION } from '#src/features/sim/sim.ts'
import { packageText } from '../../fixtures/cli/package-files.ts'

const CLI = fileURLToPath(new URL('../../../src/cli.ts', import.meta.url))

let work: string
let client: Client

beforeAll(async () => {
  work = mkdtempSync(join(tmpdir(), 'mcp client '))
  client = new Client({ name: 'the-official-client', version: '1.0.0' })
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [CLI, 'mcp'], cwd: work, stderr: 'ignore' }),
  )
}, 60_000)

afterAll(async () => {
  await client.close()
  rmSync(work, { recursive: true, force: true })
})

/** The text of the first block of a tool's answer. */
const textOf = (answer: Awaited<ReturnType<Client['callTool']>>): string => {
  const [block] = answer.content as { type: string; text: string }[]
  return block?.text ?? ''
}

test('the protocol versions we speak are ones the official client knows, and the newest is its newest', () => {
  for (const version of PROTOCOL_VERSIONS) expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(version)
  expect(PROTOCOL_VERSIONS[0]).toBe(LATEST_PROTOCOL_VERSION)
})

test('the official client connects, and is told our name, our version and our two capabilities', () => {
  expect(client.getServerVersion()).toMatchObject({ name: 'automata', version: FRAMEWORK_VERSION })
  expect(client.getServerCapabilities()).toMatchObject({ tools: {}, resources: {} })
})

test('the official client lists the eleven tools, and reads a tool that needs no game', {
  timeout: 60_000,
}, async () => {
  const { tools } = await client.listTools()
  expect(tools.map((tool) => tool.name)).toEqual([
    'create',
    'check',
    'replay',
    'content_types',
    'schema',
    'skill',
    'play_start',
    'play_step',
    'play_state',
    'play_save',
    'play_stop',
  ])
  const level = await client.callTool({ name: 'schema', arguments: { type: 'level' } })
  expect(JSON.parse(textOf(level))).toEqual(JSON.parse(packageText('schemas/level.schema.json')))
})

test('the official client reads the resources the server lists', { timeout: 60_000 }, async () => {
  const { resources } = await client.listResources()
  expect(resources.map((resource) => resource.uri)).toContain('automata://schemas/replay')
  const read = await client.readResource({ uri: 'automata://skills/automata-rules' })
  expect(read.contents[0]).toMatchObject({
    uri: 'automata://skills/automata-rules',
    mimeType: 'text/markdown',
    text: packageText('skills/automata-rules/SKILL.md'),
  })
})

test('a game is made and its files checked through the real command, and a game that is not installed says so when played', {
  timeout: 120_000,
}, async () => {
  const made = await client.callTool({ name: 'create', arguments: { folder: 'made-game' } })
  expect(made.isError).toBeFalsy()
  expect(existsSync(join(work, 'made-game', 'automata.toml'))).toBe(true)
  expect(JSON.parse(textOf(made)).files).toContain('automata.toml')

  const checked = await client.callTool({ name: 'check', arguments: { folder: 'made-game', only: 'files' } })
  expect(checked.isError).toBeFalsy()
  expect(JSON.parse(textOf(checked))).toMatchObject({ ok: true })

  const played = await client.callTool({ name: 'play_start', arguments: { folder: 'made-game' } })
  expect(played.isError).toBe(true)
  expect(textOf(played)).toMatch(
    /^This game's tools are not installed yet\. Run npm install in made-game, then try again\.$/,
  )

  const nowhere = await client.callTool({ name: 'check', arguments: { folder: 'nowhere' } })
  expect(nowhere.isError).toBe(true)
  expect(textOf(nowhere)).toMatch(/^nowhere is not a game: it has no automata\.toml\./)
})
