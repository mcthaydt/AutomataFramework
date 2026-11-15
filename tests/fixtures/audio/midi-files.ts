// Small MIDI files typed as bytes, each with a comment that says what it holds.

/** A chunk: its four-letter tag, its length and its bytes. */
const chunk = (tag: string, body: readonly number[]): number[] => [
  ...[...tag].map((letter) => letter.charCodeAt(0)),
  0,
  0,
  (body.length >> 8) & 0xff,
  body.length & 0xff,
  ...body,
]

/** A file: its header (format, track count, division) and its tracks, each given as the bytes of its events. */
export function midiFile(
  format: number,
  division: number,
  ...tracks: readonly (readonly number[])[]
): Uint8Array {
  const header = [0, format, 0, tracks.length, (division >> 8) & 0xff, division & 0xff]
  return new Uint8Array([...chunk('MThd', header), ...tracks.flatMap((track) => chunk('MTrk', track))])
}

/** The end of a track. */
export const END: readonly number[] = [0x00, 0xff, 0x2f, 0x00]
/** A tempo of 120 beats a minute (500 000 microseconds a quarter note), at the start. */
export const TEMPO_120: readonly number[] = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]

/**
 * Format 0, 96 ticks to a quarter: a tempo of 120; a C4 on channel 0 at tick 0 for a quarter (velocity 100); an E4 on
 * channel 1 at tick 96 for a quarter (velocity 80).
 */
export const FORMAT_0: Uint8Array = midiFile(0, 96, [
  ...TEMPO_120,
  ...[0x00, 0x90, 0x3c, 0x64],
  ...[0x60, 0x80, 0x3c, 0x40],
  ...[0x00, 0x91, 0x40, 0x50],
  ...[0x60, 0x81, 0x40, 0x00],
  ...END,
])

/**
 * Running status, 96 ticks to a quarter: a C4 on at tick 0, then a D4 on at tick 96 without saying "note on" again, then
 * the C4 off at tick 192 as a note-on of velocity 0, then the D4 off at tick 288 the same way.
 */
export const RUNNING: Uint8Array = midiFile(0, 96, [
  ...[0x00, 0x90, 0x3c, 0x64],
  ...[0x60, 0x3e, 0x64],
  ...[0x60, 0x3c, 0x00],
  ...[0x60, 0x3e, 0x00],
  ...END,
])

/**
 * A C4 for a quarter with, around it, one of each thing a song has no use for: a pitch bend, a controller (the sustain
 * pedal), a program change, a channel pressure, a key pressure, a system-exclusive message and a text meta event.
 */
export const EXTRAS: Uint8Array = midiFile(0, 96, [
  ...[0x00, 0xe0, 0x00, 0x40],
  ...[0x00, 0xb0, 0x40, 0x7f],
  ...[0x00, 0xc0, 0x05],
  ...[0x00, 0xd0, 0x30],
  ...[0x00, 0xa0, 0x3c, 0x40],
  ...[0x00, 0xf0, 0x03, 0x7e, 0x7f, 0xf7],
  ...[0x00, 0xff, 0x01, 0x02, 0x68, 0x69],
  ...[0x00, 0x90, 0x3c, 0x64],
  ...[0x60, 0x80, 0x3c, 0x00],
  ...END,
])

/** A C4 switched on at tick 0 and never off; the track ends at tick 480 (a name event is the last thing in it). */
export const STUCK: Uint8Array = midiFile(1, 480, [
  ...[0x00, 0x90, 0x3c, 0x64],
  ...[0x83, 0x60, 0xff, 0x03, 0x01, 0x78],
  ...END,
])

/** Format 2 (separate songs), which a song cannot use. */
export const FORMAT_2: Uint8Array = new Uint8Array([
  ...chunk('MThd', [0, 2, 0, 1, 0, 96]),
  ...chunk('MTrk', END),
])

/** SMPTE time (frames a second, not quarter notes), which a song cannot use. */
export const SMPTE: Uint8Array = new Uint8Array([
  ...chunk('MThd', [0, 1, 0, 1, 0xe7, 0x28]),
  ...chunk('MTrk', END),
])

/** The start of a WAV file, which is not MIDI. */
export const RIFF: Uint8Array = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
])
