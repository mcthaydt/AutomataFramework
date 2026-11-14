import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { COMMAND_NAMES } from '#src/features/cli/args.ts'
import { helpFor } from '#src/features/cli/help.ts'
import { PROTOCOL_VERSIONS } from '#src/features/cli/mcp.ts'
import { mcpTools } from '#src/features/cli/mcp-tools.ts'
import { createSessions } from '#src/features/cli/session.ts'
import { CONTENT_TYPES } from '#src/features/content/content-types.ts'
import { TOUCH_PROPERTIES } from '#src/features/input/touch.ts'
import { FRAMEWORK_VERSION } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { GAME_FOLDER, PACKAGE_NAME, START_HERE } from '../install/create-commands.ts'

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

// `${d.file}: ${d.message}` drops `d.path`, the part that says where in the file to look, so the example must use the
// function that keeps it.
test('the README prints a problem with its place, using what the package exports (the browser entry re-exports the headless one)', () => {
  expect(readme).toContain('formatDiagnostic')
  expect(readme).not.toContain('d.message')
  expect(typeof framework.formatDiagnostic).toBe('function')
})

// A game can only set what it can find: every property the buttons read is named in the README.
test('the README names every property a game can set on the touch buttons', () => {
  expect(TOUCH_PROPERTIES).toHaveLength(7)
  for (const property of TOUCH_PROPERTIES) expect(readme).toContain(property)
})

// A game finds out how to use a gamepad, a changed key and a second player from this section.
test('the README has a section on gamepads, changing keys and playing together, and names what it uses', () => {
  const start = readme.indexOf('## Gamepads, changing keys and playing together')
  expect(start).toBeGreaterThan(-1)
  const next = readme.indexOf('\n## ', start + 1)
  const section = readme.slice(start, next)
  expect(section.split('\n').length).toBeLessThan(60)
  for (const word of [
    'players = 2',
    'pad:',
    'shared:',
    'addPlayer',
    'game.input.capture',
    'game.input.settings()',
  ])
    expect(section, word).toContain(word)
})

// A game can only write what it can find: every kind's schema is named, and the folder its files go in.
test('the README names every kind of content file, its schema and its folder', () => {
  for (const [type, info] of Object.entries(CONTENT_TYPES)) {
    expect(readme, type).toContain(`schemas/${type}.schema.json`)
    expect(readme, type).toContain(`content/${info.plural}/`)
  }
})

// The README's example is the file `writeContent` writes, so an agent that copies it makes the bytes the check wants.
test("the README's door.json is exactly what writeContent makes of it", () => {
  const section = readme.slice(readme.indexOf('## Content files'))
  const block = /```json\n([\s\S]*?)```/.exec(section)?.[1]
  expect(block).toBeDefined()
  const written = framework.writeContent('sound', JSON.parse(block ?? '') as never)
  expect(written).toBe(block)
})

/** The text of one `## ` section of the README, up to the next. */
function section(heading: string): string {
  const start = readme.indexOf(heading)
  expect(start, heading).toBeGreaterThan(-1)
  const next = readme.indexOf('\n## ', start + 1)
  return readme.slice(start, next === -1 ? undefined : next)
}

// A game finds out where its saves are and what a refusal is called from here, and copies an example that runs.
test('the README has a Saves section: the keys, every refusal, and an example that uses only what headless exports', () => {
  const saves = section('## Saves')
  for (const refusal of ['unavailable', 'full', 'failed']) expect(saves, refusal).toContain(refusal)
  for (const key of ['automata.<game>.save.<slot>', 'automata.<game>.settings'])
    expect(saves, key).toContain(key)
  const imported = /import \{([^}]+)\} from '@automataframework\/framework\/headless'/.exec(saves)?.[1]
  expect(imported).toBeDefined()
  const names = (imported ?? '').split(',').map((name) => name.trim())
  for (const name of ['z', 'defineSave', 'createSaves', 'openSettings', 'latestSlot'])
    expect(names).toContain(name)
  for (const name of names) expect(framework, name).toHaveProperty(name)
})

test('the README has a host section that names every member of the port and both hosts', () => {
  const host = section('## The host')
  for (const word of [
    'visible',
    'store',
    'language',
    'deviceLanguages',
    'openLink',
    'canQuit',
    'quit',
    'https:',
    'webHost()',
    'testHost()',
  ])
    expect(host, word).toContain(word)
})

// A game finds out how to speak in the player's language from here, and copies an example that uses only what headless exports.
test('the README has a Languages section: the files, the values, the pick, the two checks and the native read', () => {
  const languages = section('## Languages')
  for (const word of [
    'content/messages/',
    '{name}',
    'createLocale',
    'locale.words',
    'locale.set',
    'startGame({ ..., locale })',
    'followLanguage',
    'onlineWords(status, locale.words)',
    'translationProblems',
    'unreadWords',
    'automata.translations.toml',
    'native speaker',
    'moves no hash',
  ])
    expect(languages, word).toContain(word)
  for (const language of ['en', 'es', 'ko', 'ja', 'zh', 'pt'])
    expect(languages, language).toContain(`${language}.json`)
  const imported = /import \{([^}]+)\} from '@automataframework\/framework\/headless'/.exec(languages)?.[1]
  expect(imported).toBeDefined()
  for (const name of (imported ?? '').split(',').map((n) => n.trim()))
    expect(framework, name).toHaveProperty(name)
  // Everything else it names exists: the checks, the marks, and the page's own follower in the browser entry's file.
  for (const name of ['translationProblems', 'unreadWords', 'parseReadMarks', 'markRead', 'writeReadMarks'])
    expect(framework, name).toHaveProperty(name)
  expect(framework).not.toHaveProperty('followLanguage')
  expect(readme.indexOf('## Saves')).toBeLessThan(readme.indexOf('## Languages'))
  expect(readme.indexOf('## Languages')).toBeLessThan(readme.indexOf('## The host'))
  // Its messages file is exactly what `writeContent` writes, so an agent that copies it makes the bytes the check wants.
  const block = /```json\n([\s\S]*?)```/.exec(languages)?.[1]
  expect(framework.writeContent('messages', JSON.parse(block ?? '') as never)).toBe(block)
})

// A game finds out how to host a room and put a page in it from here, and is told that nothing is deployed.
test('the README has a Play online section: the server, the page, the words, and that nothing is deployed', () => {
  const online = section('## Play online')
  for (const word of [
    'runRoomServer',
    'startOnlineGame',
    '@automataframework/framework/server',
    'onlineWords',
    'OnlineError',
    'Online play is built and checked in CI. It is not deployed anywhere yet.',
  ])
    expect(online, word).toContain(word)
  expect(online.split('\n').length).toBeLessThan(60)
  for (const name of ['onlineWords', 'joinSession']) expect(framework, name).toHaveProperty(name)
})

// A game finds out how to hold things and how to hear a touch from this section.
test('the README shows a pin, a rope, a touched character and the event a game reads', () => {
  const joints = section('## Joints and touch')
  for (const word of ['"kind": "pin"', '"kind": "rope"', '"touch": "take"', 'touchEvent('])
    expect(joints, word).toContain(word)
  expect(typeof framework.touchEvent).toBe('function')
})

// A game finds out how to give itself sound from here, and copies an example that uses only what the entries export.
test('the README has a Sound section: the states, the button, the page event, the three kinds of file and a real example', () => {
  const sound = section('## Sound')
  for (const word of [
    'waiting',
    'on',
    'unavailable',
    'Tap to start the sound',
    'level.started',
    'content/sounds/',
    'content/music/',
    'content/cues/',
  ])
    expect(sound, word).toContain(word)
  const imported = /import \{([^}]+)\} from '@automataframework\/framework'/.exec(sound)?.[1]
  expect(imported).toBeDefined()
  const names = (imported ?? '').split(',').map((name) => name.trim())
  for (const name of ['createAudio', 'startGame', 'webHost', 'webSpeaker']) expect(names).toContain(name)
  // Everything the example imports from the main entry is on it: the browser entry is the headless one and the page's.
  for (const name of names.filter((n) => n !== 'startGame' && n !== 'webHost' && n !== 'webSpeaker'))
    expect(framework, name).toHaveProperty(name)
  expect(section('## Without a page')).toContain('audio')
})

// The page a new person reads first and the commands CI runs are the same list.
test('"Start here" is the first section, and its commands are the ones the create journey runs', () => {
  expect(readme.indexOf('## ')).toBe(readme.indexOf('## Start here'))
  const block = /```sh\n([\s\S]*?)```/.exec(section('## Start here'))?.[1] ?? ''
  expect(block.trimEnd().split('\n')).toEqual(START_HERE)
  // The smoke swaps one thing in the first line, the package for the tarball, so the rest is the README's.
  expect(START_HERE[0]).toContain(PACKAGE_NAME)
  expect(START_HERE[1]).toBe(`cd ${GAME_FOLDER}`)
  expect(section('## Start here')).toContain('24.21.0')
})

test('nothing in the README says npx automata without --no', () => {
  expect(readme).not.toMatch(/npx\s+automata\b/)
  expect(readme).toContain('npx --no automata')
})

test('while the package is not on npm, the README says so, and how to make a game meanwhile', () => {
  expect(FRAMEWORK_VERSION).toBe('0.1.0')
  expect(section('## Start here')).toContain('Not on npm yet')
  expect(section('## Start here')).toContain('--framework github:mcthaydt/AutomataFramework#<commit>')
})

// Each command and each flag a help text has is in the README, and the README names no flag a help text lacks.
test('the README names every command and every flag its help has, and no other', () => {
  const ref = section('## The automata command')
  const flagsInReadme = new Set([...ref.matchAll(/- `(--[a-z-]+)/g)].map((m) => m[1]))
  const flagsInHelp = new Set<string>()
  for (const name of COMMAND_NAMES) {
    expect(ref, name).toContain(`automata ${name}`)
    for (const m of helpFor(name).matchAll(/^ {2}(--[a-z-]+)/gm)) flagsInHelp.add(m[1] ?? '')
  }
  expect([...flagsInReadme].sort()).toEqual([...flagsInHelp].sort())
  expect(readme).toContain('--help')
})

test('the README gives the exit codes, and every verdict of a replay', () => {
  const ref = section('## The automata command')
  for (const word of ['`0`', '`1`', '`2`']) expect(ref, word).toContain(word)
  for (const verdict of ['ok', 'content-changed', 'code-changed', 'diverged', 'wrong-setup', 'not-a-replay'])
    expect(ref, verdict).toContain(`\`${verdict}\``)
})

// A game finds out how to make a figure and keep its picture from here, and copies a figure that works.
test("the README has an Art section whose figure reads, paints, and whose names are the package's", () => {
  const art = section('## Art')
  for (const word of [
    'schemas/figure.schema.json',
    'artFiles',
    'artProblems',
    'automata art',
    'readPicture',
    'setClip',
    'setFacing',
    '"columns": 8',
    'view',
    'most',
    'ArtError',
    'heroes()',
  ])
    expect(art + readme, word).toContain(word)
  const block = /```json\n([\s\S]*?)```/.exec(art)?.[1]
  expect(block).toBeDefined()
  const parsed = framework.parseContent('figure', block ?? '', 'content/figures/hero.json')
  expect(parsed.ok ? [] : parsed.diagnostics.map(framework.formatDiagnostic)).toEqual([])
  if (!parsed.ok) return
  expect(() => framework.paintFigure(parsed.value as framework.FigureFile)).not.toThrow()
  for (const name of ['artFiles', 'artProblems', 'setClip', 'setFacing', 'paintFigure'])
    expect(framework, name).toHaveProperty(name)
})

test('the README names every tool automata mcp has, the protocol versions it speaks, and the .mcp.json a game has', () => {
  const start = readme.indexOf('### automata mcp')
  expect(start).toBeGreaterThan(-1)
  const mcp = readme.slice(start, readme.indexOf('\n## ', start))
  const rows = [...mcp.matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1])
  expect(rows).toEqual(mcpTools(createSessions()).map((tool) => tool.name))
  for (const version of PROTOCOL_VERSIONS) expect(mcp, version).toContain(`\`${version}\``)
  const config = readFileSync(new URL('../../template/.mcp.json', import.meta.url), 'utf8')
  expect(JSON.parse(/```json\n([\s\S]*?)```/.exec(mcp)?.[1] ?? '')).toEqual(JSON.parse(config))
})
