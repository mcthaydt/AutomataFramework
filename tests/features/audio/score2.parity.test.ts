// A song is scored the same in every engine: the notes of the fixture song, as one recorded hash, and the words of a song
// whose loops are missing.
import { expect, test } from 'vitest'
import { scoreOf } from '#src/features/audio/audio.ts'
import { canonicalJson, utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { meadow, songParts } from '../../fixtures/audio/song.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/song.json' with { type: 'json' }

test('the song is eight bars of four beats at 110 beats a minute, and loops', () => {
  const score = scoreOf(meadow(), songParts())
  expect(score).toMatchObject({ id: 'meadow', seconds: (8 * 4 * 60) / 110, loop: true })
  const times = score.notes.map((note) => note.at)
  expect(times).toEqual([...times].sort((a, b) => a - b))
  expect(score.notes[0]?.part).toBe('drums')
})

test('the song is the same score in every engine', () => {
  const score = scoreOf(meadow(), songParts())
  expectRecorded('score', hex64(xxhash64(utf8(canonicalJson(score)))), golden.score)
})

test('a song with no loops or motifs to play says which one is missing', () =>
  expect(() => scoreOf(meadow())).toThrow(
    'The track "meadow" uses a loop called "easy-drums", which this game does not have.',
  ))
