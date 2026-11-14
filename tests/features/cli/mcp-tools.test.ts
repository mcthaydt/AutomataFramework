// The tools `automata mcp` offers, spoken to through the server on the memory layer.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect, Layer } from 'effect'
import { expect, test } from 'vitest'
import { COMMAND_NAMES } from '#src/features/cli/args.ts'
import { SCHEMA_TYPES } from '#src/features/cli/mcp-library.ts'
import { mcpTools } from '#src/features/cli/mcp-tools.ts'
import { type GameCode, Runner } from '#src/features/cli/ports.ts'
import { createSessions } from '#src/features/cli/session.ts'
import * as framework from '#src/headless.ts'
import { gamePlugins } from '../../../template/src/headless.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { answerOf, ask, call, rpc, talk, toolsOf } from '../../fixtures/cli/mcp.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { packageFilesInMemory, packageText } from '../../fixtures/cli/package-files.ts'
import { templateInMemory } from '../../fixtures/cli/template.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const ACTIONS = ['left', 'right', 'jump']
const heroCode: GameCode = { framework, rules: { plugins: [heroPlugin], actions: ACTIONS } }
const templateCode: GameCode = { framework, rules: { plugins: gamePlugins } }

/** A game at `game/` with a test file (so the tests step has something to run), and what the package ships. */
const gameMemory = (more: Record<string, string> = {}): Memory =>
  memoryLayer(
    {
      ...under('game', { ...smallGame(), 'tests/hero.test.ts': 'export {}\n', ...more }),
      ...packageFilesInMemory(),
    },
    { code: heroCode },
  )

test('tools/list has these tools, each with a description and an object schema', async () => {
  const reply = await ask(gameMemory().layer, rpc(1, 'tools/list'))
  expect(toolsOf(reply).map((tool) => tool.name)).toEqual([
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
  for (const tool of toolsOf(reply)) {
    expect(tool.inputSchema.type, tool.name).toBe('object')
    // One plain sentence that says when to use the tool.
    expect(tool.description, tool.name).toMatch(/^[A-Z][^\n]*\.$/)
    expect(tool.description.match(/\. /g) ?? [], tool.name).toEqual([])
  }
})

test('every tool has a command of the same name, or a file or a session the table names', () => {
  const tools = mcpTools(createSessions()).map((tool) => tool.name)
  const commands = tools.filter((name) => (COMMAND_NAMES as readonly string[]).includes(name))
  expect(commands).toEqual(['create', 'check', 'replay'])
  expect(tools.filter((name) => !commands.includes(name))).toEqual([
    'content_types',
    'schema',
    'skill',
    'play_start',
    'play_step',
    'play_state',
    'play_save',
    'play_stop',
  ])
})

test('create, check and replay hand the command their words, and the command is run in a child with --json', async () => {
  const asked: (readonly string[])[] = []
  const memory = gameMemory()
  const spy = Layer.succeed(Runner, {
    command: (args) =>
      Effect.sync(() => {
        asked.push(args)
        return { code: 0, json: { ok: true } }
      }),
    worker: () => Effect.die('a worker was not asked for'),
  })
  const replies = await talk(Layer.merge(memory.layer, spy), [
    call(1, 'create', { folder: 'new-game' }),
    call(2, 'check', { folder: 'game' }),
    call(3, 'check', { folder: 'game', only: 'files', fix: true }),
    call(4, 'replay', { folder: 'game' }),
    call(5, 'replay', { folder: 'game', file: 'level-1', accept: true, state: true }),
    call(6, 'replay', { folder: 'game', file: 'replays/level-1.json' }),
  ])
  expect(asked).toEqual([
    ['create', 'new-game'],
    ['check', 'game'],
    ['check', 'game', '--only', 'files', '--fix'],
    ['replay', 'game'],
    ['replay', join('game', 'replays', 'level-1.json'), '--accept', '--state'],
    ['replay', join('game', 'replays', 'level-1.json')],
  ])
  expect(replies.map((reply) => JSON.parse(answerOf(reply).text))).toEqual(Array(6).fill({ ok: true }))
})

test('the live runner adds --json and starts the package’s own cli in a child process', () => {
  const live = readFileSync(new URL('../../../src/features/cli/live.ts', import.meta.url), 'utf8')
  expect(live).toMatch(/spawn\(process\.execPath, \[fileURLToPath\(cliFile\(\)\), \.\.\.args, '--json'\]/)
})

test('nothing in the server imports the game’s code: only the commands, as children, and the sessions, in Workers', () => {
  for (const file of ['mcp.ts', 'mcp-tools.ts', 'mcp-library.ts']) {
    const text = readFileSync(new URL(`../../../src/features/cli/${file}`, import.meta.url), 'utf8')
    const imports = [...text.matchAll(/^import .* from '(.*)'/gm)].map((match) => match[1])
    for (const banned of [
      './check.ts',
      './replay.ts',
      './create.ts',
      './game-folder.ts',
      './live.ts',
      './state.ts',
    ])
      expect(imports, `${file} imports ${banned}`).not.toContain(banned)
    expect(text, file).not.toMatch(/\bCode\b/)
  }
})

test('check on a sound game answers the report; on a broken one the result is an error that holds the sentence', async () => {
  const sound = answerOf(await ask(gameMemory().layer, call(1, 'check', { folder: 'game' })))
  expect(sound.isError).toBe(false)
  expect(JSON.parse(sound.text)).toMatchObject({ ok: true })

  const broken = gameMemory({ 'content/levels/level-1.json': '{"format":1}\n' })
  const bad = answerOf(await ask(broken.layer, call(1, 'check', { folder: 'game' })))
  expect(bad.isError).toBe(true)
  const report = JSON.parse(bad.text) as {
    ok: boolean
    steps: { step: string; problems: { message: string }[] }[]
  }
  expect(report.ok).toBe(false)
  expect(report.steps.find((step) => step.step === 'files')?.problems.length).toBeGreaterThan(0)
})

test('a folder that is not a game is a result that is an error and holds the command’s own sentence', async () => {
  const reply = await ask(gameMemory().layer, call(1, 'check', { folder: 'nowhere' }))
  expect(reply.error).toBeUndefined()
  const answer = answerOf(reply)
  expect(answer.isError).toBe(true)
  expect(answer.text).toBe(
    "nowhere is not a game: it has no automata.toml. Go to your game's folder, or name it: automata check <folder>.",
  )
})

test('create, then check, then replay, in one conversation', async () => {
  const memory = memoryLayer({ ...templateInMemory(), ...packageFilesInMemory() }, { code: templateCode })
  const replies = await talk(memory.layer, [
    call(1, 'create', { folder: 'my-game' }),
    call(2, 'check', { folder: 'my-game', only: 'files' }),
    call(3, 'replay', { folder: 'my-game' }),
  ])
  const [created, checked, replayed] = replies.map(answerOf)
  expect(created?.isError).toBe(false)
  expect((JSON.parse(created?.text ?? '') as { files: string[] }).files).toContain('automata.toml')
  expect(memory.files.has('my-game/automata.toml')).toBe(true)
  expect(checked?.isError).toBe(false)
  expect(JSON.parse(checked?.text ?? '')).toMatchObject({ ok: true })
  expect(replayed?.isError).toBe(false)
  const [result] = JSON.parse(replayed?.text ?? '') as { verdict: string; message: string }[]
  expect(result?.verdict).toBe('ok')
  expect(result?.message).toMatch(/as recorded\.$/)
})

test('content_types lists each kind with its folder, what it holds and its schema’s resource', async () => {
  const answer = answerOf(await ask(gameMemory().layer, call(1, 'content_types')))
  const kinds = JSON.parse(answer.text) as { kind: string; what: string; folder: string; schema: string }[]
  expect(kinds.map((kind) => kind.kind)).toEqual(SCHEMA_TYPES.filter((type) => type !== 'replay'))
  expect(kinds[0]).toMatchObject({
    kind: 'level',
    folder: 'content/levels/',
    schema: 'automata://schemas/level',
  })
  // Each says what it holds in the skill's own sentence, not just its name.
  for (const kind of kinds) {
    expect(kind.what, kind.kind).toMatch(/^[A-Z].*\.$/)
    expect(kind.schema).toBe(`automata://schemas/${kind.kind}`)
  }
})

test('schema answers the level schema and the replay schema; an unknown type names the kinds', async () => {
  const memory = gameMemory()
  const [level, replay, unknown] = (
    await talk(memory.layer, [
      call(1, 'schema', { type: 'level' }),
      call(2, 'schema', { type: 'replay' }),
      call(3, 'schema', { type: 'levle' }),
    ])
  ).map(answerOf)
  expect(JSON.parse(level?.text ?? '')).toEqual(JSON.parse(packageText('schemas/level.schema.json')))
  expect(JSON.parse(replay?.text ?? '')).toEqual(JSON.parse(packageText('schemas/replay.schema.json')))
  expect(unknown?.isError).toBe(true)
  expect(unknown?.text).toBe(`There is no kind called "levle". The kinds are: ${SCHEMA_TYPES.join(', ')}.`)
})

test('skill with no name lists four; with a name gives its text; an unknown name names the skills', async () => {
  const memory = gameMemory()
  const [list, one, unknown] = (
    await talk(memory.layer, [
      call(1, 'skill'),
      call(2, 'skill', { name: 'automata-rules' }),
      call(3, 'skill', { name: 'nope' }),
    ])
  ).map(answerOf)
  const skills = JSON.parse(list?.text ?? '') as { name: string; description: string }[]
  expect(skills.map((skill) => skill.name)).toEqual([
    'automata',
    'automata-api',
    'automata-content',
    'automata-rules',
  ])
  for (const skill of skills) expect(skill.description, skill.name).not.toBe('')
  expect(one?.text).toBe(packageText('skills/automata-rules/SKILL.md'))
  expect(unknown?.isError).toBe(true)
  expect(unknown?.text).toBe(
    'There is no skill called "nope". The skills are: automata, automata-api, automata-content, automata-rules.',
  )
})

test('an agent plays: start, step, state, save, stop, and the saved play replays as recorded', async () => {
  const memory = gameMemory()
  const replies = await talk(memory.layer, [
    call(1, 'play_start', { folder: 'game' }),
    call(2, 'play_step', { session: 's1', ticks: 60, hold: { '1': ['right'] } }),
    call(3, 'play_state', { session: 's1' }),
    call(4, 'play_save', { session: 's1', file: 'agent-run' }),
    call(5, 'play_stop', { session: 's1' }),
    call(6, 'replay', { folder: 'game', file: 'agent-run' }),
  ])
  const [started, stepped, state, saved, stopped, replayed] = replies.map(answerOf)
  expect(started?.isError).toBe(false)
  expect(JSON.parse(started?.text ?? '')).toMatchObject({
    session: 's1',
    state: { tick: 0, level: 'level-1' },
    note: "This session plays the game's rules as they were when it started.",
  })
  expect(JSON.parse(stepped?.text ?? '')).toMatchObject({ state: { tick: 60 }, events: expect.any(Array) })
  expect(JSON.parse(state?.text ?? '')).toMatchObject({ state: { tick: 60 } })
  expect(JSON.parse(saved?.text ?? '')).toMatchObject({ file: 'replays/agent-run.json', ticks: 60 })
  expect(JSON.parse(stopped?.text ?? '')).toEqual({ stopped: true })
  expect((JSON.parse(replayed?.text ?? '') as { verdict: string }[])[0]?.verdict).toBe('ok')
})

test('play sentences reach the agent as results that are errors: a bad tick count, no session, a fifth game', async () => {
  const memory = gameMemory()
  const replies = await talk(memory.layer, [
    call(1, 'play_start', { folder: 'game' }),
    call(2, 'play_step', { session: 's1', ticks: 0 }),
    call(3, 'play_state', { session: 's9' }),
    call(4, 'play_step', { session: 's1', ticks: 1, hold: { '1': ['fly'] } }),
    call(5, 'play_start', { folder: 'game' }),
    call(6, 'play_start', { folder: 'game' }),
    call(7, 'play_start', { folder: 'game' }),
    call(8, 'play_start', { folder: 'game' }),
    call(9, 'play_save', { session: 's1', file: 'Bad Name' }),
  ])
  const answers = replies.map(answerOf)
  expect(answers[1]).toEqual({ text: 'ticks must be a whole number from 1 to 3600.', isError: true })
  expect(answers[2]).toEqual({
    text: 'There is no session called "s9". Start one with play_start.',
    isError: true,
  })
  expect(answers[3]?.text).toBe(`"fly" is not one of this game's actions: ${ACTIONS.join(', ')}.`)
  expect(answers[7]).toEqual({
    text: 'Four games are already running. Stop one with play_stop first.',
    isError: true,
  })
  expect(answers[8]?.text).toBe("A recording's name is small letters, numbers and dashes, like level-1.")
})
