// Sound never moves a hash: the sound, music and cue files are left out of the content the sim is given, in Node and in
// every browser. Everything else in the content still counts.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, verifyReplay } from '#src/features/commands/commands.ts'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { createGameSim, simContent } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function loadFull(overrides: Record<string, string | undefined> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  return loaded.value
}

async function simOf(content: GameContent): Promise<Sim> {
  const sim = await createGameSim({ content })
  made.push(sim)
  return sim
}

/** The full game's file at `path`, with `change` applied to its parsed JSON, written back as JSON text. */
function edited(path: string, change: (json: Record<string, unknown>) => void): Record<string, string> {
  const json = JSON.parse(fullGameFiles[path] ?? '') as Record<string, unknown>
  change(json)
  return { [path]: `${JSON.stringify(json, null, 2)}\n` }
}

const quieterJump = (): Record<string, string> =>
  edited('content/sounds/jump.json', (sound) => {
    sound.volume = 0.2
  })

test('simContent drops sounds, music and cues and keeps every other map', async () => {
  const full = await loadFull()
  const kept = Object.keys(full)
    .filter((key) => !['sounds', 'music', 'cues'].includes(key))
    .sort()
  expect(Object.keys(simContent(full)).sort()).toEqual(kept)
  expect(simContent(full).levels).toBe(full.levels)
})

test('a game with no audio files is given back as it is', async () => {
  const m1 = await loadFixtureGame()
  expect(simContent(m1)).toBe(m1)
})

test('changing a sound moves no hash', async () => {
  const before = await simOf(await loadFull())
  const after = await simOf(await loadFull(quieterJump()))
  expect(after.contentHash).toBe(before.contentHash)
  expect(after.hash()).toBe(before.hash())
  for (let i = 0; i < 60; i++) {
    before.step([])
    after.step([])
  }
  expect(after.hash()).toBe(before.hash())
})

test('changing a cue list or a track moves no hash', async () => {
  const before = await simOf(await loadFull())
  const noLanding = await simOf(
    await loadFull(
      edited('content/cues/cues.json', (file) => {
        file.cues = (file.cues as { on: string }[]).filter((cue) => cue.on !== 'hero.landed')
      }),
    ),
  )
  const faster = await simOf(
    await loadFull(
      edited('content/music/meadow.json', (file) => {
        file.tempo = 140
      }),
    ),
  )
  expect(noLanding.contentHash).toBe(before.contentHash)
  expect(faster.contentHash).toBe(before.contentHash)
  expect(noLanding.hash()).toBe(before.hash())
  expect(faster.hash()).toBe(before.hash())
})

// The project file lists every content file by path, and that list is part of the content the sim hashes: so a sound,
// a track or a cue list being listed or not must leave the list the sim sees alone, not only the maps.
test('listing sound, music and cue files moves no hash and keeps every other file listed', async () => {
  const quiet = await loadFixtureGame()
  const loud = await loadSoundingGame()
  expect(loud.project.content.length).toBe(quiet.project.content.length + 4)
  expect(simContent(loud).project.content).toEqual(quiet.project.content)
  const before = await simOf(quiet)
  const after = await simOf(loud)
  expect(after.contentHash).toBe(before.contentHash)
})

test('changing a level still moves the content hash', async () => {
  const before = await simOf(await loadFull())
  const moved = await simOf(
    await loadFull(
      edited('content/levels/level-1.json', (level) => {
        const things = level.things as { id: string; x: number }[]
        const crate = things.find((thing) => thing.id === 'crate-1')
        if (crate !== undefined) crate.x = 9.5
      }),
    ),
  )
  expect(moved.contentHash).not.toBe(before.contentHash)
})

test('the M1 fixture still ends sixty idle ticks on the recorded hash', async () => {
  const sim = await simOf(await loadFixtureGame())
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})

test('a replay recorded before a sound changed still verifies after', async () => {
  const recorder = createRecorder(await simOf(await loadFull()))
  for (let i = 0; i < 60; i++) recorder.step([])
  const verdict = verifyReplay(await simOf(await loadFull(quieterJump())), recorder.replay())
  expect(verdict).toEqual({ ok: true })
})
