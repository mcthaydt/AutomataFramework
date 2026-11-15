import { expect, test } from 'vitest'
import { makeSound, SOUND_KINDS } from '#src/features/audio/audio.ts'
import { main } from '#src/features/cli/cli.ts'
import { SOUND_USAGE } from '#src/features/cli/sound.ts'
import { writeContent } from '#src/features/content/content.ts'
import { under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { musicGame } from '../../fixtures/cli/music-game.ts'

const start = (files = musicGame()): Memory => memoryLayer(under('game', files))

/** Runs `automata <args>` and gives what it said and its exit code. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(args, memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

test('new writes the sound of that kind and seed into the sounds folder, and says how to try another', async () => {
  const memory = start()
  const said = await run(memory, 'sound', 'new', 'jump', 'game')
  expect(said).toEqual({
    code: 0,
    out: ['Made content/sounds/jump.json (jump, seed 0). Try another with --seed 1.'],
    err: [],
  })
  expect(memory.files.get('game/content/sounds/jump.json')).toBe(writeContent('sound', makeSound('jump', 0)))
})

test('--seed and --id pick the take and the name, and the file is the one makeSound makes', async () => {
  const memory = start()
  const said = await run(memory, 'sound', 'new', 'coin', 'game', '--seed', '7', '--id', 'pickup')
  expect(said.out).toEqual(['Made content/sounds/pickup.json (coin, seed 7). Try another with --seed 8.'])
  expect(memory.files.get('game/content/sounds/pickup.json')).toBe(
    writeContent('sound', makeSound('coin', 7, 'pickup')),
  )
})

test('every kind can be made, and the sound is a file the game reads', async () => {
  const memory = start()
  for (const kind of SOUND_KINDS) expect((await run(memory, 'sound', 'new', kind, 'game')).code, kind).toBe(0)
  expect(await run(memory, 'check', 'game', '--only', 'files')).toMatchObject({ code: 0 })
})

test('a second take with the same name replaces the first', async () => {
  const memory = start()
  await run(memory, 'sound', 'new', 'jump', 'game')
  await run(memory, 'sound', 'new', 'jump', 'game', '--seed', '1')
  expect(memory.files.get('game/content/sounds/jump.json')).toBe(writeContent('sound', makeSound('jump', 1)))
})

test('--json says what was made', async () => {
  const memory = start()
  const said = await run(memory, 'sound', 'new', 'laser', 'game', '--seed', '2', '--json')
  expect(JSON.parse(said.out.join('\n'))).toEqual({
    made: 'content/sounds/laser.json',
    kind: 'laser',
    seed: 2,
  })
})

test('a kind that does not exist lists the kinds', async () => {
  const memory = start()
  const before = new Map(memory.files)
  const said = await run(memory, 'sound', 'new', 'boing', 'game')
  expect(said).toEqual({
    code: 2,
    out: [],
    err: [`There is no kind of sound called "boing". The kinds are: ${SOUND_KINDS.join(', ')}.`],
  })
  expect(memory.files).toEqual(before)
})

test('a seed that is not a whole number, and a name a file cannot have, are refused', async () => {
  const memory = start()
  for (const seed of ['x', '-1', '1.5']) {
    const said = await run(memory, 'sound', 'new', 'jump', 'game', '--seed', seed)
    expect(said, seed).toEqual({
      code: 2,
      out: [],
      err: ['--seed needs a whole number from 0, like --seed 3.'],
    })
  }
  const named = await run(memory, 'sound', 'new', 'jump', 'game', '--id', 'Big Jump')
  expect(named.code).toBe(2)
  expect(named.err[0]).toMatch(/^"Big Jump" is not a name a file can have\./)
})

test('a game with no sounds folder is told the lines to add, and nothing is written', async () => {
  const memory = start(musicGame([['music', 'content/music']]))
  const before = new Map(memory.files)
  const said = await run(memory, 'sound', 'new', 'jump', 'game')
  expect(said).toEqual({
    code: 2,
    out: [],
    err: [
      'This game lists no folder for sounds. Add these lines to automata.toml, then try again:\n\n[[content]]\ntype = "sound"\nfolder = "content/sounds"',
    ],
  })
  expect(memory.files).toEqual(before)
})

test('a missing, unknown or extra word says what to type', async () => {
  const memory = start()
  const cases: [string[], string][] = [
    [['sound'], SOUND_USAGE.verb],
    [['sound', 'jump'], 'automata sound has one part, new, and "jump" is not it.'],
    [['sound', 'new'], SOUND_USAGE.new],
    [
      ['sound', 'new', 'jump', 'game', 'extra'],
      'automata sound new takes fewer words, but these came after them: extra. A name with a space in it goes in quotes.',
    ],
  ]
  for (const [words, sentence] of cases) {
    expect(await run(memory, ...words), words.join(' ')).toEqual({ code: 2, out: [], err: [sentence] })
  }
})
