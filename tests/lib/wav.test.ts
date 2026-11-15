import { expect, test } from 'vitest'
import { decodeWav, encodeWav } from '#src/lib/wav.ts'

/** A PCM WAV with the fields a test chooses, the samples as the integers to write. */
function wavOf(options: {
  channels?: number
  rate?: number
  bits?: 8 | 16 | 24 | 32
  tag?: number
  values: readonly number[]
}): Uint8Array {
  const { channels = 1, rate = 44100, bits = 16, tag = 1, values } = options
  const width = bits / 8
  const data = values.length * width
  const bytes = new Uint8Array(44 + data)
  const view = new DataView(bytes.buffer)
  const put = (at: number, text: string): void => {
    for (let i = 0; i < 4; i++) view.setUint8(at + i, text.charCodeAt(i))
  }
  put(0, 'RIFF')
  view.setUint32(4, 36 + data, true)
  put(8, 'WAVE')
  put(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, tag, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * channels * width, true)
  view.setUint16(32, channels * width, true)
  view.setUint16(34, bits, true)
  put(36, 'data')
  view.setUint32(40, data, true)
  values.forEach((value, i) => {
    const at = 44 + i * width
    if (bits === 8) view.setUint8(at, value)
    else if (bits === 16) view.setInt16(at, value, true)
    else if (bits === 24) {
      view.setUint8(at, value & 0xff)
      view.setUint8(at + 1, (value >> 8) & 0xff)
      view.setUint8(at + 2, (value >> 16) & 0xff)
    } else view.setInt32(at, value, true)
  })
  return bytes
}

test('a recording is written as a 44-byte header and 16-bit samples', () => {
  const bytes = encodeWav(new Float32Array([0, 1, -1]), 44100)
  expect(bytes.length).toBe(44 + 6)
  expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
  expect(String.fromCharCode(...bytes.slice(8, 16))).toBe('WAVEfmt ')
  const view = new DataView(bytes.buffer)
  expect(view.getUint32(24, true)).toBe(44100)
  expect(view.getInt16(44, true)).toBe(0)
  expect(view.getInt16(46, true)).toBe(32767)
  expect(view.getInt16(48, true)).toBe(-32767)
})

test('a sample outside -1 to 1 is held to it', () => {
  const view = new DataView(encodeWav(new Float32Array([5, -5]), 8000).buffer)
  expect(view.getInt16(44, true)).toBe(32767)
  expect(view.getInt16(46, true)).toBe(-32767)
})

test('what is written reads back, to a step of 16 bits', () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25])
  const wav = decodeWav(encodeWav(samples, 22050))
  expect(wav).toMatchObject({ sampleRate: 22050, channels: 1, bits: 16 })
  samples.forEach((s, i) => expect(wav?.samples[i]).toBeCloseTo(s, 4))
})

test('the same samples give the same bytes', () => {
  const samples = new Float32Array([0.1, 0.2, 0.3])
  expect(encodeWav(samples, 44100)).toEqual(encodeWav(samples, 44100))
})

test('8-bit, 24-bit and 32-bit files read', () => {
  expect(decodeWav(wavOf({ bits: 8, values: [128, 255, 0] }))?.samples[1]).toBeCloseTo(1, 5)
  const deep = decodeWav(wavOf({ bits: 24, values: [8388607, -8388607 & 0xffffff] }))
  expect(deep?.samples[0]).toBeCloseTo(1, 5)
  expect(deep?.samples[1]).toBeCloseTo(-1, 5)
  expect(decodeWav(wavOf({ bits: 32, values: [2147483647, 0] }))?.samples[0]).toBeCloseTo(1, 5)
})

test('only the first channel of a stereo file is kept', () => {
  const wav = decodeWav(wavOf({ channels: 2, values: [16384, -16384, 8192, -8192] }))
  expect(wav?.channels).toBe(2)
  expect(wav?.samples.length).toBe(2)
  expect(wav?.samples[0]).toBeCloseTo(0.5, 3)
  expect(wav?.samples[1]).toBeCloseTo(0.25, 3)
})

test('a file that is not a WAV, is compressed or is cut short reads as nothing', () => {
  expect(decodeWav(new Uint8Array([1, 2, 3]))).toBeUndefined()
  expect(decodeWav(new Uint8Array(0))).toBeUndefined()
  expect(decodeWav(wavOf({ tag: 3, values: [1, 2] }))).toBeUndefined()
  const whole = wavOf({ values: [1, 2, 3, 4] })
  expect(decodeWav(whole.slice(0, 46))).toBeUndefined()
  const notWave = whole.slice()
  notWave[8] = 0x58
  expect(decodeWav(notWave)).toBeUndefined()
})

test('a chunk before the data is stepped over', () => {
  const plain = wavOf({ values: [100, 200] })
  const extra = new Uint8Array([76, 73, 83, 84, 3, 0, 0, 0, 1, 2, 3, 0])
  const bytes = new Uint8Array(plain.length + extra.length)
  bytes.set(plain.slice(0, 36), 0)
  bytes.set(extra, 36)
  bytes.set(plain.slice(36), 36 + extra.length)
  expect(decodeWav(bytes)?.samples.length).toBe(2)
})
