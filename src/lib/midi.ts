// A Standard MIDI File's bytes: read into events and written back from them. Plain arithmetic on bytes, so the same bytes
// come out of Node and every browser; no clock, no I/O. Only what a song needs is kept (notes, tempo, key, time and a
// track's name); the rest is counted in `skipped` so a caller can say what was lost.

/** One thing in a track. Every `tick` counts from the start of the file, in `division` ticks to a quarter note. */
export type MidiEvent =
  | {
      readonly kind: 'note'
      readonly tick: number
      /** How long it lasts, in ticks. */
      readonly ticks: number
      /** 0 to 15. Channel 9 is the drums, which a player calls channel 10. */
      readonly channel: number
      readonly pitch: number
      readonly velocity: number
    }
  | {
      readonly kind: 'tempo'
      readonly tick: number
      /** Beats a minute, to two places. */
      readonly bpm: number
    }
  | {
      readonly kind: 'key'
      readonly tick: number
      /** -7 (seven flats) to 7 (seven sharps). */
      readonly sharps: number
      readonly minor: boolean
    }
  | { readonly kind: 'time'; readonly tick: number; readonly beats: number; readonly unit: number }
  | { readonly kind: 'name'; readonly tick: number; readonly text: string }

/** A file read. */
export interface MidiFile {
  /** Ticks to a quarter note. */
  readonly division: number
  readonly tracks: readonly (readonly MidiEvent[])[]
  /** Where the longest track ends, in ticks: its end-of-track, which may come after the last note. */
  readonly length: number
  /** What the file had that these events cannot hold, counted by sort: `{ 'pitch bends': 12, controllers: 40 }`. */
  readonly skipped: Readonly<Record<string, number>>
}

/** The tag of a chunk at `at`, or `''` when the bytes end first. */
function tagAt(bytes: Uint8Array, at: number): string {
  if (at + 4 > bytes.length) return ''
  return String.fromCharCode(bytes[at] ?? 0, bytes[at + 1] ?? 0, bytes[at + 2] ?? 0, bytes[at + 3] ?? 0)
}

/** A note that has started and not yet stopped. */
interface Open {
  readonly tick: number
  readonly velocity: number
  readonly order: number
}

/** An event with the place it was found in, so events at one tick keep their order. */
interface Found {
  readonly order: number
  readonly event: MidiEvent
}

/** Reads one track's `length` bytes from `start`. `undefined` for bytes that do not make sense. */
function readTrack(
  bytes: Uint8Array,
  start: number,
  end: number,
  skipped: Record<string, number>,
): { readonly events: MidiEvent[]; readonly end: number } | undefined {
  const count = (what: string): void => {
    skipped[what] = (skipped[what] ?? 0) + 1
  }
  const found: Found[] = []
  const open = new Map<number, Open[]>()
  let at = start
  let tick = 0
  let status = 0
  let order = 0
  let ended = false
  const byte = (): number => {
    const value = bytes[at]
    at++
    return value ?? 0
  }
  /** A variable-length number: seven bits a byte, the high bit set on every byte but the last. */
  const variable = (): number | undefined => {
    let value = 0
    for (let i = 0; i < 4; i++) {
      if (at >= end) return undefined
      const next = byte()
      value = value * 128 + (next & 0x7f)
      if (next < 0x80) return value
    }
    return undefined
  }
  const stop = (channel: number, pitch: number): void => {
    const list = open.get(channel * 128 + pitch)
    const first = list?.shift()
    if (first === undefined) return
    found.push({
      order: first.order,
      event: {
        kind: 'note',
        tick: first.tick,
        ticks: tick - first.tick,
        channel,
        pitch,
        velocity: first.velocity,
      },
    })
  }
  while (at < end && !ended) {
    const delta = variable()
    if (delta === undefined) return undefined
    tick += delta
    if (at >= end) return undefined
    let first = bytes[at] ?? 0
    if (first >= 0x80) {
      at++
      status = first
    } else {
      // Running status: the byte is the first of data for the last status.
      if (status < 0x80 || status >= 0xf0) return undefined
      first = status
    }
    if (first === 0xff) {
      status = 0
      if (at + 1 > end) return undefined
      const type = byte()
      const length = variable()
      if (length === undefined || at + length > end) return undefined
      const data = bytes.subarray(at, at + length)
      at += length
      if (type === 0x2f) ended = true
      else if (type === 0x51 && length === 3) {
        const micros = ((data[0] ?? 0) << 16) | ((data[1] ?? 0) << 8) | (data[2] ?? 0)
        // To two places, so a whole number of beats a minute written as microseconds reads back whole.
        const bpm = Math.round(6000000000 / micros) / 100
        if (micros > 0) found.push({ order: order++, event: { kind: 'tempo', tick, bpm } })
      } else if (type === 0x59 && length === 2) {
        const sharps = ((data[0] ?? 0) << 24) >> 24
        found.push({ order: order++, event: { kind: 'key', tick, sharps, minor: data[1] === 1 } })
      } else if (type === 0x58 && length >= 2) {
        found.push({
          order: order++,
          event: { kind: 'time', tick, beats: data[0] ?? 4, unit: 2 ** (data[1] ?? 2) },
        })
      } else if (type === 0x03)
        found.push({ order: order++, event: { kind: 'name', tick, text: new TextDecoder().decode(data) } })
      else count('meta events')
      continue
    }
    if (first === 0xf0 || first === 0xf7) {
      status = 0
      const length = variable()
      if (length === undefined || at + length > end) return undefined
      at += length
      count('system messages')
      continue
    }
    if (first >= 0xf1) return undefined
    const channel = first & 0x0f
    const kind = first >> 4
    const size = kind === 0xc || kind === 0xd ? 1 : 2
    if (at + size > end) return undefined
    const one = byte()
    const two = size === 2 ? byte() : 0
    if (kind === 0x9 && two > 0) {
      const key = channel * 128 + one
      const list = open.get(key)
      const note: Open = { tick, velocity: two, order: order++ }
      if (list === undefined) open.set(key, [note])
      else list.push(note)
    } else if (kind === 0x8 || kind === 0x9) stop(channel, one)
    else if (kind === 0xa || kind === 0xd) count('aftertouch')
    else if (kind === 0xb) count('controllers')
    else if (kind === 0xc) count('programs')
    else count('pitch bends')
  }
  // A note left on ends where the track does.
  for (const [key, list] of open)
    for (const note of list)
      found.push({
        order: note.order,
        event: {
          kind: 'note',
          tick: note.tick,
          ticks: tick - note.tick,
          channel: Math.floor(key / 128),
          pitch: key % 128,
          velocity: note.velocity,
        },
      })
  const events = found
    .sort((a, b) => a.event.tick - b.event.tick || a.order - b.order)
    .map((entry) => entry.event)
  return { events, end: tick }
}

/**
 * Reads a Standard MIDI File, format 0 or 1. A note-on with no note-off ends at the track's end, and a note-on with
 * velocity 0 is a note-off. `undefined` when the bytes are not such a file (format 2, SMPTE time, a cut chunk, no
 * `MThd`). Never throws.
 */
export function readMidi(bytes: Uint8Array): MidiFile | undefined {
  if (tagAt(bytes, 0) !== 'MThd' || bytes.length < 14) return undefined
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const headerLength = view.getUint32(4)
  if (headerLength < 6 || 8 + headerLength > bytes.length) return undefined
  const format = view.getUint16(8)
  const declared = view.getUint16(10)
  const division = view.getUint16(12)
  if (format > 1 || division === 0 || division >= 0x8000) return undefined
  const skipped: Record<string, number> = {}
  const tracks: MidiEvent[][] = []
  let length = 0
  let at = 8 + headerLength
  while (at + 8 <= bytes.length && tracks.length < declared) {
    const tag = tagAt(bytes, at)
    const length = view.getUint32(at + 4)
    if (at + 8 + length > bytes.length) return undefined
    if (tag === 'MTrk') {
      const track = readTrack(bytes, at + 8, at + 8 + length, skipped)
      if (track === undefined) return undefined
      tracks.push(track.events)
      length = Math.max(length, track.end)
    }
    at += 8 + length
  }
  if (tracks.length < declared || tracks.length === 0) return undefined
  return { division, tracks, length, skipped }
}

/** A variable-length number as bytes. */
function variableBytes(value: number): number[] {
  const out = [value & 0x7f]
  let rest = Math.floor(value / 128)
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80)
    rest = Math.floor(rest / 128)
  }
  return out
}

/** One thing to write: its tick, where it sorts among events at one tick, and its bytes (after the delta). */
interface Piece {
  readonly tick: number
  /** 0 for a meta event, 1 for a note-off, 2 for a note-on: offs come before ons at one tick. */
  readonly rank: number
  readonly bytes: readonly number[]
}

/** The bytes of one track's events. */
function trackPieces(events: readonly MidiEvent[]): Piece[] {
  const pieces: Piece[] = []
  for (const event of events) {
    if (event.kind === 'note') {
      pieces.push({ tick: event.tick, rank: 2, bytes: [0x90 | event.channel, event.pitch, event.velocity] })
      pieces.push({ tick: event.tick + event.ticks, rank: 1, bytes: [0x80 | event.channel, event.pitch, 0] })
    } else if (event.kind === 'tempo') {
      const micros = Math.round(60000000 / event.bpm)
      pieces.push({
        tick: event.tick,
        rank: 0,
        bytes: [0xff, 0x51, 3, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff],
      })
    } else if (event.kind === 'key')
      pieces.push({
        tick: event.tick,
        rank: 0,
        bytes: [0xff, 0x59, 2, event.sharps & 0xff, event.minor ? 1 : 0],
      })
    else if (event.kind === 'time')
      pieces.push({
        tick: event.tick,
        rank: 0,
        bytes: [0xff, 0x58, 4, event.beats, Math.round(Math.log2(event.unit)), 24, 8],
      })
    else {
      const text = new TextEncoder().encode(event.text)
      pieces.push({ tick: event.tick, rank: 0, bytes: [0xff, 0x03, ...variableBytes(text.length), ...text] })
    }
  }
  // The sort is stable, so events of one kind at one tick stay in the order they were given.
  return pieces.sort((a, b) => a.tick - b.tick || a.rank - b.rank)
}

/**
 * Writes a format 1 file: each track's events in tick order, note-offs before note-ons at one tick, running status not
 * used, an end-of-track after the last event or at `length`, whichever is later. The same input gives the same bytes.
 */
export function writeMidi(
  file: Pick<MidiFile, 'division' | 'tracks'> & { readonly length?: number },
): Uint8Array<ArrayBuffer> {
  const out: number[] = []
  const u16 = (value: number): void => void out.push((value >> 8) & 0xff, value & 0xff)
  const u32 = (value: number): void =>
    void out.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff)
  out.push(0x4d, 0x54, 0x68, 0x64)
  u32(6)
  u16(1)
  u16(file.tracks.length)
  u16(file.division)
  for (const events of file.tracks) {
    const body: number[] = []
    let last = 0
    for (const piece of trackPieces(events)) {
      body.push(...variableBytes(piece.tick - last), ...piece.bytes)
      last = piece.tick
    }
    // The track ends at `length` when that is later than its last event, so a song's quiet last bar is kept.
    body.push(...variableBytes(Math.max(0, (file.length ?? 0) - last)), 0xff, 0x2f, 0)
    out.push(0x4d, 0x54, 0x72, 0x6b)
    u32(body.length)
    for (const value of body) out.push(value)
  }
  return new Uint8Array(out)
}
