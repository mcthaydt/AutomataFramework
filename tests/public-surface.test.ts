// What a game or an editor can rely on finding in the package. Imports the source entries; the packed package is
// checked by tests/install/smoke.mjs in CI.
import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { CONTENT_TYPES, type ContentType, jsonSchemaFor } from '#src/headless.ts'

test('headless exports what a game sim and an editor need', async () => {
  const api = await import('#src/headless.ts')
  for (const name of [
    'createSim',
    'definePlugin',
    'defineSystem',
    'defineComponent',
    'defineCommand',
    'physics',
    'Transform',
    'Body',
    'Collider',
    'BodyKind',
    'Player',
    'isHeld',
    'wasPressed',
    'controlsCommand',
    'createRecorder',
    'playReplay',
    'verifyReplay',
    'parseReplay',
    'writeReplay',
    'CONTENT_TYPES',
    'parseContent',
    'writeContent',
    'parseProject',
    'loadGame',
    'formatDiagnostic',
    'jsonSchemaFor',
    'LANGUAGES',
    'tuningNumbers',
    'LevelSchema',
    'CharacterSchema',
    'TilesetSchema',
    'BehaviourSchema',
    'TuningSchema',
    'FeelSchema',
    'SoundSchema',
    'MusicSchema',
    'CuesSchema',
    'ConversationSchema',
    'CutsceneSchema',
    'MessagesSchema',
    'FigureSchema',
    'BackdropSchema',
    'encodePng',
    'paintFigure',
    'paintBackdrop',
    'figureSheet',
    'backdropSheet',
    'atlasOf',
    'artFiles',
    'artProblems',
    'paintedPath',
    'Sprite',
    'spritesPlugin',
    'usesSprites',
    'setClip',
    'setFacing',
    'tileBoxes',
    'PROJECT_FILE',
    'spawnLevel',
    'createGameSim',
    'levelSize',
    'Look',
    'Thing',
    'joinCommand',
    'leaveCommand',
    'JoinCommand',
    'LeaveCommand',
    'joinPlugin',
    'playersIn',
    'createSequence',
    'PAD_BUTTONS',
    'PAD_STICKS',
    'RESERVED_KEYS',
    'RESERVED_PAD',
    'memoryStore',
    'defineSave',
    'createSaves',
    'latestSlot',
    'openSettings',
    'testHost',
    'isOpenableLink',
    'z',
    'FRAMEWORK_VERSION',
    'Joint',
    'JointKind',
    'joint',
    'touchEvent',
    'touchPlugin',
    'usesJoints',
    'touchKinds',
    'joinSession',
    'createSession',
    'createRoomEngine',
    'OnlineError',
    'PROTOCOL_VERSION',
    'onlineWords',
    'createAudio',
    'testSpeaker',
    'scoreOf',
    'hertzOf',
    'SoundSettingsSchema',
    'SOUND_SETTINGS_DEFAULT',
    'MAX_SAME',
    'MAX_SOUNDS',
    'LOG_MAX',
    'simContent',
    // The player's language (plan L).
    'createLocale',
    'fill',
    'fitLabel',
    'levelName',
    'LANGUAGE_NAMES',
    'LANGUAGE_TAGS',
    'matchLanguage',
    'pickLanguage',
    'LANGUAGE_SETTINGS_DEFAULT',
    'LanguageSettingsSchema',
    'frameworkWords',
    'languagesOf',
    'typed',
    'wordsOf',
    'placeholdersOf',
    'languageName',
    'translationProblems',
    'READ_MARKS_FILE',
    'parseReadMarks',
    'writeReadMarks',
    'readMark',
    'markRead',
    'unreadWords',
    'onlineMessage',
  ])
    expect(api, name).toHaveProperty(name)
})

test("the server entry exports what a game's own server file needs", async () => {
  const api = await import('#src/server.ts')
  for (const name of ['createRoomServer', 'runRoomServer']) expect(api, name).toHaveProperty(name)
})

// The browser entry needs a page to be imported, so a Node test reads its text instead of loading it.
test('the browser entry adds the web host, and headless does not have it', async () => {
  const api = await import('#src/headless.ts')
  expect(api).not.toHaveProperty('webHost')
  // Sound that needs a page (Web Audio, the button) is the browser entry's; the audio itself is headless.
  for (const name of ['webSpeaker', 'playVoice', 'soundNotice']) expect(api, name).not.toHaveProperty(name)
  const entry = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
  expect(entry).toContain("export * from './features/web/web.ts'")
  expect(entry).toContain("export * from './headless.ts'")
  // The page's `<html lang>` follows the locale: it needs a page, so it is the browser entry's only.
  expect(api).not.toHaveProperty('followLanguage')
  const web = readFileSync(new URL('../src/features/web/web.ts', import.meta.url), 'utf8')
  expect(web).toContain('followLanguage')
})

// A game draws its pictures through the page entry, which needs a page, so the headless entry has none of it.
test('the page entry loads and checks pictures, and headless does not have that', async () => {
  const api = await import('#src/headless.ts')
  for (const name of ['loadArt', 'needsPictures', 'ArtError', 'createRenderer'])
    expect(api, name).not.toHaveProperty(name)
  const render = readFileSync(new URL('../src/features/render/render.ts', import.meta.url), 'utf8')
  for (const name of ['loadArt', 'needsPictures', 'ArtError', 'type ReadPicture', 'type Shot'])
    expect(render, name).toContain(name)
  const entry = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
  expect(entry).toContain("export * from './features/render/render.ts'")
})

test('the committed JSON Schemas are what the code produces', () => {
  for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
    const committed = JSON.parse(
      readFileSync(new URL(`../schemas/${type}.schema.json`, import.meta.url), 'utf8'),
    )
    expect(committed, type).toEqual(jsonSchemaFor(type))
  }
})

// The replay file has a schema of its own, beside the content kinds'; `scripts/write-schemas.ts --check` holds it.
test('there is a committed JSON Schema for every kind and for the replay file, and no stray one', () => {
  const committed = readdirSync(new URL('../schemas/', import.meta.url)).sort()
  expect(committed).toEqual(
    [...Object.keys(CONTENT_TYPES), 'replay'].map((type) => `${type}.schema.json`).sort(),
  )
})
