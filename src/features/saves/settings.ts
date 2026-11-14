// The game's settings: one record, a section for each feature that has some (sound, controls, language). The features
// below `saves` export a section's shape and first values as plain data, and whoever wires a game together turns each
// into a `SettingsSection`. Unlike progress, a preference may be lost: a section that cannot be read starts again from
// its first values, and a value the player just chose stays in the game even when the host will not keep it.

import type { z } from 'zod'
import { deepFreeze } from '../../lib/deep-freeze.ts'
import { type SaveProblem, settingsKey } from './define.ts'
import { plainJson } from './envelope.ts'
import { guardStore, type SaveStore, type StoreResult } from './store.ts'

/** One feature's part of the settings: its name, its shape and what a new player starts with. */
export interface SettingsSection<T> {
  /** 1 to 40 of a-z, 0-9 and '-', e.g. 'sound', 'controls', 'language'. */
  readonly name: string
  readonly schema: z.ZodType<T>
  readonly initial: T
}

export interface SettingsHandle<T> {
  /** Frozen: a screen changes a setting only through `set`. */
  get(): T
  /**
   * Keeps the value at once and writes it; writes go out in the order they were asked for. Rejects with a
   * `RangeError`, changing nothing, for a value the schema refuses or JSON cannot keep. A host that will not keep the
   * value is the answer, not a rejection: the value is still the one in the game.
   */
  set(value: T): Promise<StoreResult<void>>
  /** Called after each `set`. Returns a function that stops listening. */
  onChange(listener: (value: T) => void): () => void
}

export interface Settings {
  /** The same handle every time for the same name. A section stored in a shape its schema refuses starts at `initial`. */
  section<T>(def: SettingsSection<T>): SettingsHandle<T>
  /** Set when the settings could not be read: every section then starts at `initial`, and a screen can say so. */
  readonly problem: SaveProblem | undefined
}

const SECTION_NAME = /^[a-z0-9-]{1,40}$/

/** What is stored: the sections by name, each held as the text's own plain data until a section reads it. */
type Sections = Record<string, unknown>

/** The stored sections, or why the text cannot be used. */
function readSections(text: string): { readonly sections: Sections } | { readonly detail: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { detail: 'This is not JSON.' }
  }
  const plain = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  if (!plain(parsed)) return { detail: 'These settings are not in a form this game knows.' }
  // The format first: a record from a later build names its format, however its sections are laid out.
  if (typeof parsed.format === 'number' && parsed.format !== 1)
    return { detail: `These settings are in a format this game does not know (${parsed.format}).` }
  if (parsed.format !== 1 || !plain(parsed.sections))
    return { detail: 'These settings are not in a form this game knows.' }
  return { sections: { ...parsed.sections } }
}

/**
 * Reads the game's settings once. Rejects only for a game id that breaks the rule, a mistake in the game; a host's
 * "no" or a damaged record is `problem`.
 */
export async function openSettings(options: {
  readonly game: string
  readonly store: SaveStore
}): Promise<Settings> {
  const store = guardStore(options.store)
  const key = settingsKey(options.game)
  let sections: Sections = {}
  // The sections this page has set. Only these are written over what is stored, so a second tab's sections survive.
  const touched = new Set<string>()
  let problem: SaveProblem | undefined
  const got = await store.get(key)
  if (!got.ok) problem = { kind: 'refused', refusal: got.refusal, detail: got.detail }
  else if (got.value !== null) {
    const read = readSections(got.value)
    if ('sections' in read) sections = read.sections
    else problem = { kind: 'damaged', detail: read.detail }
  }

  // One write at a time: each waits for the one before, so the last value asked for is the last one stored.
  let writing: Promise<unknown> = Promise.resolve()
  const write = (): Promise<StoreResult<void>> => {
    const next = writing.then(async (): Promise<StoreResult<void>> => {
      // Serialised as the settings are when this write starts, so a late write never brings back an older value.
      try {
        // Read what is stored now and change only the sections this page set: another tab may have set the others.
        let merged = sections
        const now = await store.get(key)
        if (now.ok && now.value !== null) {
          const read = readSections(now.value)
          if ('sections' in read) {
            merged = { ...read.sections }
            for (const name of touched) merged[name] = sections[name]
          }
        }
        return await store.set(key, plainJson({ format: 1, sections: merged }))
      } catch (error) {
        return {
          ok: false,
          refusal: 'failed',
          detail: error instanceof Error ? error.message : String(error),
        }
      }
    })
    writing = next
    return next
  }

  const handles = new Map<string, SettingsHandle<never>>()
  return {
    problem,
    section<T>(def: SettingsSection<T>): SettingsHandle<T> {
      if (!SECTION_NAME.test(def.name))
        throw new RangeError(
          `A settings section's name is 1 to 40 of a-z, 0-9 and "-", like "sound". Got "${def.name}".`,
        )
      const existing = handles.get(def.name)
      if (existing !== undefined) return existing as unknown as SettingsHandle<T>
      const stored = def.schema.safeParse(sections[def.name])
      let value: T = deepFreeze(structuredClone(stored.success ? stored.data : def.initial))
      const listeners = new Set<(value: T) => void>()
      const handle: SettingsHandle<T> = {
        get: () => value,
        async set(next) {
          const checked = def.schema.safeParse(next)
          if (!checked.success)
            throw new RangeError(
              `This is not a value for the "${def.name}" settings: ${checked.error.issues.map((issue) => issue.message).join('; ')}.`,
            )
          // Before anything changes: a value JSON cannot keep throws here and leaves everything as it was.
          plainJson(checked.data)
          // A copy, so freezing it never reaches the caller's own object (a schema like z.any() hands it back as it is).
          value = deepFreeze(structuredClone(checked.data))
          sections = { ...sections, [def.name]: value }
          touched.add(def.name)
          // The write starts before anyone is told, so a listener that throws cannot stop the value being kept.
          const written = write()
          let heard: { readonly error: unknown } | undefined
          for (const listener of [...listeners]) {
            try {
              listener(value)
            } catch (error) {
              heard ??= { error }
            }
          }
          // Let the write finish first, so the caller sees the store as it will stay, then say what a listener threw.
          if (heard !== undefined) {
            await written
            throw heard.error
          }
          return written
        },
        onChange(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
      handles.set(def.name, handle as unknown as SettingsHandle<never>)
      return handle
    },
  }
}
