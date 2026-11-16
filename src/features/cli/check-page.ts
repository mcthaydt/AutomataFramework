// The `page` part of the `rules` step: what a game's page may never do, found in its text and said in words. Three
// groups are held: nothing pops up, no password or personal details are asked for, and nothing runs in the background.
// (Money, tracking and addresses of other sites are the host's rules, not a game's, so they have no row.) Like
// `ruleProblems` it reads text, not a syntax tree: it can be fooled by a string that looks like a name, and it cannot
// see a name built at run time.
import { withoutComments } from '../../lib/imports.ts'
import type { Diagnostic } from '../content/content.ts'

const PAGE = 'index.html'

const POPUP = (name: string): string =>
  `${name} stops the game with a box the player did not ask for. Show a screen of your own instead.`
const OPENS =
  'A game does not open windows by itself. To offer a link, use host.openLink from a button the player presses.'
const NO_NOTIFICATIONS = 'A game sends no notifications.'
const NO_WRITE = 'document.write can wipe the page. Add elements with document.createElement.'
const NO_BACKGROUND = 'A game runs nothing in the background. Take this out.'
const NO_SENSORS =
  "A game does not ask for the player's place, camera, microphone or clipboard. Take this out."
const NO_PERSONAL = 'A game never asks for a password or personal details. Take this field out.'

/** The names whose call stops the game or opens a window: found as `window.name(` anywhere, or bare when not the game's own. */
const CALLED: readonly { readonly name: string; readonly sentence: string }[] = [
  { name: 'alert', sentence: POPUP('alert') },
  { name: 'confirm', sentence: POPUP('confirm') },
  { name: 'prompt', sentence: POPUP('prompt') },
  { name: 'open', sentence: OPENS },
]

const NAMED: readonly { readonly pattern: RegExp; readonly sentence: string }[] = [
  { pattern: /(?<![\w$.])(?:Notification|PushManager)(?![\w$])/g, sentence: NO_NOTIFICATIONS },
  { pattern: /(?<![\w$])document\.write(?![\w$])/g, sentence: NO_WRITE },
  { pattern: /(?<![\w$])navigator\.serviceWorker(?![\w$])/g, sentence: NO_BACKGROUND },
  { pattern: /(?<![\w$])new\s+SharedWorker(?![\w$])/g, sentence: NO_BACKGROUND },
  { pattern: /(?<![\w$])navigator\.geolocation(?![\w$])/g, sentence: NO_SENSORS },
  { pattern: /(?<![\w$])(?:getUserMedia|getDisplayMedia)(?![\w$])/g, sentence: NO_SENSORS },
  { pattern: /(?<![\w$])navigator\.clipboard\.read(?:Text)?(?![\w$])/g, sentence: NO_SENSORS },
]

const PERSONAL_TYPES = ['password', 'email', 'tel']
const PERSONAL_AUTOCOMPLETE = ['name', 'email', 'tel', 'street-address', 'postal-code', 'cc-number']

/** The same text with `<!-- -->` taken out, keeping its line breaks so a place found is the file's own line. */
const withoutHtmlComments = (text: string): string =>
  text.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ''))

/** Whether the file makes `name` its own: a declaration, a parameter or an import, so a call to it is not the page's. */
function declares(code: string, name: string): boolean {
  const word = `(?<![\\w$.])${name}(?![\\w$])`
  return [
    new RegExp(`\\b(?:const|let|var|function|class)\\s+${name}(?![\\w$])`),
    new RegExp(`\\b(?:const|let|var)\\s*[{[][^=;]*${word}`),
    new RegExp(`\\bimport\\s[^'";]*${word}[^'";]*\\sfrom\\b`),
    new RegExp(`[(,]\\s*${word}\\s*(?:[,)=:?]|$)`, 'm'),
    new RegExp(`${word}\\s*=>`),
  ].some((pattern) => pattern.test(code))
}

/** `name(…) {` or `name(…): type {` is a method being written, not a call. */
const isDefinition = (code: string, from: number): boolean =>
  /^\s*\([^()]*\)\s*(?::[^={;]*)?\{/.test(code.slice(from))

const lineOf = (code: string, index: number): number => code.slice(0, index).split('\n').length

interface Found {
  readonly file: string
  readonly index: number
  readonly line: number
  readonly message: string
}

/** The value of attribute `name` in a tag's text, with no quotes, when it has one. */
function attribute(tag: string, name: string): string | undefined {
  const m = new RegExp(`(?<![\\w-])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return m === null ? undefined : (m[1] ?? m[2] ?? m[3])
}

/** Whether the text of one field (a tag, or the lines that set up a created element) asks for personal details. */
function personal(field: string): boolean {
  const type = attribute(field, 'type')?.trim().toLowerCase()
  if (type !== undefined && PERSONAL_TYPES.includes(type)) return true
  const set = /\.type\s*=\s*['"]([^'"]*)['"]|setAttribute\(\s*['"]type['"]\s*,\s*['"]([^'"]*)['"]/i.exec(
    field,
  )
  const made = (set?.[1] ?? set?.[2])?.toLowerCase()
  if (made !== undefined && PERSONAL_TYPES.includes(made)) return true
  const complete =
    attribute(field, 'autocomplete') ??
    /\.autocomplete\s*=\s*['"]([^'"]*)['"]|setAttribute\(\s*['"]autocomplete['"]\s*,\s*['"]([^'"]*)['"]/i
      .exec(field)
      ?.slice(1, 3)
      .find((v) => v !== undefined)
  if (complete === undefined) return false
  return complete
    .toLowerCase()
    .split(/\s+/)
    .some((token) => PERSONAL_AUTOCOMPLETE.includes(token) || token.startsWith('address-'))
}

/**
 * What a game's page may not do. `files` is every `.ts`, `.js`, `.svelte`, `.html` and `.css` under `src/` plus
 * `index.html`, by path. Text, not a syntax tree, as `ruleProblems` is. Sorted by file, then place.
 */
export function pageProblems(files: Readonly<Record<string, string>>): Diagnostic[] {
  if (files[PAGE] === undefined)
    return [{ file: PAGE, path: '', message: 'This file is missing. It is the page the game opens in.' }]
  const found: Found[] = []
  for (const [file, text] of Object.entries(files)) {
    const code = withoutComments(file.endsWith('.html') ? withoutHtmlComments(text) : text)
    const add = (index: number, message: string): void => {
      found.push({ file, index, line: lineOf(code, index), message })
    }
    for (const { name, sentence } of CALLED) {
      for (const m of code.matchAll(
        new RegExp(`(?<![\\w$.])(?:window|globalThis|self)\\.${name}\\s*\\(`, 'g'),
      ))
        add(m.index, sentence)
      if (declares(code, name)) continue
      for (const m of code.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(`, 'g'))) {
        if (!isDefinition(code, m.index + name.length)) add(m.index, sentence)
      }
    }
    for (const { pattern, sentence } of NAMED) for (const m of code.matchAll(pattern)) add(m.index, sentence)
    for (const m of code.matchAll(/<input\b[^>]*>/gi)) if (personal(m[0])) add(m.index, NO_PERSONAL)
    for (const m of code.matchAll(/createElement\(\s*['"]input['"]\s*\)/g)) {
      if (personal(code.slice(m.index, m.index + 400))) add(m.index, NO_PERSONAL)
    }
  }
  return found
    .sort((a, b) => (a.file === b.file ? a.index - b.index : a.file < b.file ? -1 : 1))
    .map((f) => ({ file: f.file, path: `line ${f.line}`, message: f.message }))
}
