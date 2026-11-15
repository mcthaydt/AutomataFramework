// An agent moves a game onto a scene, with the packed package: `automata create`, `automata scene from-level level-1`, then
// `check` (the files and the art) and `replay`. Every command exits 0, and the replay says the level ends on the hash it
// was recorded with: the content changed, the play did not. CI copies this file beside smoke.mjs, in the folder the
// tarball was installed into, and runs it there; it uses only Node and what that folder holds, and the game borrows that
// folder's `node_modules` (the game's own code imports only the framework), so nothing is fetched.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const NO_COLOUR = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }

/** Says what went wrong, with the command's own words, and stops. */
function fail(sentence, output = '') {
  console.error(`\nFAILED: ${sentence}`)
  if (output !== '') console.error(`\n${output.trimEnd().split('\n').slice(-40).join('\n')}`)
  process.exit(1)
}

/** Runs `npx --no automata <args>` in `cwd` and requires exit status 0. Gives what it said. */
function automata(what, args, cwd) {
  const done = spawnSync('npx', ['--no', 'automata', ...args], { cwd, env: NO_COLOUR, encoding: 'utf8' })
  const output = `${done.stdout ?? ''}${done.stderr ?? ''}`
  if (done.status !== 0)
    fail(`${what}: \`automata ${args.join(' ')}\` ended with ${done.status}, not 0.`, output)
  return output
}

const said = (what, output, text) => {
  if (!output.includes(text)) fail(`${what}: the output does not say "${text}".`, output)
}

const work = mkdtempSync(join(here, 'scene-smoke-'))
try {
  automata('create', ['create', 'g', '--source', 'en'], work)
  const game = join(work, 'g')
  // The game's rules import the framework: it borrows the folder the package was installed into.
  symlinkSync(resolve(here, 'node_modules'), join(game, 'node_modules'), 'dir')
  const recorded = JSON.parse(readFileSync(join(game, 'replays', 'level-1.json'), 'utf8')).finalHash
  said('the new game', automata('check', ['check', 'g', '--only', 'files'], work), 'Everything passed.')

  const moved = automata('scene from-level', ['scene', 'from-level', 'level-1', 'g'], work)
  said('scene from-level', moved, 'Level "level-1" now takes its ground from the scene "scene-1". It plays as it did.')
  for (const file of ['scenes/scene-1.json', 'scenes/scene-1.png', 'scenes/scene-1.atlas.json'])
    if (!existsSync(join(game, 'content', file))) fail(`scene from-level did not write content/${file}.`)
  if (!readFileSync(join(game, 'automata.toml'), 'utf8').includes('path = "content/scenes/scene-1.json"'))
    fail('scene from-level did not list the scene in automata.toml.')

  said('check files', automata('check', ['check', 'g', '--only', 'files'], work), 'Everything passed.')
  said('check art', automata('check', ['check', 'g', '--only', 'art'], work), 'Everything passed.')
  said(
    'art --check',
    automata('art --check', ['art', 'g', '--check'], work),
    'Every picture is painted and up to date.',
  )
  // The content changed, so the recording's hashes are not compared; the play still ends where it was recorded to.
  const replayed = automata('replay', ['replay', 'g'], work)
  said('replay', replayed, 'The game\'s content has changed since this was recorded')
  said('replay', replayed, `ended on ${recorded}`)
  console.log(`ok  a game moved onto a scene still plays to ${recorded}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
