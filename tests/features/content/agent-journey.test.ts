import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  artFiles,
  artProblems,
  CONTENT_TYPES,
  formatDiagnostic,
  type GameContent,
  loadGame,
  markRead,
  translationProblems,
  unreadWords,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles, readFiles, withSource } from '../../fixtures/content/kind.ts'
import { fullGamePictures } from '../../fixtures/full-game/pictures.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { fixtureFiles, readFixture } from '../../fixtures/game/read.ts'
import { readSceneGame } from '../../fixtures/scene-game/read.ts'

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

test('an agent repaints the hero, and is told when the picture is stale and when it slips', async () => {
  // 1. The full game loads, and every picture is as its file says.
  const files: Record<string, string | undefined> = { ...fullGameFiles }
  const read = async (path: string): Promise<string> => files[path] ?? Promise.reject(new Error(path))
  const painted = await fullGamePictures()
  const loaded = await loadGame(read)
  if (!loaded.ok) throw new Error('the full game did not load')
  const have = async (path: string): Promise<Uint8Array | undefined> => painted[path]
  expect(await artProblems(loaded.value, have)).toEqual([])

  // 2. It reads the format from the shipped schema, with nothing running.
  const schema = JSON.parse(
    readFileSync(new URL('../../../schemas/figure.schema.json', import.meta.url), 'utf8'),
  ) as { properties: Record<string, unknown> }
  expect(Object.keys(schema.properties)).toEqual([
    'format',
    'id',
    'tile',
    'frame',
    'outline',
    'paints',
    'parts',
    'poses',
    'variants',
  ])

  // 3. It changes one paint of the hero, and is told the picture is older than the file.
  const hero = JSON.parse(files['content/figures/hero.json'] ?? '') as {
    paints: { id: string; color: string }[]
  }
  const trim = hero.paints.find((p) => p.id === 'trim') as { color: string }
  trim.color = '#afd472'
  files['content/figures/hero.json'] = writeContent('figure', hero as never)
  const repainted = await loadGame(read)
  if (!repainted.ok) throw new Error('the repainted game did not load')
  expect((await artProblems(repainted.value, have)).map(formatDiagnostic)).toEqual([
    'content/figures/hero.png: This picture is older than its figure file. Run "automata art".',
  ])

  // 4. It paints again, and the problem is gone.
  const fresh = Object.fromEntries(artFiles(repainted.value).map((file) => [file.path, file.bytes]))
  expect(await artProblems(repainted.value, async (path) => fresh[path])).toEqual([])

  // 5. The slip: a clip names a pose the figure does not have.
  const character = JSON.parse(files['content/characters/hero.json'] ?? '') as {
    clips: { poses: string[] }[]
  }
  ;((character.clips[1] as { poses: string[] }).poses as string[])[0] = 'runn'
  files['content/characters/hero.json'] = writeContent('character', character as never)
  const slipped = await loadGame(read)
  expect(slipped.ok ? [] : slipped.diagnostics.map(formatDiagnostic)).toEqual([
    'content/characters/hero.json: clips[1].poses[0]: The figure "hero" has no pose called "runn". It has: fall, idle, jump, land, push, run-1, run-2.',
  ])
})

test('every kind of file is in the full game or the scene game, so nothing is untested', async () => {
  const full = await loadGame(readFullGame())
  // A scene and a photo come with pictures of their own, so they live in the scene game and not in the full one.
  const scene = await loadGame(readSceneGame())
  expect(full.ok).toBe(true)
  expect(scene.ok).toBe(true)
  if (full.ok && scene.ok)
    for (const info of Object.values(CONTENT_TYPES)) {
      const game = info.plural === 'scenes' || info.plural === 'photos' ? scene : full
      const have = Object.keys(game.value[info.plural as keyof GameContent] ?? {}).length
      expect(have, info.plural).toBeGreaterThan(0)
    }
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
  for (const [i, language] of ['zh', 'es', 'pt', 'ja', 'ko'].entries()) {
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
  const waiting = unreadWords(written.value, undefined).filter((word) => word.key === 'keeper.joke')
  expect(waiting.map((word) => word.language)).toEqual(['zh', 'es', 'pt', 'ja', 'ko'])
  const marks = markRead(written.value, undefined, 'es', ['keeper.joke'])
  expect(unreadWords(written.value, marks).filter((word) => word.key === 'keeper.joke')).toHaveLength(4)
})

test('an agent writes a game in Korean from text alone, and is told what Spanish and the rest lack', async () => {
  const messages = (id: string, words: Record<string, string>): string =>
    writeContent('messages', { format: 1, id, messages: words } as never)
  const ko = { 'keeper.hello': '안녕하세요!', 'keeper.bye': '안녕히 가세요.' }
  const files = gameFiles(fixtureFiles, [
    { type: 'messages', path: 'content/messages/ko.json', text: messages('ko', ko) },
    { type: 'messages', path: 'content/messages/es.json', text: messages('es', { 'keeper.bye': 'Adiós.' }) },
  ])
  const toml = withSource(files['automata.toml'] ?? '', 'ko')
  const loaded = await loadGame(readFiles({ ...files, 'automata.toml': toml }))
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  const missing = (name: string, code: string): string =>
    `automata.toml: content: This game has no words in ${name}. Add content/messages/${code}.json with every word Korean has, and list it here.`
  expect(translationProblems(loaded.value).map(formatDiagnostic)).toEqual([
    missing('Chinese', 'zh'),
    missing('English', 'en'),
    missing('Portuguese', 'pt'),
    missing('Japanese', 'ja'),
    'content/messages/es.json: messages: This file has no "keeper.hello". The Korean file says "안녕하세요!". Write it in Spanish.',
  ])
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

test('an agent writes a scene by hand from the skill page, is told a slope has air under it, fixes it, and paints it', async () => {
  // 1. It copies the smallest scene from the skill page, names it, and lists it in a game that has no scene yet.
  const page = readFileSync(new URL('../../../skills/automata-content/scenes.md', import.meta.url), 'utf8')
  const smallest = JSON.parse(/```json scene\n([\s\S]*?)```/.exec(page)?.[1] ?? '') as {
    id: string
    ground: { letters: object[]; rows: string[] }
  }
  smallest.id = 'yard'
  const files: Record<string, string | undefined> = { ...fixtureFiles }
  const write = (): void => {
    files['content/scenes/yard.json'] = writeContent('scene', smallest as never)
  }
  write()
  files['automata.toml'] += '\n[[content]]\ntype = "scene"\npath = "content/scenes/yard.json"\n'
  const read = async (path: string): Promise<string> => files[path] ?? Promise.reject(new Error(path))
  expect((await loadGame(read)).ok).toBe(true)

  // 2. It adds a slope two tiles long, and leaves air under its upper tile.
  smallest.ground.letters.push({ letter: '/', material: 'earth', shape: 'slope-up' })
  smallest.ground.rows = ['........', '..../...', '.../....', 'GGGGGGGG']
  write()
  const slipped = await loadGame(read)
  expect(slipped.ok ? [] : slipped.diagnostics.map(formatDiagnostic)).toEqual([
    'content/scenes/yard.json: ground.rows[2]: The slope that starts at column 3 needs solid ground under it. The tile at column 4, row 2 is not solid: fill it, or shorten the slope.',
  ])

  // 3. It fills the tile, and the game loads.
  smallest.ground.rows = ['........', '..../...', '.../G...', 'GGGGGGGG']
  write()
  const fixed = await loadGame(read)
  if (!fixed.ok) throw new Error(fixed.diagnostics.map(formatDiagnostic).join('\n'))

  // 4. The picture has not been painted, and the check says so; the painter's bytes, written, settle it.
  const none = async (): Promise<Uint8Array | undefined> => undefined
  expect((await artProblems(fixed.value, none)).map(formatDiagnostic)).toEqual([
    'content/scenes/yard.png: This picture has not been painted. Run "automata art".',
    'content/scenes/yard.atlas.json: This atlas has not been painted. Run "automata art".',
  ])
  const painted = Object.fromEntries(artFiles(fixed.value).map((file) => [file.path, file.bytes]))
  expect(Object.keys(painted)).toEqual(['content/scenes/yard.png', 'content/scenes/yard.atlas.json'])
  expect(await artProblems(fixed.value, async (path) => painted[path])).toEqual([])
})
