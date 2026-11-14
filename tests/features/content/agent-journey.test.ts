import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  artFiles,
  artProblems,
  CONTENT_TYPES,
  formatDiagnostic,
  type GameContent,
  loadGame,
  writeContent,
} from '#src/features/content/content.ts'
import { fullGamePictures } from '../../fixtures/full-game/pictures.ts'
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
