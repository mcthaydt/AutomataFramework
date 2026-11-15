// The page's build. `base: './'` makes every address in the built page relative, so the folder works from any path.
// `appType: 'mpa'` answers a file that is not there with "not found", never with the page: a missing game file must
// be seen, not hidden.
//
// A page cannot list a folder, so a game that lists folders in `automata.toml` (the sounds, the songs, the cues) is
// told what is in them through `automata.folders.json`: the dev server writes it fresh on every request, so a sound you
// drop into `content/sounds` is there after a reload, and a build puts the same file beside the page.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FOLDERS_FILE, folderManifest, parseProject } from '@automataframework/framework/headless'
import { defineConfig, type Plugin, type UserConfig } from 'vite'

/** The folders `automata.toml` lists and the names in each, read from the disk now. */
function manifest(root: string): string {
  const project = parseProject(readFileSync(join(root, 'automata.toml'), 'utf8'))
  const folders: Record<string, string[]> = {}
  if (project.ok)
    for (const { folder } of project.value.folders ?? [])
      folders[folder] = existsSync(join(root, folder)) ? readdirSync(join(root, folder)) : []
  return folderManifest(folders)
}

const folders = (): Plugin => {
  let root = process.cwd()
  return {
    name: 'automata-folders',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use(`/${FOLDERS_FILE}`, (_request, response) => {
        response.setHeader('content-type', 'application/json')
        response.end(manifest(root))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: FOLDERS_FILE, source: manifest(root) })
    },
  }
}

const config: UserConfig = defineConfig({ base: './', appType: 'mpa', plugins: [folders()] })

export default config
