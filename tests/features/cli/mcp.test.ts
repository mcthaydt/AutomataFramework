// `automata mcp`'s protocol: lines in, lines out, on the memory layer.
import { expect, test, vi } from 'vitest'
import { PROTOCOL_VERSIONS } from '#src/features/cli/mcp.ts'
import type { GameCode } from '#src/features/cli/ports.ts'
import { definePlugin, defineSystem, FRAMEWORK_VERSION } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { answerOf, ask, call, contentsOf, rpc, talk } from '../../fixtures/cli/mcp.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'
import { packageFilesInMemory, packageText } from '../../fixtures/cli/package-files.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const empty = () => memoryLayer({})
const initialize = (version: string) =>
  rpc(1, 'initialize', {
    protocolVersion: version,
    capabilities: {},
    clientInfo: { name: 'test', version: '1' },
  })

test('initialize answers with a version the client asked for, our name and both capabilities', async () => {
  for (const version of PROTOCOL_VERSIONS) {
    const reply = await ask(empty().layer, initialize(version))
    expect(reply.id).toBe(1)
    expect(reply.result).toEqual({
      protocolVersion: version,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: 'automata', version: FRAMEWORK_VERSION },
    })
  }
})

test('a version we do not know gets our newest', async () => {
  const reply = await ask(empty().layer, initialize('1999-01-01'))
  expect(reply.result?.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
})

test('ping answers with an empty result', async () => {
  expect((await ask(empty().layer, rpc(7, 'ping'))).result).toEqual({})
})

test('a notification gets no line back, whatever it is', async () => {
  const replies = await talk(empty().layer, [
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', method: 'notifications/something-we-never-heard-of', params: { a: 1 } },
    rpc(2, 'ping'),
  ])
  expect(replies.map((reply) => reply.id)).toEqual([2])
})

test('a line that is not JSON, an unknown method, an unknown tool and wrong arguments each get their error, and the next line is still answered', async () => {
  const replies = await talk(empty().layer, [
    'this is not json',
    rpc(1, 'no/such/method'),
    call(2, 'no_such_tool'),
    call(3, 'check', { folder: 5 }),
    '[{"jsonrpc":"2.0","id":4,"method":"ping"}]',
    '{"jsonrpc":"2.0","id":5}',
    rpc(6, 'ping'),
  ])
  expect(replies.map((reply) => [reply.id, reply.error?.code])).toEqual([
    [null, -32700],
    [1, -32601],
    [2, -32602],
    [3, -32602],
    [null, -32600],
    [null, -32600],
    [6, undefined],
  ])
  expect(replies[1]?.error?.message).toBe('automata mcp does not know the method "no/such/method".')
  expect(replies[2]?.error?.message).toMatch(
    /^There is no tool called "no_such_tool"\. The tools are: create, check, /,
  )
  expect(replies[3]?.error?.message).toMatch(/^The input for check is not right\. folder: /)
})

test('an answer from the client to something it was asked is let be', async () => {
  const replies = await talk(empty().layer, [{ jsonrpc: '2.0', id: 9, result: {} }, rpc(2, 'ping')])
  expect(replies.map((reply) => reply.id)).toEqual([2])
})

test('resources/list has a schema per kind and a text per skill, and resources/read gives each', async () => {
  const memory = memoryLayer(packageFilesInMemory())
  const listed = await ask(memory.layer, rpc(1, 'resources/list'))
  const resources = listed.result?.resources as {
    uri: string
    mimeType: string
    name: string
    description: string
  }[]
  const uris = resources.map((resource) => resource.uri)
  expect(uris).toEqual(
    expect.arrayContaining([
      'automata://schemas/level',
      'automata://schemas/character',
      'automata://schemas/replay',
      'automata://skills/automata',
      'automata://skills/automata-content',
    ]),
  )
  expect(resources.filter((r) => r.uri.startsWith('automata://schemas/'))).toHaveLength(15)
  expect(resources.filter((r) => r.uri.startsWith('automata://skills/'))).toHaveLength(4)
  for (const resource of resources) {
    expect(resource.name, resource.uri).not.toBe('')
    expect(resource.description, resource.uri).not.toBe('')
    expect(resource.mimeType).toBe(
      resource.uri.startsWith('automata://schemas/') ? 'application/schema+json' : 'text/markdown',
    )
  }
  const level = await ask(memory.layer, rpc(2, 'resources/read', { uri: 'automata://schemas/level' }))
  expect(JSON.parse(contentsOf(level)[0]?.text ?? '')).toEqual(
    JSON.parse(packageText('schemas/level.schema.json')),
  )
  const skill = await ask(memory.layer, rpc(3, 'resources/read', { uri: 'automata://skills/automata-rules' }))
  expect(contentsOf(skill)[0]?.text).toBe(packageText('skills/automata-rules/SKILL.md'))
})

test('resources/read of an address nobody has is an error that says so, and of no address is a refusal', async () => {
  const memory = memoryLayer(packageFilesInMemory())
  const replies = await talk(memory.layer, [
    rpc(1, 'resources/read', { uri: 'automata://schemas/nothing' }),
    rpc(2, 'resources/read', {}),
  ])
  expect(replies[0]?.error).toEqual({
    code: -32002,
    message: 'There is no resource called "automata://schemas/nothing". resources/list names them all.',
  })
  expect(replies[1]?.error?.code).toBe(-32602)
})

test('console.log from inside the rules reaches stderr, never the output lines, and is put back after', async () => {
  const noisy = definePlugin({
    name: 'noisy',
    dependsOn: ['commands'],
    systems: [
      defineSystem({
        name: 'noisy.say',
        phase: 'gameplay',
        run() {
          console.log('the rules said hello')
        },
      }),
    ],
  })
  const code: GameCode = {
    framework,
    rules: { plugins: [heroPlugin, noisy], actions: ['left', 'right', 'jump'] },
  }
  const memory = memoryLayer(under('game', smallGame()), { code })
  const written: string[] = []
  const before = console.log
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    written.push(String(chunk))
    return true
  })
  try {
    const replies = await talk(memory.layer, [
      call(1, 'play_start', { folder: 'game' }),
      call(2, 'play_step', { session: 's1', ticks: 2 }),
      call(3, 'play_stop', { session: 's1' }),
    ])
    // Every line that came out is a JSON-RPC answer (`talk` parsed them), and the three tools answered.
    expect(replies.map((reply) => answerOf(reply).isError)).toEqual([false, false, false])
    expect(written.join('')).toContain('the rules said hello\n')
    expect(console.log).toBe(before)
  } finally {
    spy.mockRestore()
  }
})
