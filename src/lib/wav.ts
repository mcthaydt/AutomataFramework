// A WAV file's bytes: a recording is written as one (mono, 16-bit) and any PCM WAV is read. Plain arithmetic on bytes, so
// the same bytes come out of Node and every browser; no clock, no I/O, no Web Audio.

/** A WAV file read: its format and its first channel as numbers from -1 to 1. */
export interface Wav {
  readonly sampleRate: number
  readonly channels: number
  readonly bits: number
  /** The first channel, each sample -1 to 1. */
  readonly samples: Float32Array
}

/** The bytes of the header `encodeWav` writes. */
const HEADER = 44

/** Puts a four-letter tag into the bytes at `at`. */
function putTag(view: DataView, at: number, tag: string): void {
  for (let i = 0; i < 4; i++) view.setUint8(at + i, tag.charCodeAt(i))
}

/** The four letters at `at`, or `''` when the bytes end before them. */
function tagAt(view: DataView, at: number): string {
  if (at + 4 > view.byteLength) return ''
  return String.fromCharCode(
    view.getUint8(at),
    view.getUint8(at + 1),
    view.getUint8(at + 2),
    view.getUint8(at + 3),
  )
}

/**
 * A mono 16-bit WAV: the 44-byte header, then the samples, each held to -1..1 and written as `round(sample * 32767)`.
 * The same samples always give the same bytes.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const dataBytes = samples.length * 2
  const bytes = new Uint8Array(HEADER + dataBytes)
  const view = new DataView(bytes.buffer)
  putTag(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  putTag(view, 8, 'WAVE')
  putTag(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // one channel
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // bytes a second
  view.setUint16(32, 2, true) // bytes in one sample of every channel
  view.setUint16(34, 16, true)
  putTag(view, 36, 'data')
  view.setUint32(40, dataBytes, true)
  for (let i = 0; i < samples.length; i++) {
    const held = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(HEADER + i * 2, Math.round(held * 32767), true)
  }
  return bytes
}

/** One sample of `bits` bits at `at`, as a number from -1 to 1. */
function sampleAt(view: DataView, at: number, bits: number): number {
  if (bits === 8) return Math.max(-1, (view.getUint8(at) - 128) / 127)
  if (bits === 16) return Math.max(-1, view.getInt16(at, true) / 32767)
  if (bits === 24) {
    const unsigned = view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16)
    return Math.max(-1, (unsigned >= 0x800000 ? unsigned - 0x1000000 : unsigned) / 8388607)
  }
  return Math.max(-1, view.getInt32(at, true) / 2147483647)
}

/**
 * Reads PCM WAV of 8, 16, 24 or 32 bits, any number of channels (the first is kept). `undefined` for anything else (a
 * compressed file, a file cut short, no WAV at all); never throws.
 */
export function decodeWav(bytes: Uint8Array): Wav | undefined {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (tagAt(view, 0) !== 'RIFF' || tagAt(view, 8) !== 'WAVE') return undefined
    let format: { channels: number; sampleRate: number; bits: number } | undefined
    let at = 12
    while (at + 8 <= view.byteLength) {
      const tag = tagAt(view, at)
      const size = view.getUint32(at + 4, true)
      const body = at + 8
      if (tag === 'fmt ') {
        if (size < 16 || body + 16 > view.byteLength || view.getUint16(body, true) !== 1) return undefined
        format = {
          channels: view.getUint16(body + 2, true),
          sampleRate: view.getUint32(body + 4, true),
          bits: view.getUint16(body + 14, true),
        }
      } else if (tag === 'data') {
        if (format === undefined || body + size > view.byteLength) return undefined
        const { channels, sampleRate, bits } = format
        if (channels < 1 || sampleRate < 1 || ![8, 16, 24, 32].includes(bits)) return undefined
        const step = (bits / 8) * channels
        const samples = new Float32Array(Math.floor(size / step))
        for (let i = 0; i < samples.length; i++) samples[i] = sampleAt(view, body + i * step, bits)
        return { sampleRate, channels, bits, samples }
      }
      at = body + size + (size % 2)
    }
    return undefined
  } catch {
    return undefined
  }
}
