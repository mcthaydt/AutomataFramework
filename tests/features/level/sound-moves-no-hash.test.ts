// Sound never moves a hash. A sound, a track (either format), a loop, a motif or a cue list is added to the M1 fixture
// game, once listed by its path and once through a folder the project lists, and the sim is given exactly what it was
// given without it: the same content hash, and after sixty idle ticks the recorded hash.
import { afterEach, expect, test } from 'vitest'
import { makeSound } from '#src/features/audio/audio.ts'
import { type ContentType, loadGame, withFolders, writeContent } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { bouncyBass, drumFill, easyDrums, heroTheme, meadow } from '../../fixtures/audio/song.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A file to add: its kind, where it goes and its text. */
interface Added {
  readonly type: ContentType
  readonly path: string
  readonly text: string
}

const sound = (): Added => ({
  type: 'sound',
  path: 'content/sounds/jump.json',
  text: writeContent('sound', makeSound('jump', 0)),
})
const loops = (): Added[] =>
  [easyDrums(), drumFill(), bouncyBass()].map((loop) => ({
    type: 'loop',
    path: `content/loops/${loop.id}.json`,
    text: writeContent('loop', loop),
  }))
const motif = (): Added => ({
  type: 'motif',
  path: 'content/motifs/hero-theme.json',
  text: writeContent('motif', heroTheme()),
})

/** What is added, by the name of what it is. Each is a whole set of files that load together. */
const KINDS: Readonly<Record<string, () => Added[]>> = {
  sound: () => [sound()],
  'music (format 1)': () => [
    {
      type: 'music',
      path: 'content/music/meadow.json',
      text: fullGameFiles['content/music/meadow.json'] ?? '',
    },
  ],
  'music (format 2)': () => [
    ...loops(),
    motif(),
    { type: 'music', path: 'content/music/meadow.json', text: writeContent('music', meadow()) },
  ],
  loop: loops,
  motif: () => [motif()],
  cues: () => [
    sound(),
    {
      type: 'cues',
      path: 'content/cues/cues.json',
      text: writeContent('cues', {
        format: 1,
        id: 'cues',
        cues: [{ on: 'hero.jumped', do: 'sound', sound: 'jump' }],
      }),
    },
  ],
}

/** The M1 fixture with `added` in it: each listed by path, or each folder it is in listed once. */
function gameWith(added: readonly Added[], how: 'path' | 'folder'): Record<string, string> {
  const files: Record<string, string> = { ...fixtureFiles }
  for (const file of added) files[file.path] = file.text
  const toml = fixtureFiles['automata.toml'] ?? ''
  if (how === 'folder') {
    const folders = added.map((file) => ({
      type: file.type,
      folder: file.path.slice(0, file.path.lastIndexOf('/')),
    }))
    files['automata.toml'] = withFolders(toml, folders)
  } else {
    const listed = added
      .map((file) => `\n[[content]]\ntype = "${file.type}"\npath = "${file.path}"\n`)
      .join('')
    files['automata.toml'] = `${toml}${listed}`
  }
  return files
}

async function simOf(files: Record<string, string>): Promise<Sim> {
  const loaded = await loadGame(
    async (path) => {
      const text = files[path]
      if (text === undefined) throw new Error(`${path}: no such file`)
      return text
    },
    async (folder) =>
      Object.keys(files)
        .filter((path) => path.startsWith(`${folder}/`) && !path.slice(folder.length + 1).includes('/'))
        .map((path) => path.slice(folder.length + 1)),
  )
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  const sim = await createGameSim({ content: loaded.value })
  made.push(sim)
  return sim
}

for (const [name, files] of Object.entries(KINDS))
  for (const how of ['path', 'folder'] as const)
    test(`adding ${name} files by ${how} moves neither the content hash nor the recorded hash`, async () => {
      const plain = await simOf({ ...fixtureFiles })
      const loud = await simOf(gameWith(files(), how))
      expect(loud.contentHash).toBe(plain.contentHash)
      for (let i = 0; i < 60; i++) {
        plain.step([])
        loud.step([])
      }
      expect(loud.hash()).toBe(plain.hash())
      expectRecorded('idleHash60', loud.hash(), (golden as { idleHash60?: string }).idleHash60)
    })
