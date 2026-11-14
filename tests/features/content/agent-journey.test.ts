import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  CONTENT_TYPES,
  formatDiagnostic,
  type GameContent,
  loadGame,
  markRead,
  translationProblems,
  unreadWords,
  writeContent,
} from '#src/features/content/content.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { readFixture } from '../../fixtures/game/read.ts'

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

/** A messages file's JSON with one line added or changed, written the way `writeContent` writes it. */
function withLine(language: string, key: string, text: string): string {
  const file = JSON.parse(fullGameFiles[`content/messages/${language}.json`] ?? '') as {
    messages: Record<string, string>
  }
  return writeContent('messages', { ...file, messages: { ...file.messages, [key]: text } } as never)
}

test('an agent adds a word in English and is told, file by file, where else to write it', async () => {
  // 1. A line in English alone: the game still loads and plays, and the check says where the five others go.
  const files: Record<string, string | undefined> = {
    ...fullGameFiles,
    'content/messages/en.json': withLine('en', 'keeper.joke', 'Why did the crate cross the ledge?'),
  }
  const loaded = await loadGame(readFullGame(files))
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  const told = translationProblems(loaded.value).map(formatDiagnostic)
  expect(told).toHaveLength(5)
  for (const [i, language] of ['es', 'ko', 'ja', 'zh', 'pt'].entries()) {
    expect(told[i]).toContain(`content/messages/${language}.json`)
    expect(told[i]).toContain('"keeper.joke"')
    expect(told[i]).toContain('Why did the crate cross the ledge?')
  }

  // 2. It writes the five, and the check has nothing left to say.
  for (const language of ['es', 'ko', 'ja', 'zh', 'pt'])
    files[`content/messages/${language}.json`] = withLine(
      language,
      'keeper.joke',
      `(${language}) keeper.joke`,
    )
  const written = await loadGame(readFullGame(files))
  expect(written.ok).toBe(true)
  if (!written.ok) return
  expect(translationProblems(written.value)).toEqual([])

  // 3. Five new words wait for a native speaker's read, one in each language; reading Spanish leaves four.
  const waiting = unreadWords(written.value, {}).filter((word) => word.key === 'keeper.joke')
  expect(waiting.map((word) => word.language)).toEqual(['es', 'ko', 'ja', 'zh', 'pt'])
  const marks = markRead(written.value, {}, 'es', ['keeper.joke'])
  expect(unreadWords(written.value, marks).filter((word) => word.key === 'keeper.joke')).toHaveLength(4)
})

test('an agent misspells a value in one language and is told which', async () => {
  const files: Record<string, string | undefined> = {
    ...fullGameFiles,
    'content/messages/en.json': withLine('en', 'keeper.count', 'You have {count} crates.'),
  }
  for (const language of ['es', 'ko', 'ja', 'zh', 'pt'])
    files[`content/messages/${language}.json`] = withLine(
      language,
      'keeper.count',
      language === 'ja' ? 'クレートは{cuont}個です。' : `{count} (${language})`,
    )
  const loaded = await loadGame(readFullGame(files))
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  const told = translationProblems(loaded.value).map(formatDiagnostic)
  // Only Japanese is wrong, and both halves of the slip are named: the value it lacks and the one English lacks.
  expect(told).toHaveLength(2)
  for (const sentence of told) expect(sentence).toContain('content/messages/ja.json')
  expect(told.join(' ')).toContain('{count}')
  expect(told.join(' ')).toContain('{cuont}')
})
