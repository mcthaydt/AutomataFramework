// The story game, played end to end: the opening, a walk up to the keeper, a pick, two Nexts, the cutscene that follows,
// a jump over the keeper and the critter running from the hero. Content, physics, commands, behaviour rules and story
// end on one hash in Node, Chromium, WebKit and Firefox; the committed golden is the reference.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, type Replay, verifyReplay } from '#src/features/commands/commands.ts'
import { parseContent, parseProject, writeContent } from '#src/features/content/content.ts'
import { createGameSim, Story, Thing } from '#src/features/level/level.ts'
import { Mind } from '#src/features/level/mind.ts'
import { sceneOf, storyProgress, talkOf } from '#src/features/level/story-read.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import { storyEventsOf } from '../../fixtures/level/story-helpers.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import { storyFiles } from '../../fixtures/story/read.ts'
import { STORY_TICKS, storyScript } from '../../fixtures/story/script.ts'
import golden from '../../golden/story.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function fresh(overrides: Record<string, string | undefined> = {}) {
  const content = await loadStory(overrides)
  const sim = await createGameSim({ content, plugins: storyPlugins })
  made.push(sim)
  return { sim, content }
}
const xOf = (sim: Sim, id: string): number =>
  sim
    .query(Thing)
    .find((e) => e.get(Thing).id === id)
    ?.get(Transform).x ?? Number.NaN

/** What a play of the story script showed: the events by type, the critter's rules as each first showed, and where it was. */
interface Played {
  readonly sim: Sim
  readonly replay: Replay
  readonly types: string[]
  readonly rules: string[]
  /** The first tick after which a conversation was open, and the first after which the tip cutscene was playing. */
  readonly talkAt: number
  readonly tipAt: number
}

async function record(): Promise<Played & { content: Awaited<ReturnType<typeof loadStory>> }> {
  const { sim, content } = await fresh()
  const recorder = createRecorder(sim)
  const types: string[] = []
  const rules: string[] = []
  let talkAt = -1
  let tipAt = -1
  for (let t = 0; t < STORY_TICKS; t++) {
    for (const e of storyEventsOf(recorder.step(storyScript(sim.tick)))) types.push(e.type)
    const rule =
      sim
        .query(Mind, Thing)
        .find((e) => e.get(Thing).id === 'critter-1')
        ?.get(Mind).rule ?? ''
    if (rule !== '' && !rules.includes(rule)) rules.push(rule)
    const story = sim.resource(Story)
    if (talkAt < 0 && story.talk !== null) talkAt = sim.tick
    if (tipAt < 0 && story.scene?.cutscene === 'glade-tip') tipAt = sim.tick
  }
  return { sim, content, replay: recorder.replay(), types, rules, talkAt, tipAt }
}

test('the story plays as its files say, and matches its golden', async () => {
  const { sim, content, replay, types, rules } = await record()
  expect(types).toEqual([
    'cutscene.started',
    'cutscene.ended',
    'conversation.started',
    'conversation.said',
    'conversation.chosen',
    'conversation.said',
    'conversation.said',
    'conversation.ended',
    'cutscene.started',
    'cutscene.ended',
  ])
  const kept = { ended: { keeper: 'tip' }, seen: ['glade-intro', 'glade-tip'] }
  expect(storyProgress(sim, content)).toEqual(kept)
  expect(xOf(sim, 'keeper')).toBeCloseTo(10.5, 3)
  expect(rules).toEqual(['wander', 'run-away'])
  expect(xOf(sim, 'critter-1')).toBeGreaterThan(17.5)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(verifyReplay((await fresh()).sim, replay)).toEqual({ ok: true })
})

test('restored mid-opening, mid-sentence and mid-tip, the run ends the same', async () => {
  const { replay, talkAt, tipAt } = await record()
  expect(talkAt).toBeGreaterThan(120)
  expect(tipAt).toBeGreaterThan(talkAt)
  for (const at of [60, talkAt + 5, tipAt + 5]) {
    const first = (await fresh()).sim
    while (first.tick < at) first.step(storyScript(first.tick))
    const { sim: second, content } = await fresh()
    second.restore(first.snapshot())
    expect(talkOf(second, content), `talk at ${at}`).toEqual(talkOf(first, content))
    expect(sceneOf(second, content), `scene at ${at}`).toEqual(sceneOf(first, content))
    while (second.tick < STORY_TICKS) second.step(storyScript(second.tick))
    expect(second.hash(), `restored at ${at}`).toBe(replay.finalHash)
  }
})

test('changing a line’s key in the conversation is "the content changed"', async () => {
  const { replay } = await record()
  const path = 'content/conversations/keeper.json'
  const changed = (storyFiles[path] ?? '').replace('"keeper.hello"', '"keeper.bye"')
  expect(changed).not.toBe(storyFiles[path])
  const verdict = verifyReplay((await fresh({ [path]: changed })).sim, replay)
  expect(verdict.ok).toBe(false)
  if (!verdict.ok) expect(verdict.reason).toBe('content-changed')
})

test('sixty idle ticks with only the framework plugins end on the recorded hash', async () => {
  // No game code: this is the run tests/install/smoke.mjs repeats on the packed package.
  const sim = await createGameSim({ content: await loadStory() })
  made.push(sim)
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})

test('every file of the story game is written as writeContent writes it, and names no colour', () => {
  const project = parseProject(storyFiles['automata.toml'] ?? '')
  if (!project.ok) throw new Error('the project file did not read')
  expect(project.value.content.length).toBe(Object.keys(storyFiles).length - 1)
  const colours = /\b(red|green|blue|pink|yellow|black|white|gr[ae]y|orange|purple|brown)\b/i
  for (const ref of project.value.content) {
    const text = storyFiles[ref.path] ?? ''
    const parsed = parseContent(ref.type, text, ref.path)
    expect(parsed.ok && writeContent(ref.type, parsed.value as never), ref.path).toBe(text)
    expect(text.match(colours), `${ref.path} names a colour`).toBeNull()
  }
})
