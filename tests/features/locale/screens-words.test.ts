// The words of every screen (plan U): the table below is what the screens say, in English exactly, and the other five
// languages say the same as plainly. The six files are also held to one set of keys and to `writeContent`'s bytes by
// `library.test.ts`; this holds what is particular to the screens' words.
import { describe, expect, test } from 'vitest'
import { LANGUAGES, type Language } from '#src/features/content/content.ts'
import enRaw from '#src/features/locale/library/en.json?raw'
import esRaw from '#src/features/locale/library/es.json?raw'
import jaRaw from '#src/features/locale/library/ja.json?raw'
import koRaw from '#src/features/locale/library/ko.json?raw'
import ptRaw from '#src/features/locale/library/pt.json?raw'
import zhRaw from '#src/features/locale/library/zh.json?raw'

const RAW: Readonly<Record<Language, string>> = {
  en: enRaw,
  es: esRaw,
  ko: koRaw,
  ja: jaRaw,
  zh: zhRaw,
  pt: ptRaw,
}
const wordsIn = (language: Language): Record<string, string> =>
  (JSON.parse(RAW[language]) as { messages: Record<string, string> }).messages

/** Every sentence the screens say, as the English the Owner's plan gives, exactly. `{…}` values are filled by the screen. */
const SCREEN_WORDS: readonly (readonly [string, string])[] = [
  ['automata.warnings.title', 'Before you play'],
  ['automata.warnings.no-saving', 'This browser will not keep your progress. You can still play.'],
  ['automata.warnings.ok', 'OK'],
  ['automata.menu.continue', 'Continue'],
  ['automata.menu.play', 'Play'],
  ['automata.menu.new', 'New game'],
  ['automata.menu.saves', 'Saved games'],
  ['automata.menu.add-player', 'Add a player'],
  ['automata.menu.settings', 'Settings'],
  ['automata.menu.quit', 'Quit'],
  ['automata.pause.button', 'Pause'],
  ['automata.pause.title', 'Paused'],
  ['automata.pause.resume', 'Keep playing'],
  ['automata.pause.leave', 'Main menu'],
  ['automata.pause.leave-ask', 'Go to the main menu? You will start this level again next time.'],
  ['automata.pause.leave-yes', 'Go to the main menu'],
  ['automata.pause.remove', 'Take out player {player}'],
  ['automata.done.title', 'Well done!'],
  ['automata.done.level', 'You finished {level}.'],
  ['automata.done.game', 'You finished the game.'],
  ['automata.done.next', 'Next level'],
  ['automata.done.menu', 'Main menu'],
  ['automata.done.not-kept', 'This browser did not keep your progress.'],
  ['automata.settings.title', 'Settings'],
  ['automata.back', 'Back'],
  ['automata.settings.sound', 'Sound'],
  ['automata.settings.music', 'Music'],
  ['automata.settings.effects', 'Sounds'],
  ['automata.settings.sound-waiting', 'Tap anywhere to start the sound.'],
  ['automata.settings.sound-none', 'This browser cannot play sound.'],
  ['automata.settings.language', 'Language'],
  ['automata.settings.touch', 'Touch'],
  ['automata.settings.swap', 'Swap sides'],
  ['automata.settings.vibration', 'Vibration'],
  ['automata.settings.controls', 'Controls'],
  ['automata.settings.keyboard', 'Keyboard'],
  ['automata.settings.gamepad', 'Gamepad'],
  ['automata.settings.change', 'Change'],
  ['automata.settings.press-key', 'Press the new key for {action}.'],
  ['automata.settings.press-button', 'Press the new button for {action}.'],
  ['automata.settings.cancel', 'Cancel'],
  ['automata.settings.reset', 'Put the controls back'],
  ['automata.settings.reset-ask', 'Put every key and button back the way it started?'],
  ['automata.settings.reset-yes', 'Put them back'],
  ['automata.settings.lost', 'Your settings could not be read, so they are back the way they started.'],
  ['automata.settings.keys-lost', 'Some keys could not be read, so they are back the way they started.'],
  ['automata.settings.not-kept', 'This browser did not keep that change. It lasts until you leave.'],
  ['automata.saves.title', 'Saved games'],
  ['automata.saves.place', 'Game {number}'],
  ['automata.saves.empty', 'Empty'],
  ['automata.saves.continue', 'Continue'],
  ['automata.saves.new', 'New game here'],
  ['automata.saves.replace-ask', 'Start a new game here? The game saved here will be lost.'],
  ['automata.saves.replace-yes', 'Start a new game'],
  ['automata.saves.erase', 'Delete'],
  ['automata.saves.erase-ask', 'Delete this saved game? You cannot get it back.'],
  ['automata.saves.erase-yes', 'Delete it'],
  ['automata.keep', 'Keep it'],
  ['automata.saves.refused.unavailable', 'This browser will not keep your progress.'],
  ['automata.saves.refused.full', 'There is no room left to save. Delete a saved game, then try again.'],
  ['automata.saves.refused.failed', 'Saving did not work. Try again.'],
  ['automata.saves.damaged', 'This saved game is damaged and cannot be opened.'],
  [
    'automata.saves.newer',
    'This saved game is from a newer version of the game. Load the page again to get it.',
  ],
  ['automata.saves.too-old', 'This saved game is too old to open.'],
  ['automata.players.title', 'Add a player'],
  ['automata.players.pad', 'Press any button on your gamepad to join.'],
  ['automata.players.keyboard', 'Or press Enter to share the keyboard.'],
  ['automata.players.in', 'Player {player} is in.'],
  ['automata.players.done', 'Done'],
  ['automata.players.name', 'Player {player}'],
  ['automata.problem.title', 'The game stopped.'],
  ['automata.problem.text', 'Something went wrong. Load the page again to keep playing.'],
  ['automata.problem.reload', 'Load the page again'],
  ['automata.watch.tap', 'The game is playing by itself. Tap it to play.'],
]

/** The words on a button or a switch: short enough to read at a glance, in every language. */
const BUTTON_WORDS: readonly string[] = [
  'automata.warnings.ok',
  'automata.menu.continue',
  'automata.menu.play',
  'automata.menu.new',
  'automata.menu.saves',
  'automata.menu.add-player',
  'automata.menu.settings',
  'automata.menu.quit',
  'automata.pause.button',
  'automata.pause.resume',
  'automata.pause.leave',
  'automata.done.next',
  'automata.done.menu',
  'automata.back',
  'automata.settings.change',
  'automata.settings.cancel',
  'automata.settings.reset',
  'automata.settings.reset-yes',
  'automata.saves.continue',
  'automata.saves.new',
  'automata.saves.replace-yes',
  'automata.saves.erase',
  'automata.saves.erase-yes',
  'automata.keep',
  'automata.players.done',
  'automata.problem.reload',
]

/** What a placeholder is called in `text`, as a sorted list: `{player}` is `player`. */
const valuesOf = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort()

/** The count of words in a sentence of a language that spaces its words; one script run counts as one word. */
const wordsOf = (text: string): number => text.split(/\s+/).filter((word) => word !== '').length

test('the table has what the plan has: seventy-four sentences, each key once', () => {
  expect(SCREEN_WORDS).toHaveLength(74)
  expect(new Set(SCREEN_WORDS.map(([key]) => key)).size).toBe(74)
})

describe.each(LANGUAGES)('the screens in the %s file', (language) => {
  test('has every key of the table', () => {
    const words = wordsIn(language)
    expect(SCREEN_WORDS.filter(([key]) => words[key] === undefined).map(([key]) => key)).toEqual([])
  })

  test('says every {value} the English says, and none it does not', () => {
    const words = wordsIn(language)
    for (const [key, english] of SCREEN_WORDS)
      expect(valuesOf(words[key] ?? ''), `${language} ${key}`).toEqual(valuesOf(english))
  })

  test('puts at most four words on a button, and never says slot, binding or locale', () => {
    const words = wordsIn(language)
    for (const key of BUTTON_WORDS)
      expect(wordsOf(words[key] ?? ''), `${language} ${key}`).toBeLessThanOrEqual(4)
    for (const [key] of SCREEN_WORDS)
      expect(words[key], `${language} ${key}`).not.toMatch(/\b(slots?|bindings?|locales?)\b/i)
  })

  test('names no colour', () => {
    const colours =
      /\b(red|green|blue|yellow|orange|purple|pink|black|white|gr[ae]y|rojo|verde|azul|amarillo|vermelho|amarelo|preto|branco)\b|赤|青|緑|黄色|红|蓝|绿|黄|빨강|파랑|초록|노랑/i
    const words = wordsIn(language)
    for (const [key] of SCREEN_WORDS) expect(words[key], `${language} ${key}`).not.toMatch(colours)
  })
})

test('the English is exactly the table', () => {
  const words = wordsIn('en')
  for (const [key, english] of SCREEN_WORDS) expect(words[key], key).toBe(english)
})

test('no English sentence has more than fourteen words', () => {
  for (const [key, english] of SCREEN_WORDS)
    for (const sentence of english.split(/(?<=[.?!])\s+/))
      expect(wordsOf(sentence), `${key}: ${sentence}`).toBeLessThanOrEqual(14)
})

test('no English sentence holds a line break or markup, which a screen would show as it is', () => {
  for (const [key, english] of SCREEN_WORDS) expect(english, key).not.toMatch(/[\n<>]/)
})
