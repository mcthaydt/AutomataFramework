// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/world/snapshot.ts
// Snapshot format v1, little-endian throughout:
//   header   "AUTO" | version u16 | schemaHash u64 | contentHash u64 | tick u32 | tickHz u16
//   sections [tag u8 | byteLength u32 | payload] in fixed order: 1 strings, 2 rng, 3 resources, 4 entities,
//   then 6 plugin state only when a plugin keeps engine state, so other snapshots are unchanged
// Floats are written with DataView; values are finite by construction (coerceField), so bytes are canonical.

import { utf8 } from '../../lib/canonical.ts'
import { hex64, xxhash64 } from '../../lib/xxhash64.ts'
import type { ComponentDef } from './definitions.ts'
import type { FieldRecord } from './entity-store.ts'
import type { FieldType } from './fields.ts'
import type { RngState } from './rng.ts'

/**
 * The snapshot format version this build reads and writes; a snapshot of another version fails with
 * `SnapshotFormatError`.
 */
export const SNAPSHOT_VERSION = 1
const MAGIC = [65, 85, 84, 79] // "AUTO"
const TAG = { strings: 1, rng: 2, resources: 3, entities: 4, pluginState: 6 } as const

/**
 * Snapshot bytes that are not a valid snapshot of this format version: bad magic, an unsupported version,
 * truncated or malformed sections.
 */
export class SnapshotFormatError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(`snapshot format: ${message}`, options)
    this.name = 'SnapshotFormatError'
  }
}

/**
 * A valid snapshot that belongs to another sim: `field` names the header value that differs (`schemaHash`,
 * `contentHash` or `tickHz`), with this sim's `expected` value and the snapshot's `actual` one.
 */
export class SnapshotMismatchError extends Error {
  readonly field: 'schemaHash' | 'contentHash' | 'tickHz'
  readonly expected: string
  readonly actual: string
  constructor(field: 'schemaHash' | 'contentHash' | 'tickHz', expected: string, actual: string) {
    super(`snapshot ${field} mismatch: this sim has ${expected}, the snapshot has ${actual}`)
    this.name = 'SnapshotMismatchError'
    this.field = field
    this.expected = expected
    this.actual = actual
  }
}

export interface SnapshotData {
  readonly schemaHash: bigint
  readonly contentHash: bigint
  readonly tick: number
  readonly tickHz: number
  /** One RNG state per system, in execution order. */
  readonly rng: ReadonlyArray<{ readonly name: string; readonly state: RngState }>
  /** Canonical JSON per resource, sorted by id. */
  readonly resources: ReadonlyArray<{ readonly id: string; readonly json: string }>
  readonly nextId: number
  /** Live entities in ascending StableId order; component id -> field values. */
  readonly entities: ReadonlyArray<{
    readonly sid: number
    readonly components: ReadonlyMap<string, FieldRecord>
  }>
  /** Section 6: each stateful plugin's own bytes, in canonical plugin order. Empty means no section 6. */
  readonly plugins: ReadonlyArray<{ readonly name: string; readonly bytes: Uint8Array }>
}

class Writer {
  private buf = new Uint8Array(256)
  private view = new DataView(this.buf.buffer)
  length = 0
  private grow(n: number): void {
    if (this.length + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.length + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf)
    this.buf = next
    this.view = new DataView(next.buffer)
  }
  u8(v: number): void {
    this.grow(1)
    this.view.setUint8(this.length, v)
    this.length += 1
  }
  u16(v: number): void {
    this.grow(2)
    this.view.setUint16(this.length, v, true)
    this.length += 2
  }
  u32(v: number): void {
    this.grow(4)
    this.view.setUint32(this.length, v, true)
    this.length += 4
  }
  i32(v: number): void {
    this.grow(4)
    this.view.setInt32(this.length, v, true)
    this.length += 4
  }
  u64(v: bigint): void {
    this.grow(8)
    this.view.setBigUint64(this.length, v, true)
    this.length += 8
  }
  f32(v: number): void {
    this.grow(4)
    this.view.setFloat32(this.length, v, true)
    this.length += 4
  }
  f64(v: number): void {
    this.grow(8)
    this.view.setFloat64(this.length, v, true)
    this.length += 8
  }
  bytes(b: Uint8Array): void {
    this.grow(b.length)
    this.buf.set(b, this.length)
    this.length += b.length
  }
  section(tag: number, body: Writer): void {
    this.u8(tag)
    this.u32(body.length)
    this.bytes(body.done())
  }
  done(): Uint8Array {
    return this.buf.slice(0, this.length)
  }
}

class Reader {
  private readonly view: DataView
  pos = 0
  private readonly bytes: Uint8Array
  // A declared field, not a parameter property: Node's type stripping cannot erase one, and the world kit's command
  // loads this file under plain Node.
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  private need(n: number): number {
    if (this.pos + n > this.bytes.length) throw new SnapshotFormatError(`truncated at byte ${this.pos}`)
    const at = this.pos
    this.pos += n
    return at
  }
  u8(): number {
    return this.view.getUint8(this.need(1))
  }
  u16(): number {
    return this.view.getUint16(this.need(2), true)
  }
  u32(): number {
    return this.view.getUint32(this.need(4), true)
  }
  i32(): number {
    return this.view.getInt32(this.need(4), true)
  }
  u64(): bigint {
    return this.view.getBigUint64(this.need(8), true)
  }
  f32(): number {
    return this.view.getFloat32(this.need(4), true)
  }
  f64(): number {
    return this.view.getFloat64(this.need(8), true)
  }
  take(n: number): Uint8Array {
    const at = this.need(n)
    return this.bytes.subarray(at, at + n)
  }
  section(tag: number): Reader {
    const got = this.u8()
    if (got !== tag) throw new SnapshotFormatError(`expected section ${tag}, found ${got}`)
    return new Reader(this.take(this.u32()))
  }
  atEnd(): boolean {
    return this.pos === this.bytes.length
  }
  end(what: string): void {
    if (this.pos !== this.bytes.length)
      throw new SnapshotFormatError(`${this.bytes.length - this.pos} trailing bytes in ${what}`)
  }
}

function decodeUtf8(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; ) {
    const c = b[i] as number
    let cp: number
    if (c < 0x80) {
      cp = c
      i += 1
    } else if (c < 0xe0) {
      cp = ((c & 31) << 6) | ((b[i + 1] as number) & 63)
      i += 2
    } else if (c < 0xf0) {
      cp = ((c & 15) << 12) | (((b[i + 1] as number) & 63) << 6) | ((b[i + 2] as number) & 63)
      i += 3
    } else {
      cp =
        ((c & 7) << 18) |
        (((b[i + 1] as number) & 63) << 12) |
        (((b[i + 2] as number) & 63) << 6) |
        ((b[i + 3] as number) & 63)
      i += 4
    }
    s += String.fromCodePoint(cp)
  }
  return s
}

const compareStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function encodeSnapshot(data: SnapshotData, components: readonly ComponentDef[]): Uint8Array {
  const comps = [...components].sort((a, b) => compareStr(a.id, b.id))

  // String table: every id, name and string field value, sorted and de-duplicated.
  const set = new Set<string>()
  for (const r of data.rng) set.add(r.name)
  for (const r of data.resources) set.add(r.id)
  for (const c of comps) set.add(c.id)
  for (const e of data.entities)
    for (const c of comps) {
      const rec = e.components.get(c.id)
      if (rec) for (const f of c.fieldNames) if (c.fields[f] === 'string') set.add(rec[f] as string)
    }
  const strings = [...set].sort(compareStr)
  const index = new Map(strings.map((s, i) => [s, i]))
  const idx = (s: string): number => index.get(s) as number

  const out = new Writer()
  for (const b of MAGIC) out.u8(b)
  out.u16(SNAPSHOT_VERSION)
  out.u64(data.schemaHash)
  out.u64(data.contentHash)
  out.u32(data.tick)
  out.u16(data.tickHz)

  const s = new Writer()
  s.u32(strings.length)
  for (const str of strings) {
    const b = utf8(str)
    s.u32(b.length)
    s.bytes(b)
  }
  out.section(TAG.strings, s)

  const r = new Writer()
  r.u32(data.rng.length)
  for (const { name, state } of data.rng) {
    r.u32(idx(name))
    for (const v of state) r.u32(v)
  }
  out.section(TAG.rng, r)

  const res = new Writer()
  res.u32(data.resources.length)
  for (const { id, json } of data.resources) {
    const b = utf8(json)
    res.u32(idx(id))
    res.u32(b.length)
    res.bytes(b)
  }
  out.section(TAG.resources, res)

  const en = new Writer()
  en.u32(data.nextId)
  en.u32(data.entities.length)
  for (const e of data.entities) en.u32(e.sid)
  en.u32(comps.length)
  for (const c of comps) {
    en.u32(idx(c.id))
    const present = data.entities.map((e) => e.components.get(c.id))
    for (let i = 0; i < present.length; i += 8) {
      let byte = 0
      for (let bit = 0; bit < 8 && i + bit < present.length; bit++) if (present[i + bit]) byte |= 1 << bit
      en.u8(byte)
    }
    for (const f of c.fieldNames) {
      const type = c.fields[f] as FieldType
      for (const rec of present) {
        if (!rec) continue
        const v = rec[f]
        if (type === 'f32') en.f32(v as number)
        else if (type === 'f64') en.f64(v as number)
        else if (type === 'i32') en.i32(v as number)
        else if (type === 'bool') en.u8(v ? 1 : 0)
        else if (type === 'string') en.u32(idx(v as string))
        else en.u32(v as number) // u32, entity
      }
    }
  }
  out.section(TAG.entities, en)

  if (data.plugins.length > 0) {
    const ps = new Writer()
    ps.u16(data.plugins.length)
    for (const { name, bytes } of data.plugins) {
      const b = utf8(name)
      ps.u16(b.length)
      ps.bytes(b)
      ps.u32(bytes.length)
      ps.bytes(bytes)
    }
    out.section(TAG.pluginState, ps)
  }
  return out.done()
}

export interface SnapshotHeader {
  readonly schemaHash: bigint
  readonly contentHash: bigint
  readonly tick: number
  readonly tickHz: number
}

function readHeader(rd: Reader): SnapshotHeader {
  for (const b of MAGIC) if (rd.u8() !== b) throw new SnapshotFormatError('bad magic (not an AUTO snapshot)')
  const version = rd.u16()
  if (version !== SNAPSHOT_VERSION) throw new SnapshotFormatError(`unsupported version ${version}`)
  return { schemaHash: rd.u64(), contentHash: rd.u64(), tick: rd.u32(), tickHz: rd.u16() }
}

/**
 * Only the fixed header, so a snapshot from another schema can be told apart before its body is decoded with
 * this build's component list (which would fail on the body's shape first).
 */
export function decodeSnapshotHeader(bytes: Uint8Array): SnapshotHeader {
  return readHeader(new Reader(bytes))
}

export function decodeSnapshot(bytes: Uint8Array, components: readonly ComponentDef[]): SnapshotData {
  const comps = [...components].sort((a, b) => compareStr(a.id, b.id))
  const rd = new Reader(bytes)
  const { schemaHash, contentHash, tick, tickHz } = readHeader(rd)

  const s = rd.section(TAG.strings)
  const strings: string[] = []
  for (let n = s.u32(); n > 0; n--) strings.push(decodeUtf8(s.take(s.u32())))
  s.end('strings')
  const str = (i: number): string => {
    const v = strings[i]
    if (v === undefined) throw new SnapshotFormatError(`string index ${i} out of range`)
    return v
  }

  const r = rd.section(TAG.rng)
  const rng: Array<{ name: string; state: RngState }> = []
  for (let n = r.u32(); n > 0; n--)
    rng.push({ name: str(r.u32()), state: [r.u32(), r.u32(), r.u32(), r.u32()] })
  r.end('rng')

  const res = rd.section(TAG.resources)
  const resources: Array<{ id: string; json: string }> = []
  for (let n = res.u32(); n > 0; n--) {
    const id = str(res.u32())
    resources.push({ id, json: decodeUtf8(res.take(res.u32())) })
  }
  res.end('resources')

  const en = rd.section(TAG.entities)
  const nextId = en.u32()
  const sids: number[] = []
  for (let n = en.u32(); n > 0; n--) sids.push(en.u32())
  for (let i = 0; i < sids.length; i++) {
    const sid = sids[i] as number
    if (sid < 1 || (i > 0 && sid <= (sids[i - 1] as number)))
      throw new SnapshotFormatError('entity ids must be strictly ascending and at least 1')
  }
  if (nextId < 1 || nextId <= (sids[sids.length - 1] ?? 0))
    throw new SnapshotFormatError('nextId must exceed every entity id')
  const entities = sids.map((sid) => ({ sid, components: new Map<string, FieldRecord>() }))
  const compCount = en.u32()
  if (compCount !== comps.length)
    throw new SnapshotFormatError(`expected ${comps.length} components, found ${compCount}`)
  for (const c of comps) {
    if (str(en.u32()) !== c.id) throw new SnapshotFormatError(`component order mismatch at "${c.id}"`)
    const present: boolean[] = []
    for (let i = 0; i < sids.length; i += 8) {
      const byte = en.u8()
      for (let bit = 0; bit < 8 && i + bit < sids.length; bit++) present.push((byte & (1 << bit)) !== 0)
    }
    const recs = entities.map((e, i) => {
      if (!present[i]) return undefined
      const rec: FieldRecord = {}
      e.components.set(c.id, rec)
      return rec
    })
    for (const f of c.fieldNames) {
      const type = c.fields[f] as FieldType
      for (const rec of recs) {
        if (!rec) continue
        if (type === 'f32') rec[f] = en.f32()
        else if (type === 'f64') rec[f] = en.f64()
        else if (type === 'i32') rec[f] = en.i32()
        else if (type === 'bool') rec[f] = en.u8() === 1
        else if (type === 'string') rec[f] = str(en.u32())
        else rec[f] = en.u32()
      }
    }
  }
  en.end('entities')

  const plugins: Array<{ name: string; bytes: Uint8Array }> = []
  if (!rd.atEnd()) {
    const ps = rd.section(TAG.pluginState)
    for (let n = ps.u16(); n > 0; n--) {
      const name = decodeUtf8(ps.take(ps.u16()))
      plugins.push({ name, bytes: ps.take(ps.u32()).slice() })
    }
    ps.end('plugin state')
    if (plugins.length === 0) throw new SnapshotFormatError('an empty plugin state section must be omitted')
  }
  rd.end('snapshot')
  return { schemaHash, contentHash, tick, tickHz, rng, resources, nextId, entities, plugins }
}

/**
 * A readable copy of a snapshot, for diffs and reports. Plugin bytes are opaque engine state,
 * so they are described by length and hash only.
 */
export interface SnapshotView {
  readonly header: {
    readonly formatVersion: number
    readonly schemaHash: string
    readonly contentHash: string
    readonly tick: number
    readonly tickHz: number
  }
  /** Per system, its RNG state words. */
  readonly rng: Readonly<Record<string, readonly number[]>>
  /** Per resource id, its value parsed from canonical JSON. */
  readonly resources: Readonly<Record<string, unknown>>
  readonly nextId: number
  /** Ascending sid; per component id, its field values. Components the entity lacks are absent. */
  readonly entities: ReadonlyArray<{
    readonly sid: number
    readonly components: Readonly<Record<string, FieldRecord>>
  }>
  /** Section 6, per stateful plugin: byte length and XXH64 of its bytes. */
  readonly plugins: Readonly<Record<string, { readonly byteLength: number; readonly hash: string }>>
}

export function viewSnapshot(data: SnapshotData): SnapshotView {
  const rng: Record<string, readonly number[]> = {}
  for (const r of data.rng) rng[r.name] = [...r.state]
  const resources: Record<string, unknown> = {}
  for (const r of data.resources) {
    try {
      resources[r.id] = JSON.parse(r.json)
    } catch (err) {
      throw new SnapshotFormatError(`resource "${r.id}" is not JSON`, { cause: err })
    }
  }
  const entities = data.entities.map((e) => {
    const components: Record<string, FieldRecord> = {}
    // The decoder fills each entity's map in sorted component order, so the record's key order is canonical.
    for (const [id, rec] of e.components) components[id] = { ...rec }
    return { sid: e.sid, components }
  })
  const plugins: Record<string, { byteLength: number; hash: string }> = {}
  for (const p of data.plugins)
    plugins[p.name] = { byteLength: p.bytes.length, hash: hex64(xxhash64(p.bytes)) }
  return {
    header: {
      formatVersion: SNAPSHOT_VERSION,
      schemaHash: hex64(data.schemaHash),
      contentHash: hex64(data.contentHash),
      tick: data.tick,
      tickHz: data.tickHz,
    },
    rng,
    resources,
    nextId: data.nextId,
    entities,
    plugins,
  }
}
