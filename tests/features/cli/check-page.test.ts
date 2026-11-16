// The `page` part of the rules step: what a game's page may never do, found at its line and said in words.
import { expect, test } from 'vitest'
import { pageProblems } from '#src/features/cli/check-page.ts'
import { templateTree } from '../../template/tree.ts'

const MAIN = 'src/main.ts'
const PAGE = '<!doctype html>\n<html><body><main id="game"></main></body></html>\n'

/** A page of two files: `index.html` and one script whose text is the test's. */
const found = (script: string, extra: Readonly<Record<string, string>> = {}) =>
  pageProblems({ 'index.html': PAGE, [MAIN]: script, ...extra })
const at = (line: number, message: string, file = MAIN) => ({ file, path: `line ${line}`, message })
/** Two lines, the second of which is `code`. */
const second = (code: string): string => `export const x = 1\n${code}\n`

const POPUP = (name: string): string =>
  `${name} stops the game with a box the player did not ask for. Show a screen of your own instead.`
const OPENS =
  'A game does not open windows by itself. To offer a link, use host.openLink from a button the player presses.'
const BACKGROUND = 'A game runs nothing in the background. Take this out.'
const SENSORS = "A game does not ask for the player's place, camera, microphone or clipboard. Take this out."
const PERSONAL = 'A game never asks for a password or personal details. Take this field out.'

test.each(['alert', 'confirm', 'prompt'])('%s is a box the player did not ask for', (name) => {
  expect(found(second(`${name}('hi')`))).toEqual([at(2, POPUP(name))])
})

test('open is a window the game opens by itself', () => {
  expect(found(second("open('https://example.com')"))).toEqual([at(2, OPENS)])
})

test('Notification and PushManager are notifications', () => {
  const sentence = 'A game sends no notifications.'
  expect(found(second('new Notification("hi")'))).toEqual([at(2, sentence)])
  expect(found(second('const push = PushManager'))).toEqual([at(2, sentence)])
})

test('document.write can wipe the page', () => {
  expect(found(second('document.write("x")'))).toEqual([
    at(2, 'document.write can wipe the page. Add elements with document.createElement.'),
  ])
})

test('a service worker and a shared worker run in the background', () => {
  expect(found(second("navigator.serviceWorker.register('/sw.js')"))).toEqual([at(2, BACKGROUND)])
  expect(found(second("const w = new SharedWorker('/w.js')"))).toEqual([at(2, BACKGROUND)])
})

test('place, camera, microphone, screen and clipboard are not for a game', () => {
  expect(found(second('navigator.geolocation.getCurrentPosition(() => 1)'))).toEqual([at(2, SENSORS)])
  expect(found(second('navigator.mediaDevices.getUserMedia({ video: true })'))).toEqual([at(2, SENSORS)])
  expect(found(second('navigator.mediaDevices.getDisplayMedia()'))).toEqual([at(2, SENSORS)])
  expect(found(second('navigator.clipboard.read()'))).toEqual([at(2, SENSORS)])
})

test('a password, email or phone field, or an autocomplete for personal details, is found in the page', () => {
  const html = (field: string): Record<string, string> => ({
    'index.html': `<!doctype html>\n<body>\n${field}\n</body>\n`,
  })
  const inPage = (field: string) => pageProblems({ ...html(field), [MAIN]: 'export const x = 1\n' })
  for (const field of [
    '<input type="password">',
    '<input type=email>',
    "<input type='tel'>",
    '<input autocomplete="email">',
    '<input autocomplete="shipping street-address">',
    '<input autocomplete="address-line1">',
    '<input autocomplete="cc-number">',
  ])
    expect(inPage(field), field).toEqual([at(3, PERSONAL, 'index.html')])
  expect(inPage('<input type="text" autocomplete="off">')).toEqual([])
  expect(inPage('<input type="range">')).toEqual([])
})

test('a field made in script is found too', () => {
  const script = "const field = document.createElement('input')\nfield.type = 'password'\n"
  expect(found(script)).toEqual([at(1, PERSONAL)])
  expect(found("const field = document.createElement('input')\nfield.type = 'range'\n")).toEqual([])
})

test('window.confirm(, globalThis.alert( and self.open( are found', () => {
  expect(found(second("window.confirm('x')"))).toEqual([at(2, POPUP('confirm'))])
  expect(found(second("globalThis.alert('x')"))).toEqual([at(2, POPUP('alert'))])
  expect(found(second("self.open('x')"))).toEqual([at(2, OPENS)])
})

test('a file that declares its own confirm, prompt or open may call it', () => {
  expect(found("const confirm = (text: string) => text\nexport const x = confirm('ok')\n")).toEqual([])
  expect(found('function open() { return 1 }\nexport const x = open()\n')).toEqual([])
  expect(found("import { prompt } from './words.ts'\nexport const x = prompt('ok')\n")).toEqual([])
  expect(found("export const ask = (alert: string) => alert('ok')\n")).toEqual([])
})

test('indexedDB.open(…) and db.open(…) are not found', () => {
  expect(found(second("indexedDB.open('save')"))).toEqual([])
  expect(found(second("db.open('save')"))).toEqual([])
})

test('a field inside <!-- --> in index.html is not found', () => {
  const html = '<!doctype html>\n<!--\n<input type="password">\n-->\n<body></body>\n'
  expect(pageProblems({ 'index.html': html, [MAIN]: 'export const x = 1\n' })).toEqual([])
})

test('a name in a comment or as part of a longer name is not found', () => {
  expect(found('// alert("x")\n/* open("y") */\nexport const y = 1\n')).toEqual([])
  expect(found('export const myalert = () => 1\nexport const y = myalert()\n')).toEqual([])
  expect(found(second('reopen(1)'))).toEqual([])
})

test('an address of another site in the code is not a problem', () => {
  expect(found(second("fetch('https://example.com/data.json')"))).toEqual([])
})

test('a game with no index.html says so once, at index.html', () => {
  expect(pageProblems({ [MAIN]: 'export const x = 1\n' })).toEqual([
    { file: 'index.html', path: '', message: 'This file is missing. It is the page the game opens in.' },
  ])
})

test('problems are in the order of file, then place', () => {
  const problems = found(`${second("alert('a')")}confirm('b')\n`, {
    'src/a.ts': "alert('c')\n",
  })
  expect(problems.map((p) => `${p.file} ${p.path}`)).toEqual([
    'src/a.ts line 1',
    `${MAIN} line 2`,
    `${MAIN} line 3`,
  ])
})

test('the template as create writes it has no page problem', () => {
  const tree = templateTree()
  const isPage = (path: string): boolean =>
    path === 'index.html' || (path.startsWith('src/') && /\.(ts|js|svelte|html|css)$/.test(path))
  const files = Object.fromEntries(Object.entries(tree).filter(([path]) => isPage(path)))
  expect(pageProblems(files)).toEqual([])
})
