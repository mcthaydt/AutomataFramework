import { expect, test } from 'vitest'
import { musicToMidi, notesOf } from '#src/features/audio/audio.ts'
import { main } from '#src/features/cli/cli.ts'
import { MUSIC_USAGE } from '#src/features/cli/music.ts'
import { parseContent, writeContent } from '#src/features/content/content.ts'
import { EXTRAS, FORMAT_2 } from '../../fixtures/audio/midi-files.ts'
import { meadow, songParts } from '../../fixtures/audio/song.ts'
import { under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { musicGame } from '../../fixtures/cli/music-game.ts'

/** `meadow` as a MIDI file, the way `automata music export` writes it. */
const meadowMidi = (): Uint8Array<ArrayBuffer> => musicToMidi({ type: 'music', value: meadow() }, songParts())

/** The game in `game/` (and any `more` files beside it, at the folder the command is started in). */
const start = (files = musicGame(), more: Record<string, string | Uint8Array> = {}): Memory =>
  memoryLayer({ ...under('game', files), ...more })

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

const text = (memory: Memory, path: string): string => String(memory.files.get(path))

test('import writes the song and its loops into the folders the game lists, named after the file', async () => {
  const memory = start(undefined, { 'My Song.mid': meadowMidi() })
  const said = await run(memory, 'music', 'import', 'My Song.mid', 'game')
  expect(said.code).toBe(0)
  expect(said.err).toEqual([])
  expect(said.out).toHaveLength(1)
  const [made = ''] = said.out
  const count = /^Made content\/music\/my-song\.json and (\d+) loops?\.$/.exec(made)?.[1]
  expect(count, made).toBeDefined()
  const loops = [...memory.files.keys()].filter((key) => key.startsWith('game/content/loops/my-song-'))
  expect(loops).toHaveLength(Number(count))
  // Every file is in the standard form, and reads as the kind it is.
  for (const path of ['game/content/music/my-song.json', ...loops]) {
    const type = path.includes('/music/') ? 'music' : 'loop'
    const parsed = parseContent(type, text(memory, path), path.slice('game/'.length))
    expect(parsed.ok, path).toBe(true)
    if (parsed.ok) expect(writeContent(type, parsed.value as never), path).toBe(text(memory, path))
  }
})

test('--id names the song, and --json says what was made and what was dropped', async () => {
  const memory = start(undefined, { 'extras.mid': EXTRAS })
  const said = await run(memory, 'music', 'import', 'extras.mid', 'game', '--id', 'tune', '--json')
  expect(said.code).toBe(0)
  const answer = JSON.parse(said.out.join('\n')) as { made: string[]; dropped: string[] }
  expect(answer.made[0]).toBe('content/music/tune.json')
  expect(answer.made.slice(1).every((path) => path.startsWith('content/loops/tune-'))).toBe(true)
  expect(answer.dropped).toEqual([
    'Pitch bends were dropped.',
    'Controllers (like the sustain pedal) were dropped.',
  ])
  expect(memory.files.has('game/content/music/tune.json')).toBe(true)
})

test('what the file had that a song cannot hold is said after what was made', async () => {
  const memory = start(undefined, { 'extras.mid': EXTRAS })
  const said = await run(memory, 'music', 'import', 'extras.mid', 'game')
  expect(said.code).toBe(0)
  expect(said.out[0]).toMatch(/^Made content\/music\/extras\.json and 1 loop\.$/)
  expect(said.out.slice(1)).toEqual([
    'Pitch bends were dropped.',
    'Controllers (like the sustain pedal) were dropped.',
  ])
})

test('a game folder after the file is the one written; left out, it is the folder the command is in', async () => {
  const memory = memoryLayer({ ...musicGame(), 'song.mid': meadowMidi() })
  const said = await run(memory, 'music', 'import', 'song.mid')
  expect(said.code).toBe(0)
  expect(memory.files.has('content/music/song.json')).toBe(true)
})

test('an import is a game that still passes the files check', async () => {
  const memory = start(undefined, { 'My Song.mid': meadowMidi() })
  await run(memory, 'music', 'import', 'My Song.mid', 'game')
  expect(await run(memory, 'check', 'game', '--only', 'files')).toMatchObject({ code: 0 })
})

test('a name the game already has is refused with the way out, and nothing is written', async () => {
  const memory = start(undefined, { 'My Song.mid': meadowMidi() })
  await run(memory, 'music', 'import', 'My Song.mid', 'game')
  const before = new Map(memory.files)
  const said = await run(memory, 'music', 'import', 'My Song.mid', 'game')
  expect(said).toEqual({
    code: 2,
    out: [],
    err: ['There is already a music track called "my-song". Pick another name with --id.'],
  })
  expect(memory.files).toEqual(before)
})

test('a song name that is a file already in the folder is refused too', async () => {
  const memory = start(undefined, { 'song.mid': meadowMidi() })
  const said = await run(memory, 'music', 'import', 'song.mid', 'game', '--id', 'meadow')
  expect(said.code).toBe(2)
  expect(said.err).toEqual(['There is already a music track called "meadow". Pick another name with --id.'])
})

test('a game that lists no folder for music and loops is told the lines to add, and nothing is written', async () => {
  const memory = start(musicGame([['sound', 'content/sounds']]), { 'song.mid': meadowMidi() })
  const before = new Map(memory.files)
  const said = await run(memory, 'music', 'import', 'song.mid', 'game')
  expect(said).toEqual({
    code: 2,
    out: [],
    err: [
      'This game lists no folder for music and loops. Add these lines to automata.toml, then try again:\n\n[[content]]\ntype = "music"\nfolder = "content/music"\n\n[[content]]\ntype = "loop"\nfolder = "content/loops"',
    ],
  })
  expect(memory.files).toEqual(before)
})

test('a game that lists only the loop folder is told only about music', async () => {
  const memory = start(musicGame([['loop', 'content/loops']]), { 'song.mid': meadowMidi() })
  const said = await run(memory, 'music', 'import', 'song.mid', 'game')
  expect(said.err).toEqual([
    'This game lists no folder for music. Add these lines to automata.toml, then try again:\n\n[[content]]\ntype = "music"\nfolder = "content/music"',
  ])
})

test('a file that is not there, not MIDI or with no notes is refused with its sentence', async () => {
  const memory = start(undefined, {
    'text.mid': new TextEncoder().encode('not midi at all'),
    'two.mid': FORMAT_2,
  })
  const before = new Map(memory.files)
  expect(await run(memory, 'music', 'import', 'nope.mid', 'game')).toEqual({
    code: 2,
    out: [],
    err: ['There is no file at nope.mid. Check its name and try again.'],
  })
  for (const file of ['text.mid', 'two.mid']) {
    const said = await run(memory, 'music', 'import', file, 'game')
    expect(said.code, file).toBe(2)
    expect(said.err, file).toEqual([
      'This is not a MIDI file this game can read. Save it as a Standard MIDI File (type 0 or 1).',
    ])
  }
  expect(memory.files).toEqual(before)
})

test('a name a file cannot have is refused, and a game that does not read is not written to', async () => {
  const memory = start(undefined, { 'song.mid': meadowMidi() })
  const said = await run(memory, 'music', 'import', 'song.mid', 'game', '--id', 'My Song')
  expect(said.code).toBe(2)
  expect(said.err[0]).toMatch(/^"My Song" is not a name a file can have\./)
  const broken = start({ ...musicGame(), 'content/levels/level-1.json': '{' }, { 'song.mid': meadowMidi() })
  const refused = await run(broken, 'music', 'import', 'song.mid', 'game')
  expect(refused.code).toBe(2)
  expect(refused.err[0]).toMatch(/^This game does not read yet, so nothing was written\./)
})

test('export writes a song as a MIDI file the game reads back with the same notes', async () => {
  const memory = start()
  const said = await run(memory, 'music', 'export', 'meadow', 'meadow.mid', 'game')
  expect(said).toEqual({ code: 0, out: ['Wrote meadow.mid.'], err: [] })
  expect(memory.files.get('meadow.mid')).toEqual(meadowMidi())

  // Taken in again under a new name, the song plays the same notes.
  const again = await run(memory, 'music', 'import', 'meadow.mid', 'game', '--id', 'meadow-2')
  expect(again.code).toBe(0)
  const read = (id: string) => {
    const path = `content/music/${id}.json`
    const parsed = parseContent('music', text(memory, `game/${path}`), path)
    if (!parsed.ok || parsed.value.format !== 2) throw new Error(`${id} did not read as a format 2 track`)
    return parsed.value
  }
  const loops = Object.fromEntries(
    [...memory.files.keys()]
      .filter((key) => key.startsWith('game/content/loops/'))
      .map((key) => {
        const parsed = parseContent('loop', text(memory, key), key.slice('game/'.length))
        if (!parsed.ok) throw new Error(key)
        return [parsed.value.id, parsed.value]
      }),
  )
  // A drum hit has no length of its own, so a hit is its place and its drum; a note is its place, length and pitch.
  const notes = (id: string): string[] =>
    notesOf(read(id), { loops, motifs: songParts().motifs })
      .map(({ at, ticks, pitch }) =>
        typeof pitch === 'string' ? `${at}:${pitch}` : `${at}:${ticks}:${pitch}`,
      )
      .sort()
  expect(notes('meadow-2').length).toBeGreaterThan(0)
  expect(notes('meadow-2')).toEqual(notes('meadow'))
})

test('export finds a loop and a motif as well as a song, and says what the game has when it finds nothing', async () => {
  const memory = start()
  expect((await run(memory, 'music', 'export', 'easy-drums', 'drums.mid', 'game')).code).toBe(0)
  expect((await run(memory, 'music', 'export', 'hero-theme', 'theme.mid', 'game')).code).toBe(0)
  expect(memory.files.has('drums.mid') && memory.files.has('theme.mid')).toBe(true)
  const said = await run(memory, 'music', 'export', 'nope', 'nope.mid', 'game')
  expect(said).toEqual({
    code: 2,
    out: [],
    err: [
      'There is no track, loop or motif called "nope". This game has: meadow, easy-drums, drum-fill, bouncy-bass, hero-theme.',
    ],
  })
  expect(memory.files.has('nope.mid')).toBe(false)
  const empty = start(musicGame([]))
  expect((await run(empty, 'music', 'export', 'nope', 'nope.mid', 'game')).err).toEqual([
    'There is no track, loop or motif called "nope". This game has none yet.',
  ])
})

test('export --json says where the file went, and --id is for import only', async () => {
  const memory = start()
  const said = await run(memory, 'music', 'export', 'meadow', 'out.mid', 'game', '--json')
  expect(JSON.parse(said.out.join('\n'))).toEqual({ wrote: 'out.mid' })
  const refused = await run(memory, 'music', 'export', 'meadow', 'out.mid', 'game', '--id', 'x')
  expect(refused).toEqual({ code: 2, out: [], err: ['--id is for music import: it names the new song.'] })
})

test('a missing, unknown or extra word says what to type', async () => {
  const memory = start()
  const cases: [string[], string][] = [
    [['music'], MUSIC_USAGE.verb],
    [['music', 'play'], 'automata music has two parts, import and export, and "play" is neither.'],
    [['music', 'import'], MUSIC_USAGE.import],
    [['music', 'export'], MUSIC_USAGE.export],
    [['music', 'export', 'meadow'], MUSIC_USAGE.export],
    [
      ['music', 'import', 'a.mid', 'game', 'extra'],
      'automata music import takes fewer words, but these came after them: extra. A name with a space in it goes in quotes.',
    ],
  ]
  for (const [words, sentence] of cases) {
    expect(await run(memory, ...words), words.join(' ')).toEqual({ code: 2, out: [], err: [sentence] })
  }
})
