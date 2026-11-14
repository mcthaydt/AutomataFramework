// The packed package, used the way a game uses it: installed into an empty folder, then loading the fixture game and
// stepping it 60 ticks with no game code, then loading the full game (every kind of content file, as `full-game/`) and
// reading every kind's schema, then loading the playground (ropes, a seesaw, a spark and a door) and stepping it. CI copies this file, the fixture games and the golden beside it. It exits non-zero unless
// the hash is the one the sim, in every engine, ends on.
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  artFiles,
  artProblems,
  CONTENT_TYPES,
  createAudio,
  createGameSim,
  createLocale,
  createSaves,
  defineSave,
  formatDiagnostic,
  loadGame,
  openSettings,
  testHost,
  testSpeaker,
  translationProblems,
  z,
} from '@automataframework/framework/headless'
import { createRoomServer, runRoomServer } from '@automataframework/framework/server'
import { xxhash64Reference } from './xxhash64-reference.ts'

// The server entry loads under plain Node (it carries its own Rapier), and exports what a game's server file calls.
if (typeof createRoomServer !== 'function' || typeof runRoomServer !== 'function') {
  console.error('The installed package has no server entry with createRoomServer and runRoomServer.')
  process.exit(1)
}

const here = (path) => new URL(path, import.meta.url)
const loaded = await loadGame((path) => readFile(here(`game/${path}`), 'utf8'))
if (!loaded.ok) {
  for (const problem of loaded.diagnostics) console.error(`${problem.file}: ${problem.message}`)
  process.exit(1)
}

const sim = await createGameSim({ content: loaded.value })
for (let tick = 0; tick < 60; tick++) sim.step([])
const hash = sim.hash()
sim.dispose()

const golden = JSON.parse(await readFile(here('push-crate.json'), 'utf8'))
if (hash !== golden.idleHash60) {
  console.error(`The installed package ended on ${hash}, but the golden says ${golden.idleHash60}.`)
  process.exit(1)
}
console.log(`The installed package ran 60 ticks and ended on ${hash}, as recorded.`)

// Saves and the host, from the packed package alone: `z` is the package's own (never `zod`, which npm's flat folder
// would let this file import, and so prove nothing). A save goes in a slot and comes back, under the documented key.
const host = testHost()
const def = defineSave({ game: 'smoke', version: 1, slots: 1, schema: z.strictObject({ level: z.string() }) })
const saves = createSaves({ def, store: host.store })
const written = await saves.save(0, { level: 'level-1' })
const back = await saves.load(0)
const stored = await host.store.get('automata.smoke.save.0')
if (!written.ok || !back.ok || back.data?.level !== 'level-1' || !stored.ok || stored.value === null) {
  console.error('The installed package did not save and load a game.')
  process.exit(1)
}
const soundSection = {
  name: 'sound',
  schema: z.strictObject({ music: z.number().min(0).max(1) }),
  initial: { music: 0.8 },
}
await (await openSettings({ game: 'smoke', store: host.store })).section(soundSection).set({ music: 0.5 })
const reopened = (await openSettings({ game: 'smoke', store: host.store })).section(soundSection).get()
if (reopened.music !== 0.5) {
  console.error('The installed package did not keep a setting.')
  process.exit(1)
}
console.log('The installed package saved and loaded a game in Node.')

const full = await loadGame((path) => readFile(here(`full-game/${path}`), 'utf8'))
if (!full.ok) {
  for (const problem of full.diagnostics) console.error(formatDiagnostic(problem))
  process.exit(1)
}
// Art, from the packed package alone: the full game's figures and backdrop are painted, and each file is the very bytes
// recorded in art.json (hashed with a plain BigInt xxhash64 of the tests' own, so the package is not checked by itself).
// Written into a folder, they are what `automata art` would leave, so the check finds nothing wrong with them.
const painted = artFiles(full.value)
const recordedArt = JSON.parse(await readFile(here('art.json'), 'utf8'))
for (const file of painted) {
  const got = xxhash64Reference(file.bytes).toString(16).padStart(16, '0')
  if (got !== recordedArt[file.path]) {
    console.error(`The installed package painted ${file.path} as ${got}, but the golden says ${recordedArt[file.path]}.`)
    process.exit(1)
  }
  await mkdir(new URL('.', here(`art/${file.path}`)), { recursive: true })
  await writeFile(here(`art/${file.path}`), file.bytes)
}
const stale = await artProblems(full.value, (path) => readFile(here(`art/${path}`)))
if (painted.length === 0 || stale.length > 0) {
  for (const problem of stale) console.error(formatDiagnostic(problem))
  console.error('The installed package did not paint the full game as a game keeps it.')
  process.exit(1)
}
console.log(`The installed package painted ${painted.length} files, each as recorded.`)

// Rapier's code is inside the package, so its licence has to be there to read and ship.
const rapierLicence = await readFile(
  new URL(import.meta.resolve('@automataframework/framework/rapier.LICENSE')),
  'utf8',
)
if (!rapierLicence.includes('Apache License')) {
  console.error("The installed package's rapier.LICENSE is not the Apache licence.")
  process.exit(1)
}

// Sound, from the packed package alone: over the full game's cues, a tapped test speaker is given one voice for the one
// event, and the log says what was asked.
const speaker = testSpeaker()
const audio = createAudio({ content: full.value, speaker })
speaker.tap()
audio.hear({ tick: 1, events: [{ type: 'hero.jumped', payload: {} }] })
if (audio.log().length !== 1 || audio.log()[0].on !== 'hero.jumped' || speaker.played.length !== 1) {
  console.error('The installed package did not play a sound in Node.')
  process.exit(1)
}
console.log('The installed package played a sound in Node.')

const kinds = Object.keys(CONTENT_TYPES)
const missing = kinds.filter((type) => Object.keys(full.value[CONTENT_TYPES[type].plural] ?? {}).length === 0)
if (missing.length > 0) {
  console.error(`The full game loaded but has no ${missing.join(', ')}.`)
  process.exit(1)
}
for (const type of kinds) {
  const schema = JSON.parse(
    await readFile(
      new URL(import.meta.resolve(`@automataframework/framework/schemas/${type}.schema.json`)),
      'utf8',
    ),
  )
  if (schema.title !== CONTENT_TYPES[type].title) {
    console.error(
      `The installed schema for ${type} is titled "${schema.title}", not "${CONTENT_TYPES[type].title}".`,
    )
    process.exit(1)
  }
}
console.log(
  `The installed package loaded the full game with ${kinds.length} kinds of file and has every schema.`,
)

// The player's language, from the packed package alone: a device that says Japanese is greeted in Japanese, from the
// full game's own words, and every word of the full game is written in every language.
const languageHost = testHost({ deviceLanguages: ['ja-JP'] })
const locale = createLocale({
  content: full.value,
  host: languageHost,
  settings: await openSettings({ game: 'smoke-language', store: languageHost.store }),
})
if (locale.language() !== 'ja' || locale.words('keeper.hello') !== 'こんにちは！') {
  console.error('The installed package did not greet a Japanese device in Japanese.')
  process.exit(1)
}
const untranslated = translationProblems(full.value)
if (untranslated.length > 0) {
  for (const problem of untranslated) console.error(formatDiagnostic(problem))
  process.exit(1)
}
console.log('The installed package spoke Japanese and found every word translated.')

// The playground has pins, ropes and touched characters, which switch on joints and the touch plugin in the sim.
const playground = await loadGame((path) => readFile(here(`playground/${path}`), 'utf8'))
if (!playground.ok) {
  for (const problem of playground.diagnostics) console.error(formatDiagnostic(problem))
  process.exit(1)
}
const joined = await createGameSim({ content: playground.value })
for (let tick = 0; tick < 60; tick++) joined.step([])
const joinedHash = joined.hash()
joined.dispose()
const recorded = JSON.parse(await readFile(here('playground.json'), 'utf8'))
if (joinedHash !== recorded.idleHash60) {
  console.error(
    `The installed package ended the playground on ${joinedHash}, but the golden says ${recorded.idleHash60}.`,
  )
  process.exit(1)
}
console.log(`The installed package ran the playground 60 ticks and ended on ${joinedHash}, as recorded.`)

// The `automata` command is the package's bin: npm links it into node_modules/.bin, and it prints the installed version.
const windows = process.platform === 'win32'
const installed = JSON.parse(
  await readFile(here('node_modules/@automataframework/framework/package.json'), 'utf8'),
)
const bin = fileURLToPath(here(`node_modules/.bin/automata${windows ? '.cmd' : ''}`))
const said = execFileSync(bin, ['--version'], { encoding: 'utf8', shell: windows }).trim()
if (said !== installed.version) {
  console.error(`automata --version said "${said}", but the installed package is ${installed.version}.`)
  process.exit(1)
}
console.log(`The installed package has the automata command, version ${said}.`)

// A game's own TypeScript is loaded as it is, with nothing to build: the command runs a game's rules this way, so Node
// has to take the types out itself. If this fails, the command cannot work in a game, and nothing built on it should.
await mkdir(here('probe'), { recursive: true })
await writeFile(here('probe/rules.ts'), 'export const answer: number = 42\n')
if ((await import('./probe/rules.ts')).answer !== 42) {
  console.error("Node did not load a game's TypeScript file as it is.")
  process.exit(1)
}
console.log("Node loads a game's TypeScript as it is.")
