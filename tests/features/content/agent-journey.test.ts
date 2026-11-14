import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  CONTENT_TYPES,
  formatDiagnostic,
  type GameContent,
  loadGame,
  writeContent,
} from '#src/features/content/content.ts'
import { chooseCommand, createGameSim, startConversation } from '#src/features/level/level.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { readFixture } from '../../fixtures/game/read.ts'
import { callOn, storyEventsOf } from '../../fixtures/level/story-helpers.ts'
import { storyFiles } from '../../fixtures/story/read.ts'

/** A sound an agent might add: one falling sine tone, a door's creak. */
const door = {
  format: 1 as const,
  id: 'door',
  volume: 0.8,
  voices: [
    { kind: 'tone' as const, wave: 'sine' as const, from: 220, to: 110, at: 0, length: 0.4, volume: 1 },
  ],
}

test('an agent adds a sound to a game, hooks it up, and is told plainly when it slips', async () => {
  // 1. The game loads as it is.
  const files: Record<string, string | undefined> = { ...fullGameFiles }
  const read = async (path: string): Promise<string> => files[path] ?? Promise.reject(new Error(path))
  expect((await loadGame(read)).ok).toBe(true)

  // 2. The agent reads the format from the shipped schema, with nothing running.
  const schema = JSON.parse(
    readFileSync(new URL('../../../schemas/sound.schema.json', import.meta.url), 'utf8'),
  ) as { properties: Record<string, unknown> }
  expect(Object.keys(schema.properties)).toEqual(['format', 'id', 'volume', 'voices'])

  // 3. It writes a new sound, lists it, and has it play on an event, with one slip in the name.
  files['content/sounds/door.json'] = writeContent('sound', door)
  files['automata.toml'] += '\n[[content]]\ntype = "sound"\npath = "content/sounds/door.json"\n'
  const cues = JSON.parse(files['content/cues/cues.json'] ?? '') as { cues: Record<string, unknown>[] }
  cues.cues.push({ on: 'door.opened', do: 'sound', sound: 'dor' })
  files['content/cues/cues.json'] = writeContent('cues', cues as never)

  // 4. The check says which file, where, and what there is.
  const broken = await loadGame(read)
  expect(broken.ok ? [] : broken.diagnostics.map(formatDiagnostic)).toEqual([
    'content/cues/cues.json: cues[3].sound: There is no sound called "dor". This game has: door, jump, land.',
  ])

  // 5. One fix, and the game has the sound.
  const slipped = cues.cues[3] as Record<string, unknown>
  slipped.sound = 'door'
  files['content/cues/cues.json'] = writeContent('cues', cues as never)
  const fixed = await loadGame(read)
  expect(fixed.ok && fixed.value.sounds?.door?.voices.length).toBe(1)
})

test('every kind of file is in the full game, so nothing is untested', async () => {
  const loaded = await loadGame(readFullGame())
  expect(loaded.ok).toBe(true)
  if (loaded.ok)
    for (const info of Object.values(CONTENT_TYPES))
      expect(
        Object.keys(loaded.value[info.plural as keyof GameContent] ?? {}).length,
        info.plural,
      ).toBeGreaterThan(0)
})

test('a game with only levels and characters loads to just those keys, so its content hash has not moved', async () => {
  const loaded = await loadGame(readFixture())
  expect(loaded.ok && Object.keys(loaded.value).sort()).toEqual(['characters', 'levels', 'project'])
})

test('an agent gives the keeper a third choice by editing two files, and the game plays it', async () => {
  // 1. The agent adds the two lines to the English words, and a choice and a node to the keeper, writing both files
  //    with `writeContent` so its bytes are the framework's own.
  const files: Record<string, string | undefined> = { ...storyFiles }
  const read = async (path: string): Promise<string> => files[path] ?? Promise.reject(new Error(path))
  const words = JSON.parse(files['content/messages/en.json'] ?? '') as {
    messages: Record<string, string>
  }
  words.messages['hero.joke'] = 'Tell me a joke.'
  words.messages['keeper.joke'] = 'A crate walks into a bar.'
  files['content/messages/en.json'] = writeContent('messages', words as never)
  const talk = JSON.parse(files['content/conversations/keeper.json'] ?? '') as {
    nodes: Record<string, unknown>[]
  }
  ;(talk.nodes[0]?.choices as unknown[]).push({ line: 'hero.joke', next: 'joke' })
  talk.nodes.push({ id: 'joke', speaker: 'keeper', lines: ['keeper.joke'] })
  files['content/conversations/keeper.json'] = writeContent('conversation', talk as never)

  // 2. The game loads with no problem.
  const loaded = await loadGame(read)
  expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([])
  if (!loaded.ok) return

  // 3. A sim on the changed game: the third choice leads to the new line.
  const sim = await createGameSim({
    content: loaded.value,
    story: { ended: {}, seen: ['glade-intro'] },
    plugins: [callOn('open-keeper', [2], (ctx) => void startConversation(ctx, 'keeper', 1))],
  })
  try {
    const said: unknown[] = []
    for (let tick = 0; tick < 8; tick++) {
      const result = sim.step(tick === 5 ? [chooseCommand(tick, 1, 0, 2)] : [])
      for (const e of storyEventsOf(result)) if (e.type === 'conversation.said') said.push(e.payload)
    }
    expect(said.map((p) => (p as { line: string }).line)).toEqual(['keeper.hello', 'keeper.joke'])
  } finally {
    sim.dispose()
  }

  // 4. The slip: the new node names a cutscene with a letter missing. The check says which file, where, and what there is.
  const node = talk.nodes[3] as Record<string, unknown>
  node.cutscene = 'glade-tp'
  files['content/conversations/keeper.json'] = writeContent('conversation', talk as never)
  const broken = await loadGame(read)
  expect(broken.ok ? [] : broken.diagnostics.map(formatDiagnostic)).toEqual([
    'content/conversations/keeper.json: nodes[3].cutscene: There is no cutscene called "glade-tp". This game has: glade-intro, glade-tip.',
  ])
})
