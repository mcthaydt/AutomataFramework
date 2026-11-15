// A MIDI file read into a song: a format 2 track and the loops it plays. A file has no loops, so they are found: each
// instrument's bars are cut into pieces, a piece that comes again is one loop, and a run of pieces used once is joined
// into a loop of up to eight bars. What the game's music cannot hold is dropped and said in plain sentences.
import { type MidiEvent, readMidi } from '../../lib/midi.ts'
import {
  type ArrangedMusic,
  DRUMS,
  type Drum,
  type Instrument,
  type Key,
  type LoopFile,
  type Mode,
  type MusicBlock,
  type MusicLane,
} from '../content/content.ts'
import { chordOf, keyOfSignature, keyRoot, noteName, scaleOf, stepOffset } from './theory.ts'

/** One thing a file had that the game's music cannot hold. */
export interface MidiDropped {
  /** What kind of thing it was, so a screen can say it in its own words. */
  readonly what: 'moved' | 'tempo' | 'bends' | 'controllers' | 'time' | 'lanes' | 'bars' | 'together' | 'cut'
  /** How many, where it counts. */
  readonly count?: number
  /** The tempo the song keeps, for `tempo`. */
  readonly tempo?: number
  /** The file's beats to a bar, for `time`. */
  readonly beats?: number
  /** The sentence the command line prints. */
  readonly sentence: string
}

/** A song read from a MIDI file. */
export interface MidiImport {
  readonly music: ArrangedMusic
  readonly loops: readonly LoopFile[]
  /** What the file had that the game's music cannot hold, each a whole sentence. Empty when nothing was lost. */
  readonly dropped: readonly MidiDropped[]
  /** For the panel that says what came in. */
  readonly lanes: number
  readonly bars: number
  readonly tempo: number
}

/** Steps in a bar: a file is read at sixteenths. */
const STEPS = 16
/** What is said of the most lanes a track has. */
const LANES_SAID = 'a song has at most eight lanes.'
/** The most bars of a track, of a loop, and the most lanes of a track. */
const MAX_BARS = 128
const MAX_LOOP_BARS = 8
const MAX_LANES = 8
/** The most notes played together in one instrument that are kept: three lanes. */
const MAX_VOICES = 3
/** A pitch under this (C3) is a bass. */
const BASS_BELOW = 48
/** The channel of the drums, counted from 0. */
const DRUM_CHANNEL = 9
/** The note each drum is, as General MIDI has it, in the order a tie goes by. */
const DRUM_NOTES: readonly (readonly [Drum, number])[] = [
  ['kick', 36],
  ['snare', 38],
  ['hat', 42],
  ['clap', 39],
  ['tom', 45],
]
/** The keys tried when a file has no signature, in the order a tie goes by. */
const KEY_ORDER: readonly Key[] = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db', 'F#']
/** The octave a loop's step 1 is in. */
const OCTAVE = { bass: 2, melody: 4 } as const

type Tempo = Extract<MidiEvent, { kind: 'tempo' }>
type Time = Extract<MidiEvent, { kind: 'time' }>
type Signature = Extract<MidiEvent, { kind: 'key' }>

/** One note, on the sixteenth grid: it starts at step `start` and lasts to `end` (not counting it). */
interface Hit {
  readonly start: number
  readonly end: number
  readonly pitch: number
  readonly velocity: number
}

/** One instrument of the file. */
interface Voice {
  readonly drums: boolean
  readonly hits: Hit[]
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

/** The nearest drum to a note number; a tie goes to the first. */
function drumOf(pitch: number): Drum {
  let best = DRUM_NOTES[0] ?? (['kick', 36] as const)
  for (const entry of DRUM_NOTES) if (Math.abs(entry[1] - pitch) < Math.abs(best[1] - pitch)) best = entry
  return best[0]
}

/** The major key whose seven notes cover the most sounding time (call 19). */
function detectKey(hits: readonly Hit[]): Key {
  const time = new Array<number>(12).fill(0)
  for (const hit of hits) time[hit.pitch % 12] = (time[hit.pitch % 12] ?? 0) + hit.end - hit.start
  let best: Key = 'C'
  let most = -1
  for (const key of KEY_ORDER) {
    const root = keyRoot(key)
    const covered = scaleOf('major').reduce((sum, offset) => sum + (time[(root + offset) % 12] ?? 0), 0)
    if (covered > most) {
      best = key
      most = covered
    }
  }
  return best
}

/** The seven triads of a key as numerals: `I ii iii IV V vi vii°` in major, `i ii° III iv v VI VII` in minor. */
function triads(mode: Mode): string[] {
  const scale = scaleOf(mode)
  const names = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  return names.map((name, i) => {
    const root = scale[i] ?? 0
    const third = ((scale[(i + 2) % 7] ?? 0) - root + 12) % 12
    const fifth = ((scale[(i + 4) % 7] ?? 0) - root + 12) % 12
    if (third === 3 && fifth === 6) return `${name.toLowerCase()}°`
    return third === 3 ? name.toLowerCase() : name
  })
}

/** The chord of a bar: the key's own triad whose notes cover the most sounding time (call 20); `I` when nothing sounds. */
function chordOfBar(hits: readonly Hit[], bar: number, key: Key, mode: Mode): string {
  const from = bar * STEPS
  const to = from + STEPS
  const numerals = triads(mode)
  let best = mode === 'minor' ? 'i' : 'I'
  let most = 0
  for (const numeral of numerals) {
    const chord = chordOf(numeral, key, mode)
    const notes = chord.tones.map((tone) => (chord.root + tone) % 12)
    let covered = 0
    for (const hit of hits) {
      const overlap = Math.min(hit.end, to) - Math.max(hit.start, from)
      if (overlap > 0 && notes.includes(hit.pitch % 12)) covered += overlap
    }
    if (covered > most) {
      best = numeral
      most = covered
    }
  }
  return best
}

/** A note as a loop writes it in a bar of `chord`: a step of the chord when one gives that pitch, else the note. */
function tokenOf(pitch: number, chord: string, key: Key, mode: Mode, lane: 'bass' | 'melody'): string {
  const notes = chordOf(chord, key, mode)
  const base = 12 * (OCTAVE[lane] + 1) + notes.root
  for (let step = 1; step <= 15; step++) if (base + stepOffset(notes.scale, step) === pitch) return String(step)
  return noteName(pitch)
}

/** One bar of a lane: for a note lane the row under `line`, for a drum lane a row for each drum that hits. */
type Bar = Readonly<Record<string, readonly string[]>>

const REST = Array.from({ length: STEPS }, () => '-')

/** A bar with nothing in it. */
const silent = (bar: Bar): boolean => Object.values(bar).every((row) => row.every((step) => step === '-'))

/** What a lane comes to once it is cut: its blocks and the loops they use. */
interface Placed {
  readonly blocks: MusicBlock[]
  readonly loops: LoopFile[]
  readonly cut: number
}

/**
 * Cuts a lane's bars into loops (see the top of the file). `bars` is every bar of the lane; `crossed[b]` says a note
 * sounds across the line after bar `b`.
 */
function place(
  bars: readonly Bar[],
  crossed: readonly boolean[],
  name: string,
  shape: (rows: readonly Bar[], id: string) => LoopFile,
): Placed {
  // Pieces: runs of bars with a note across every line inside, at most eight bars each.
  interface Piece {
    readonly at: number
    readonly bars: Bar[]
  }
  const pieces: Piece[] = []
  let cut = 0
  for (let b = 0; b < bars.length; ) {
    const first = bars[b] as Bar
    if (silent(first) && !crossed[b - 1]) {
      b++
      continue
    }
    const run: Bar[] = [first]
    let end = b
    while (crossed[end] && end + 1 < bars.length && run.length < MAX_LOOP_BARS) {
      end++
      run.push(bars[end] as Bar)
    }
    if (crossed[end] && end + 1 < bars.length) cut++
    pieces.push({ at: b, bars: run })
    b = end + 1
  }
  // A piece after a forced cut starts in the middle of a note: its leading holds are rests.
  for (const piece of pieces) {
    if (piece.bars[0]?.line === undefined) continue
    let leading = true
    piece.bars.forEach((bar, i) => {
      const row = (bar.line ?? REST).map((step) => {
        if (step !== '-' && step !== '=') leading = false
        return leading && step === '=' ? '-' : step
      })
      piece.bars[i] = { line: row }
    })
  }
  const keyOf = (piece: Piece): string => JSON.stringify(piece.bars)
  const uses = new Map<string, number>()
  for (const piece of pieces) uses.set(keyOf(piece), (uses.get(keyOf(piece)) ?? 0) + 1)
  // Runs: the same piece again and again in a row, and pieces used once.
  interface Run {
    readonly at: number
    readonly bars: Bar[]
    count: number
    readonly once: boolean
  }
  const runs: Run[] = []
  for (const piece of pieces) {
    const last = runs[runs.length - 1]
    const abuts = last !== undefined && last.at + last.bars.length * last.count === piece.at
    if (last !== undefined && abuts && !last.once && JSON.stringify(last.bars) === keyOf(piece)) last.count++
    else runs.push({ at: piece.at, bars: piece.bars, count: 1, once: uses.get(keyOf(piece)) === 1 })
  }
  const blocks: MusicBlock[] = []
  const loops: LoopFile[] = []
  const known = new Map<string, string>()
  const make = (rows: readonly Bar[]): string => {
    const id = `${name}-${loops.length + 1}`
    loops.push(shape(rows, id))
    return id
  }
  for (let i = 0; i < runs.length; ) {
    const run = runs[i] as Run
    if (!run.once) {
      const key = JSON.stringify(run.bars)
      const id = known.get(key) ?? make(run.bars)
      known.set(key, id)
      blocks.push({ at: run.at + 1, loop: id, bars: run.bars.length * run.count })
      i++
      continue
    }
    // Pieces used once, side by side: one loop of up to eight bars.
    const joined: Bar[] = [...run.bars]
    let next = i + 1
    for (;;) {
      const following = runs[next]
      if (following === undefined || !following.once) break
      const abutting = run.at + joined.length === following.at
      if (!abutting || joined.length + following.bars.length > MAX_LOOP_BARS) break
      joined.push(...following.bars)
      next++
    }
    blocks.push({ at: run.at + 1, loop: make(joined), bars: joined.length })
    i = next
  }
  return { blocks, loops, cut }
}

/** A MIDI file as a format 2 track and its loops. `id` names the track (and starts each loop's id). */
export function midiToMusic(
  bytes: Uint8Array,
  id: string,
):
  | { readonly ok: true; readonly value: MidiImport }
  | { readonly ok: false; readonly why: 'not-midi' | 'no-notes'; readonly message: string } {
  const file = readMidi(bytes)
  if (file === undefined)
    return {
      ok: false,
      why: 'not-midi',
      message: 'This is not a MIDI file this game can read. Save it as a Standard MIDI File (type 0 or 1).',
    }
  const events: MidiEvent[] = file.tracks.flat()
  const stepTicks = file.division / 4
  let moved = 0
  let beyond = false
  const channels = new Map<number, Hit[]>()
  for (const event of events) {
    if (event.kind !== 'note') continue
    const exact = event.tick / stepTicks
    // A note out of the range a note name can write is passed over.
    if (event.channel !== DRUM_CHANNEL && (event.pitch < 12 || event.pitch > 119)) continue
    const start = Math.round(exact)
    if (start !== exact) moved++
    if (start >= MAX_BARS * STEPS) {
      beyond = true
      continue
    }
    const reach = Math.round((event.tick + event.ticks) / stepTicks)
    const end = Math.min(MAX_BARS * STEPS, Math.max(start + 1, reach))
    const list = channels.get(event.channel)
    const hit = { start, end, pitch: event.pitch, velocity: event.velocity }
    if (list === undefined) channels.set(event.channel, [hit])
    else list.push(hit)
  }
  if (channels.size === 0 && !beyond)
    return { ok: false, why: 'no-notes', message: 'This MIDI file has no notes.' }

  const dropped: MidiDropped[] = []
  // Tempo: the first, and whether it changes later.
  const tempos = events.filter((event): event is Tempo => event.kind === 'tempo')
  const tempo = Math.max(30, Math.min(300, Math.round(tempos[0]?.bpm ?? 120)))
  const changes = tempos.slice(1).some((event) => Math.round(event.bpm) !== Math.round(tempos[0]?.bpm ?? 120))
  const time = events.find((event): event is Time => event.kind === 'time')
  const odd = time !== undefined && (time.beats !== 4 || time.unit !== 4)

  // Instruments: a channel is one, and a channel playing several notes at once is spread over up to three.
  const voices: Voice[] = []
  let together = false
  for (const [channel, hits] of [...channels].sort((a, b) => a[0] - b[0])) {
    if (channel === DRUM_CHANNEL) {
      voices.push({ drums: true, hits })
      continue
    }
    const spread: Hit[][] = []
    const endsAt: number[] = []
    for (const hit of [...hits].sort((a, b) => a.start - b.start || b.pitch - a.pitch)) {
      const free = endsAt.findIndex((end) => end <= hit.start)
      const voice = free >= 0 ? free : endsAt.length < MAX_VOICES ? endsAt.length : -1
      if (voice < 0) {
        together = true
        continue
      }
      endsAt[voice] = hit.end
      const list = spread[voice]
      if (list === undefined) spread[voice] = [hit]
      else list.push(hit)
    }
    for (const list of spread) voices.push({ drums: false, hits: list })
  }
  // At most eight lanes: the busiest are kept, in the order they came.
  const kept = new Set(
    voices
      .map((voice, index) => ({ index, count: voice.hits.length }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .slice(0, MAX_LANES)
      .map((entry) => entry.index),
  )
  const lanes = voices.filter((_, index) => kept.has(index))
  const lost = voices.length - lanes.length
  // The drums come first, then the rest as they came.
  lanes.sort((a, b) => Number(b.drums) - Number(a.drums))

  const sounding = lanes.flatMap((lane) => (lane.drums ? [] : lane.hits))
  let last = 0
  for (const lane of lanes)
    for (const hit of lane.hits) last = Math.max(last, lane.drums ? hit.start + 1 : hit.end)
  const bars = Math.max(1, Math.min(MAX_BARS, Math.ceil(last / STEPS)))
  const signature = events.find((event): event is Signature => event.kind === 'key')
  const { key, mode } =
    signature === undefined
      ? { key: detectKey(sounding), mode: 'major' as Mode }
      : keyOfSignature(signature.sharps, signature.minor)
  const chords = Array.from({ length: bars }, (_, bar) => chordOfBar(sounding, bar, key, mode))

  const loops: LoopFile[] = []
  const musicLanes: MusicLane[] = []
  let cuts = 0
  let taken = false
  lanes.forEach((lane, index) => {
    const volume = lane.hits.reduce((sum, hit) => sum + hit.velocity, 0) / lane.hits.length / 127
    const pitches = lane.hits.map((hit) => hit.pitch).sort((a, b) => a - b)
    const middle = pitches[Math.floor(pitches.length / 2)] ?? 60
    const bass = !lane.drums && middle < BASS_BELOW
    const instrument: Instrument = lane.drums ? 'drums' : bass ? 'bass' : 'keys'
    const laneId = lane.drums ? 'drums' : bass && !taken ? 'bass' : `lane-${index + 1}`
    if (laneId === 'bass') taken = true
    const rows: Bar[] = Array.from({ length: bars }, () => ({}))
    const crossed = new Array<boolean>(bars).fill(false)
    for (const hit of lane.hits) {
      const bar = Math.floor(hit.start / STEPS)
      if (lane.drums) {
        const drum = drumOf(hit.pitch)
        const row = [...(rows[bar]?.[drum] ?? REST)]
        row[hit.start % STEPS] = 'x'
        rows[bar] = { ...rows[bar], [drum]: row }
        continue
      }
      const token = tokenOf(hit.pitch, chords[bar] ?? 'I', key, mode, bass ? 'bass' : 'melody')
      for (let step = hit.start; step < Math.min(hit.end, bars * STEPS); step++) {
        const at = Math.floor(step / STEPS)
        const row = [...(rows[at]?.line ?? REST)]
        row[step % STEPS] = step === hit.start ? token : '='
        rows[at] = { line: row }
        if (step % STEPS === STEPS - 1 && step + 1 < hit.end) crossed[at] = true
      }
    }
    const name = `${id}-${laneId}`
    const shape = (piece: readonly Bar[], loopId: string): LoopFile => {
      if (lane.drums) {
        const notes: Partial<Record<Drum, string[]>> = {}
        for (const drum of DRUMS)
          if (piece.some((bar) => bar[drum]?.includes('x')))
            notes[drum] = piece.map((bar) => (bar[drum] ?? REST).join(' '))
        return { format: 1, id: loopId, lane: 'drums', bars: piece.length, stepsPerBar: STEPS, notes }
      }
      return {
        format: 1,
        id: loopId,
        lane: bass ? 'bass' : 'melody',
        bars: piece.length,
        stepsPerBar: STEPS,
        notes: piece.map((bar) => (bar.line ?? REST).join(' ')),
      }
    }
    const placed = place(
      rows.map((bar) => (lane.drums || bar.line !== undefined ? bar : { line: REST })),
      crossed,
      name,
      shape,
    )
    cuts += placed.cut
    loops.push(...placed.loops)
    musicLanes.push({
      id: laneId,
      instrument,
      volume: Math.max(0.01, Math.round(volume * 100) / 100),
      blocks: placed.blocks,
    })
  })

  if (moved > 0)
    dropped.push({
      what: 'moved',
      count: moved,
      sentence: `${plural(moved, 'note was', 'notes were')} moved to the nearest sixteenth.`,
    })
  if (changes)
    dropped.push({
      what: 'tempo',
      tempo,
      sentence: `The tempo changes after the start were dropped; the song keeps ${tempo} beats a minute.`,
    })
  const bends = file.skipped['pitch bends'] ?? 0
  if (bends > 0) dropped.push({ what: 'bends', count: bends, sentence: 'Pitch bends were dropped.' })
  const controllers = file.skipped.controllers ?? 0
  if (controllers > 0)
    dropped.push({
      what: 'controllers',
      count: controllers,
      sentence: 'Controllers (like the sustain pedal) were dropped.',
    })
  if (odd)
    dropped.push({
      what: 'time',
      beats: time.beats,
      sentence: `The file is in ${time.beats}/${time.unit}; it was read as four beats to a bar.`,
    })
  if (lost > 0)
    dropped.push({
      what: 'lanes',
      count: lost,
      sentence: `${plural(lost, 'instrument was', 'instruments were')} dropped: ${LANES_SAID}`,
    })
  if (beyond) dropped.push({ what: 'bars', sentence: `Notes after bar ${MAX_BARS} were dropped.` })
  if (together)
    dropped.push({ what: 'together', sentence: 'Some notes played together in one instrument were dropped.' })
  if (cuts > 0)
    dropped.push({
      what: 'cut',
      count: cuts,
      sentence: `${plural(cuts, 'long note was', 'long notes were')} cut at the end of a loop.`,
    })

  const music: ArrangedMusic = {
    format: 2,
    id,
    tempo,
    key,
    mode,
    bars,
    loop: true,
    volume: 1,
    chords,
    lanes: musicLanes,
  }
  return { ok: true, value: { music, loops, dropped, lanes: musicLanes.length, bars, tempo } }
}
