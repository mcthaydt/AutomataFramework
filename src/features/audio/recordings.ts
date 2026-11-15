// The recordings a game's sounds play, read and judged once before the game starts, so a sound never waits for a file.
import {
  type Diagnostic,
  type GameContent,
  type Recording,
  readRecording,
  recordingPaths,
  recordingProblems,
} from '../content/content.ts'

/** The recordings of a game by the path its sounds name them with. */
export type Recordings = ReadonlyMap<string, Recording>

/** Every problem found in a game's recordings, in plain words. */
export class RecordingError extends Error {
  readonly diagnostics: readonly Diagnostic[]
  constructor(diagnostics: readonly Diagnostic[]) {
    const first = diagnostics[0]?.message ?? 'A recording cannot be played.'
    const more = diagnostics.length > 1 ? ` (${diagnostics.length - 1} more problems with recordings.)` : ''
    super(first + more)
    this.name = 'RecordingError'
    this.diagnostics = diagnostics
  }
}

/**
 * Every recording the game's sounds name, read and judged by `recordingProblems`. Rejects with a `RecordingError` that
 * carries every problem. A game with no recording resolves to an empty map and never calls `read`.
 */
export async function loadRecordings(
  content: GameContent,
  read: (path: string) => Promise<Uint8Array | undefined>,
): Promise<Recordings> {
  const paths = recordingPaths(content)
  const found = new Map<string, Recording>()
  if (paths.length === 0) return found
  // Each file is read once, however many sounds name it.
  const reads = new Map<string, Promise<Uint8Array | undefined>>()
  const once = (path: string): Promise<Uint8Array | undefined> => {
    let known = reads.get(path)
    if (known === undefined) {
      known = read(path)
      reads.set(path, known)
    }
    return known
  }
  const problems = await recordingProblems(content, once)
  if (problems.length > 0) throw new RecordingError(problems)
  for (const path of paths) {
    const bytes = await once(path)
    if (bytes === undefined) continue
    const result = readRecording(bytes, path.slice(path.lastIndexOf('/') + 1))
    if (result.ok) found.set(path, result.value)
  }
  return found
}
