import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { CONTENT_TYPES } from '#src/features/content/content-types.ts'
import { TOUCH_PROPERTIES } from '#src/features/input/touch.ts'
import { STORY_PROPERTIES } from '#src/features/story/box.ts'
import * as framework from '#src/headless.ts'

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

// A game finds out how to give a keeper something to say, play a cutscene and keep a story from here.
test('the README has a Story section: the files, the code a game writes, the save and the seven properties', () => {
  const story = section('## Story')
  for (const word of [
    '"conversation": "keeper"',
    '"opens": true',
    '"cutscene":',
    'storyProgress(',
    'startCutscene(',
    'StoryProgressSchema',
    'storyOfReplay(',
  ])
    expect(story, word).toContain(word)
  expect(STORY_PROPERTIES).toHaveLength(7)
  for (const property of STORY_PROPERTIES) expect(story, property).toContain(property)
  for (const name of ['startCutscene', 'startConversation', 'storyProgress', 'storyOfReplay'])
    expect(framework, name).toHaveProperty(name)
})
