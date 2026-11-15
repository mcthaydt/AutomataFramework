// The song a track says, taken out as MIDI and read back, is the song it was: the same pitch, tick and length for every
// note, the same drum at the same tick for every hit, and nothing dropped. Run in Node and the three browsers.
import { expect, test } from 'vitest'
import { LIBRARY, midiToMusic, musicToMidi, notesOf, type PlainNote } from '#src/features/audio/audio.ts'
import type { ArrangedMusic } from '#src/features/content/content.ts'
import { meadow, songParts } from '../../fixtures/audio/song.ts'

/** What a song sounds like, without the lane it is in or how loud: one line a note, in a fixed order. */
function sounding(notes: readonly PlainNote[]): string[] {
  return notes
    .map((note) =>
      typeof note.pitch === 'string' ? `${note.at} ${note.pitch}` : `${note.at} ${note.pitch} ${note.ticks}`,
    )
    .sort()
}

function roundTrip(track: ArrangedMusic, parts: ReturnType<typeof songParts>): void {
  const result = midiToMusic(musicToMidi({ type: 'music', value: track }, parts), track.id)
  if (!result.ok) throw new Error(result.message)
  const back = { loops: Object.fromEntries(result.value.loops.map((loop) => [loop.id, loop])) }
  expect(result.value.dropped).toEqual([])
  expect(result.value.music).toMatchObject({ tempo: track.tempo, key: track.key, mode: track.mode, bars: track.bars })
  expect(sounding(notesOf(result.value.music, back))).toEqual(sounding(notesOf(track, parts)))
}

test('the fixture song comes back from MIDI as the same notes', () => roundTrip(meadow(), songParts()))

test.each(LIBRARY.styles.map((style) => style.id))('the %s style comes back from MIDI as the same notes', (id) => {
  const style = LIBRARY.styles.find((entry) => entry.id === id)
  if (style === undefined) throw new Error(`no style ${id}`)
  const loops = Object.fromEntries(LIBRARY.loops.map((loop) => [loop.id, loop]))
  roundTrip(style, { loops, motifs: {} } as ReturnType<typeof songParts>)
})
