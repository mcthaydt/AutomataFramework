// Folders a project lists (`[[content]]` with a `folder`): which files are in them, and how a page that cannot read a
// folder is told. Nothing here reads a file; the caller hands in a `list`.
import type { ContentRef, FolderRef } from './project.ts'

/** Gives the names of the files directly in a folder of the game (`jump.json`), or rejects when it cannot. */
export type ListFolder = (folder: string) => Promise<readonly string[]>

/** The generated file a page reads folders from, since a page cannot list a folder. Never committed. */
export const FOLDERS_FILE = 'automata.folders.json'

/** The content files among a folder's names: ends `.json`, not `.atlas.json` (a figure paints it), sorted by code unit. */
export function filesIn(names: readonly string[]): string[] {
  return names
    .filter((name) => name.endsWith('.json') && !name.endsWith('.atlas.json') && !name.includes('/'))
    .sort()
}

/** The text of `FOLDERS_FILE`: each listed folder and the names in it, sorted, two-space JSON with a last newline. */
export function folderManifest(folders: Readonly<Record<string, readonly string[]>>): string {
  const sorted: Record<string, string[]> = {}
  for (const folder of Object.keys(folders).sort()) sorted[folder] = [...(folders[folder] ?? [])].sort()
  return `${JSON.stringify(sorted, null, 2)}\n`
}

/** What `FOLDERS_FILE` says, or nothing at all when it is missing or is not what `folderManifest` writes. */
async function readManifest(read: (path: string) => Promise<string>): Promise<Record<string, string[]>> {
  const found: Record<string, string[]> = Object.create(null)
  try {
    const data: unknown = JSON.parse(await read(FOLDERS_FILE))
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return found
    for (const [folder, names] of Object.entries(data))
      if (Array.isArray(names))
        found[folder] = names.filter((name): name is string => typeof name === 'string')
  } catch {
    // A page with no manifest has no folders to list, which `loadGame` then reports as empty folders.
  }
  return found
}

/** A `ListFolder` that reads `FOLDERS_FILE` through `read`, once. A folder the file does not name has no files. */
export function listFromManifest(read: (path: string) => Promise<string>): ListFolder {
  let manifest: Promise<Record<string, string[]>> | undefined
  return async (folder) => {
    manifest ??= readManifest(read)
    return (await manifest)[folder] ?? []
  }
}

/**
 * Every content file in the folders a project lists, as paths from the game's root, folder by folder in the order the
 * project lists them and each folder's files in name order. A folder that cannot be listed counts as empty: whether a
 * game needs a file in it is for the checks that follow to say.
 */
export async function folderFiles(
  folders: readonly FolderRef[],
  list: ListFolder,
): Promise<readonly ContentRef[]> {
  const lists = await Promise.all(
    folders.map(async (ref) => {
      try {
        return filesIn(await list(ref.folder)).map((name) => ({
          type: ref.type,
          path: `${ref.folder}/${name}`,
        }))
      } catch {
        return []
      }
    }),
  )
  return lists.flat()
}
