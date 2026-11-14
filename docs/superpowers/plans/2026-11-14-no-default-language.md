# Plan W: No Default Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No player is ever given a language they did not ask for: each game names the language its team writes in
(`source`), a first-time player picks theirs from flags, lists follow the speakers' order, and `automata words` lists
and marks the translated words against the game's own language.

**Architecture:** `content` gains `source` in `automata.toml` and checks every language against it; the read marks
name the language they were made against (format 2). `locale` stops ending in a language: it answers one or none, and
holds the picker's rules with no page. `web` draws the picker from six SVG flags, and `startGame` refuses to start
before a language is chosen, so the anti-goal cannot be reached by forgetting a step. `cli` gains `automata words`,
the MCP `words` tool and `create --source`. `source` and the words stay out of what the sim is given, so no hash moves.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, smol-toml 1.9.0, Effect (the command only), Vitest 5.0.3 (browser
mode and journeys on Playwright 1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0. **No new dependency.**

**Spec:** [`docs/superpowers/specs/2026-11-14-no-default-language-design.md`](../specs/2026-11-14-no-default-language-design.md),
an addendum to [`2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md) ("Languages (plan L)"). Read the spec
first; this plan argues from it and does not repeat its reasons. Principles served: 1 (the game's language is one
field, the marks one file, both reached by one command and one MCP tool), 2 (a touch-first picker the editors will
follow), and the drunk-grandma and onboarding rules (flags, one press).

## Global Constraints

- **No golden moves.** `template/replays/level-1.json` and everything in `tests/golden/` keep their hashes. If any
  recorded hash differs in CI, stop that task and report it to the coordinator. Never re-record.
- **No new dependency.** Flags and icons are SVG files drawn here. If a task seems to need a package, stop and report.
- **No `'en'` as a fallback anywhere in `src/`:** no default argument, no `?? 'en'`, no `Exclude<Language, 'en'>`, no
  `.en` lookup. Task 10 adds the test that holds this.
- **The order of languages is fixed:** `zh`, `es`, `en`, `pt`, `ja`, `ko`. A list a player sees puts their own first
  and moves nothing else. No list puts the game's `source` first.
- **Developer text stays in English on purpose** (Q1): the command's sentences, help, check results, the README, the
  skills, the template's `AGENTS.md`. Do not translate them and do not treat them as a gap.
- **US spelling** in every English word a player reads ("color"). `LANGUAGE_TAGS.en` is `en-US`.
- **Only flags on the picker.** No word shows before a flag is chosen.
- **Every touch target is at least 48 CSS pixels** on the picker, at every size in `tests/fixtures/game/screens.ts`.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no `pnpm install`, typecheck, lint or test. Push, then
  read the pull request's CI run. Write each test first and push it red before its code, as earlier plans did.
- **Generated files.** `schemas/*.json` and `docs/api/framework.api.md` are committed. When the `package` job fails
  on `pnpm schemas --check` or `pnpm api-report`, take the new text from that job's log and commit it (plan K's way).
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 5). Tasks 1 to 10 are 9% each; the last
  10% is the final green run with every check passing.

## The builder's calls

The spec leaves these to the builder, or is silent. They are settled here so the executor makes none of them.

1. **`pickLanguage` keeps its name** and answers a language with where it came from, or no language and the flag to
   open on (Task 4).
2. **A `Locale` can be "not asked yet".** `language()` is `undefined` until the player has a language. `startGame` and
   `startOnlineGame` take a `locale` (now required) and throw before anything is on the page when the player has not
   been asked (`!locale.asked()`). The guard is `asked()`, not `language() === undefined`: a watching locale has a
   language the player never chose, and a page that kept it after a take-over would start without the picker (plan
   audit I1). This is a breaking change to the public surface. Of the other repos only Examples calls `startGame`
   (`src/features/play/play.ts`), so plan D takes it; the Editors import only headless reading and writing, and their
   pin is reached only by the new `source` load rule (plan audit M3).
3. **The chosen flag follows focus.** Tapping, tabbing to, or arrowing to a flag chooses it; Enter, Space and the
   pad's confirm press Go. With no flag suggested, nothing is focused on a flag, so nothing is chosen.
4. **Two English fallbacks plan L's audit fixes left** (PR 88, merged while this plan was written) go too, though the
   spec's table does not list them: `soundNotice` falls back to `frameworkWords('en')`, and the pure `rebind` carries
   an English `message`. Both are the hidden fallback the spec's anti-goals name (Task 5).
5. **The template's "Loading the game…" becomes a wordless mark.** Every player sees it before a language is known.
   The page's "this game has a problem" screen stays as it is: it is made of the check's sentences and file paths,
   which are developer text (Q1).
6. **The README's first command says `--source en`**, with one sentence naming the six codes. The README is developer
   text in English, and its author writes in English. The create journey makes its game with `--source es`.
7. **The device's language on the command line** is read from `LC_ALL`, `LC_MESSAGES`, `LANG`, and on Windows from
   `Intl`. `Intl` is not asked on other systems: there it answers `en-US` for a machine that said nothing, which
   would bring the English default back.
8. **A game with one language still shows the picker** on a first visit: the spec says every first visit.
9. **The first-language counts** were written from memory (Ethnologue, 28th edition, 2025; millions): Chinese
   (Mandarin) 990, Spanish 484, English 390, Portuguese 250, Russian 145, Japanese 124, Korean 81, German 76, French
   74. The plan audit could not check them against the edition (the audit's machine is refused both Ethnologue and
   Wikipedia), so **no count is written into the code**: `LANGUAGES`'s comment says the order is by first-language
   speakers as Ethnologue (28th edition, 2025) ranks them, and gives no numbers. The order is the spec's and does not
   hang on the exact counts (plan audit I4).

## Review Focus

Each line names its test and the task that owns it.

1. **A saved language the game no longer has** (Portuguese was dropped): the picker shows again, and the stored
   value is left as it is. Task 4, `create.test.ts`.
2. **Storage refuses** (a private window): Go still starts the game in the chosen language; the next visit shows the
   picker again; nothing throws. Task 6, `picker.browser.test.ts`.
3. **A device tag for another variant** (`zh-Hant-TW`, `pt-PT`, `en-GB`, `es-ES`): the matching flag is chosen when
   the picker opens, and the player can change it. Task 4, `pick.test.ts`.
4. **Go pressed twice quickly:** one save, the game starts once. Task 6, `picker.browser.test.ts`.
5. **A gamepad button already held when the picker opens** (it confirmed the screen before): it does not press Go.
   Task 6, `pad-menu.browser.test.ts`.

## File Structure

```
src/features/content/messages.ts        LANGUAGES in speakers' order; sourceLacks, sourceMissing, checkAgainstSource
src/features/content/project.ts         Project.source
src/features/content/load.ts            the three source problems
src/features/content/type-info.ts       Listed.source
src/features/content/translations.ts    checks against the source
src/features/content/read-marks.ts      format 2
src/features/level/sim-content.ts       project.source leaves with the words
src/features/locale/pick.ts             pickLanguage (a language or none), playersOrder
src/features/locale/words.ts            the chain through the source; frameworkWords with no fallback
src/features/locale/create.ts           Locale: language() may be undefined, asked(), suggested(), listed(), wordsIn()
src/features/locale/picker.ts           NEW the picker's rules, no page
src/features/locale/library/*.json      + automata.picker.title, automata.picker.go
src/features/web/library/flags/         NEW zh.svg es.svg en.svg pt.svg ja.svg ko.svg (not locale/: plan audit I2)
src/features/input/pad-menu.ts          NEW gamepad menu presses with no running game
src/features/web/flags.ts               NEW languageFlag, languageRow
src/features/web/picker.ts              NEW languagePicker (the screen)
src/features/web/library/               NEW globe.svg, check.svg
src/features/web/ambient.d.ts           NEW declares '*.svg?raw'
src/features/web/notice.ts              locale required
src/features/input/bindings.ts          a refusal is a key and values, no English sentence
src/features/game/{game,online,players}.ts   locale required
src/features/cli/unread.ts              NEW `automata words`
src/features/cli/{args,cli,help,mcp-tools,create,ports,live,check-files,words}.ts
template/                               source, the picker in the page, format 2 marks
tests/                                  mirrors the above; tests/fixtures/locale/chosen.ts NEW
```

---

### Task 1: The speakers' order and US English

**Golden impact:** none. `LANGUAGES` is not part of what the sim is given.

**Files:**
- Modify: `src/features/content/messages.ts`, `src/features/locale/names.ts`, `src/features/locale/fill.ts`
- Modify: `schemas/messages.schema.json`, `docs/api/framework.api.md` (from the `package` job's log)
- Create: `tests/features/locale/us-english.test.ts`
- Modify: `tests/features/content/messages.test.ts`, `tests/features/locale/fill.test.ts`, and any test CI shows
  holding the old order or `lang` of `en`

**Interfaces:**
- Produces: `LANGUAGES = ['zh', 'es', 'en', 'pt', 'ja', 'ko'] as const`; `LANGUAGE_TAGS.en === 'en-US'`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/features/content/messages.test.ts
test('the languages are listed by how many people speak each as a first language', () => {
  expect(LANGUAGES).toEqual(['zh', 'es', 'en', 'pt', 'ja', 'ko'])
})
// tests/features/locale/fill.test.ts
test('an English list is joined the US way', () => {
  expect(fill('Players {players}', { players: [1, 2, 4] }, 'en')).toBe('Players 1, 2, and 4')
  expect(fill('Players {players}', { players: [1, 2] }, 'en')).toBe('Players 1 and 2')
})
test('the page is told English is US English', () => expect(LANGUAGE_TAGS.en).toBe('en-US'))
```

`tests/features/locale/us-english.test.ts`: read `src/features/locale/library/en.json` and
`template/content/messages/en.json` from disk; for every text expect no match of

```ts
const BRITISH =
  /\b(colour|favour|honour|behaviour|neighbour|flavour|humour|labour|centre|metre|litre|theatre|grey|defence|offence|licence|travell(?:ed|ing|er)|cancell(?:ed|ing)|(?:organ|real|recogn|apolog|custom)is(?:e|ed|es|ing)|analys(?:e|ed|ing)|programme|catalogue|cheque|whilst)/i
```

and one test that the pattern does fire on `"Pick a colour"`.

- [ ] **Step 2: Push; the three new assertions fail in the `check` job**

- [ ] **Step 3: Change the order and the tag**

`messages.ts`: `LANGUAGES` in the new order, with a doc comment that says the order is first-language speakers and
cites call 9. Reorder `LANGUAGE_NAMES_IN_ENGLISH` to match. Every sentence that lists the codes (`describe`,
`missing.id`) reads `zh, es, en, pt, ja or ko`. `names.ts`: both tables in the new order, `en: 'en-US'`. `fill.ts`:
delete `listTag`; `list` uses `LANGUAGE_TAGS[language]`.

- [ ] **Step 4: Push; fix what CI names**

Tests that typed the old order, `lang` `'en'` or "1, 2 and 4" in a player's sentence are corrected to the new truth.
Take `schemas/messages.schema.json` and the API report from the `package` job's log. Expected: every job green.

- [ ] **Step 5: Commit** `feat(locale): list languages by first-language speakers, and English is US English`

---

### Task 2: The game's own language, `source`

**Golden impact:** none, and proved: the template's recorded hash is compared with `source` set to each of the six,
in Node and the three browsers.

**Files:**
- Modify: `src/features/content/project.ts`, `load.ts`, `type-info.ts`, `messages.ts`, `conversation.ts`,
  `cutscene.ts`, `translations.ts`, `content.ts` (exports), `src/features/level/sim-content.ts`
- Modify: `docs/api/framework.api.md`, from the `package` job's log (`Project.source`, the renamed exports; no
  schema file holds `automata.toml`, so none moves)
- Modify: `template/automata.toml`, `tests/fixtures/full-game/automata.toml`, `tests/fixtures/locale/content.ts`,
  `tests/fixtures/content/kind.ts`
- Test: `tests/features/content/project.test.ts`, `load.test.ts`, `messages.test.ts`, `conversation.test.ts`,
  `cutscene.test.ts`, `translations.test.ts`, `agent-journey.test.ts`, `tests/features/level/sim-content.test.ts`,
  `tests/template/replay.parity.test.ts`

**Interfaces:**
- Produces:
  - `Project.source?: Language | undefined` (no `source` key at all when the file has none).
  - `Listed.source: Language | undefined`.
  - `sourceLacks(game: Listed, key: string): boolean`, `sourceMissing(game: Listed, key: string): string`
    (replace `englishLacks`, `englishMissing`; `checkAgainstEnglish` becomes `checkAgainstSource`).
  - Test fixtures: `withSource(toml: string, source: Language): string` in `tests/fixtures/content/kind.ts` (puts
    `source = "<code>"` on the line after `hero = …`, replacing one that is there); `wordsFiles(words, source)` and
    `wordsGame(words, source)` take the source as a required second argument.

- [ ] **Step 1: Write the failing tests**

`project.test.ts`: `source = "ko"` parses to `source: 'ko'`; a project without it has no `source` key
(`Object.hasOwn(value, 'source')` is false); `source = "fr"` is refused with
`Write one of zh, es, en, pt, ja or ko, like source = "es".`

`load.test.ts` (each expects `ok: false` and exactly this diagnostic, `file: 'automata.toml'`, `path: 'source'`):

| Game | Message |
|---|---|
| lists `es.json`, no `source` | ``Write the language your team writes the game's words in, like source = "es".`` |
| `source = "ko"`, lists only `es.json` | ``This game's words are written in Korean (source = "ko"), but no ko.json is listed. List content/messages/ko.json, or change source.`` |
| `source = "ko"`, lists no messages file | ``This game lists no words, so it has no language to name. Take the source line out, or list a messages file like content/messages/ko.json.`` |

And: a game with `source = "ko"`, `ko.json` and `es.json`, and no `en.json`, loads.

`translations.test.ts`, on that Korean-source game with `keeper.hello` only in `ko.json`:

```ts
expect(problems).toContainEqual({
  file: 'automata.toml', path: 'content',
  message: 'This game has no words in English. Add content/messages/en.json with every word Korean has, and list it here.',
})
expect(problems).toContainEqual({
  file: 'content/messages/es.json', path: 'messages',
  message: 'This file has no "keeper.hello". The Korean file says "안녕하세요!". Write it in Spanish.',
})
```

The missing-file sentences come in `LANGUAGES` order (`zh` before `en`), the source's own file is never checked
against itself, and the two value sentences read `Korean has {count} in this text and this one does not. Put {count}
where the number or name belongs.` and `This text has {cuont}, which Korean does not. Take it out, or fix its spelling.`

`conversation.test.ts` and `cutscene.test.ts`: a line whose key is in `es.json` but not in the Korean source reports
`Korean has no message called "keeper.bye". Add it to the Korean file or fix the spelling.`

`sim-content.test.ts`: `simContent` of a game with words has no `source` in its `project`, and two games that differ
only in `source` give deeply equal `simContent`.

`tests/template/replay.parity.test.ts`:

```ts
for (const source of LANGUAGES)
  test(`the recorded play ends on the same hash when the game is written in ${source}`, async () => {
    // the template's files with withSource(toml, source); play replays/level-1.json; compare with its recorded final hash
  })
```

`agent-journey.test.ts` (the end-to-end test of this task): an agent writes a Korean-source game from nothing but
text (`automata.toml` with `source = "ko"`, `ko.json`, `es.json` short one word), `loadGame` answers `ok`, and
`translationProblems` names the one Spanish word and the four missing languages, in order.

- [ ] **Step 2: Push; the new tests fail (no `source`, old sentences)**

- [ ] **Step 3: `project.ts`**

`source` joins `ProjectSchema` after `players`, optional, written as `players` is (a `z.custom` with the hint above as
its message), so the parsed project has no key when the line is left out.

- [ ] **Step 4: `load.ts`, `type-info.ts`, `messages.ts`, `conversation.ts`, `cutscene.ts`**

`load.ts`: the "needs English first" block is replaced by the three problems in the table; the folder in a sentence
is the folder of the first listed messages file. `Listed` gets `source: project.source`. `sourceLacks` is false when
`game.source` is undefined or its file is not listed (the project's own problem already says so) or was listed and
did not read; otherwise it is true when the source's file has no such own key. `checkAgainstSource` skips the
source's own file.

- [ ] **Step 5: `translations.ts`**

Every `english` becomes the source's file; a game with no words, no `source`, or no source file answers `[]`. The
doc comment says the game's own language stands in for a missing word.

- [ ] **Step 6: `sim-content.ts`**

The early return also needs `content.project.source === undefined`. The project that goes to the sim is built
without `source` (`const { source: _source, ...project } = content.project`). The doc comment says why: the team's
language is not what happens in the game.

- [ ] **Step 7: The fixtures and the template**

`template/automata.toml`, before the first `[[content]]`:

```toml
# The language your team writes the game's words in. Every other language is checked against it.
source = "en"
```

and the words' comment becomes: `# The game's words, one file for each language. The file of the game's own language
(source, above) says what every word is for; the others carry the same keys. automata check names a word a language
is missing.` `tests/fixtures/full-game/automata.toml` gets `source = "en"`. Every test that builds a game with words
names its source.

- [ ] **Step 8: Push; every job green, the parity jobs included**

- [ ] **Step 9: Commit** `feat(content): a game names the language it is written in`

---

### Task 3: Read marks, format 2

**Golden impact:** none. The marks files are not goldens and no replay reads them.

**Files:**
- Modify: `src/features/content/read-marks.ts`, `content.ts` (exports `emptyReadMarks`)
- Modify: `src/features/locale/library/automata.translations.toml`, `template/automata.translations.toml`
- Modify: `src/features/cli/check-files.ts` (only the call: `api.unreadWords(content, marks?.value)`)
- Test: `tests/features/content/read-marks.test.ts`, `tests/features/locale/library.test.ts`,
  `tests/template/words.test.ts`, `tests/features/cli/check-files.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ReadMarks {
  /** The language the marks were made against. */
  readonly source: Language
  /** For each other language, each read key and the mark of the two texts that were read. */
  readonly read: Readonly<Partial<Record<Language, Readonly<Record<string, string>>>>>
}
export function emptyReadMarks(source: Language): ReadMarks
export function parseReadMarks(text: string): Parsed<ReadMarks>
export function writeReadMarks(marks: ReadMarks): string
export function readMark(sourceText: string, translated: string): string // the hash is unchanged
export function markRead(content: GameContent, marks: ReadMarks | undefined, language: Language, keys?: readonly string[]): ReadMarks
export function unreadWords(content: GameContent, marks: ReadMarks | undefined): readonly { readonly language: Language; readonly key: string }[]
```

- [ ] **Step 1: Write the failing tests** (`read-marks.test.ts`)

```ts
test('format 2 is written and read back byte for byte', () => {
  const text = 'format = 2\nsource = "ko"\n\n[read.es]\n"keeper.hello" = "3f0c9a1e5b7d2c44"\n'
  const parsed = parseReadMarks(text)
  expect(parsed).toEqual({ ok: true, value: { source: 'ko', read: { es: { 'keeper.hello': '3f0c9a1e5b7d2c44' } } } })
  if (parsed.ok) expect(writeReadMarks(parsed.value)).toBe(text)
})
test('a format 1 file is read as made against English, and written back as format 2', () => {
  const parsed = parseReadMarks('format = 1\n\n[read.es]\n"keeper.hello" = "3f0c9a1e5b7d2c44"\n')
  expect(parsed.ok && parsed.value.source).toBe('en')
  if (parsed.ok) expect(writeReadMarks(parsed.value).startsWith('format = 2\nsource = "en"\n')).toBe(true)
})
test('an empty marks file is two lines', () => expect(writeReadMarks(emptyReadMarks('ko'))).toBe('format = 2\nsource = "ko"\n'))
```

Also, each as its own test:
- `[read.ko]` in a file with `source = "ko"` is refused:
  `These marks were made against Korean, so Korean has none of its own. Take this table out.`
- `[read.fr]` is refused: `This is not a language a game has words in. Use zh, es, en, pt, ja or ko.`
- `format = 2` with no `source` is refused: `Write the language the marks were made against, like source = "es".`
- Tables are written in `LANGUAGES` order with sorted keys.
- `readMark('Hello!', '¡Hola!')` is the value it was before this plan (copy the literal from the present test), so no
  read is lost.
- `markRead` with the game's own source language throws a `RangeError`:
  `This game is written in Korean, so Korean is not read against anything.`
- `markRead` with a language the game has no words in throws a `RangeError`.
- `unreadWords` is `[]` for a game with no words; every translated word for `undefined` marks; and **every word again
  when `marks.source` is not the game's `source`**, even if every mark is there.
- `markRead` on marks whose `source` is not the game's starts from `emptyReadMarks(gameSource)`.
- A table for a language the game has since dropped is kept by `markRead` of another language and ignored by
  `unreadWords`.

`library.test.ts`: the library's marks file is exactly `format = 2\nsource = "en"\n`, and the count test builds its
game with that file's `source`. `tests/template/words.test.ts`: the template's marks file is format 2 with the
template's `source`.

- [ ] **Step 2: Push; they fail (format 2 is refused today)**

- [ ] **Step 3: Implement `read-marks.ts`**

One schema that takes either format (`format: 1` with no `source`, or `format: 2` with one). The single place the
word for English appears is a named constant, `const FORMAT_1_SOURCE: Language = 'en'`, with the comment "Format 1
had no `source` line: every such file was made against English." `Translated` and `TRANSLATED` are deleted. The
words a speaker is asked to read are `language`'s texts the source's file also has, for every language but the
game's `source`.

- [ ] **Step 4: The two marks files become `format = 2` then `source = "en"`; `check-files.ts` passes the parsed
  marks or `undefined`**

- [ ] **Step 5: Push; green. Commit** `feat(content): read marks name the language they were made against`

---

### Task 4: A locale that answers a language or none, and the picker's rules

**Golden impact:** none.

**Files:**
- Modify: `src/features/locale/pick.ts`, `words.ts`, `create.ts`, `settings.ts` (comments only), `online.ts`,
  `paraglide.ts`, `locale.ts` (exports), the six `library/*.json`
- Create: `src/features/locale/picker.ts`, `tests/features/locale/picker.test.ts`,
  `tests/features/locale/first-visit.test.ts`, `tests/fixtures/locale/chosen.ts`
- Modify: `src/features/web/lang.ts`
- Test: `tests/features/locale/pick.test.ts`, `words.test.ts`, `create.test.ts`, `online.test.ts`,
  `paraglide.test.ts`, `library.test.ts`

**Interfaces:**
- Produces:

```ts
// pick.ts
export type LanguagePick =
  | { readonly language: Language; readonly from: 'saved' | 'host' }
  | { readonly language: undefined; readonly suggested: Language | undefined }
export function pickLanguage(options: {
  readonly saved?: string | undefined
  readonly host?: string | undefined
  readonly device: readonly string[]
  readonly shipped: readonly Language[]
}): LanguagePick
/** `shipped` with `own` moved to the front and nothing else moved; `shipped` itself when `own` is not in it. */
export function playersOrder(own: Language | undefined, shipped: readonly Language[]): readonly Language[]

// words.ts
export function wordsOf(content: GameContent, language: Language): Words
export function frameworkWords(language: Language): Words // the library in that language, then the key; no fallback

// online.ts
export function onlineWords(status: OnlineStatus, words: Words): string

// create.ts
export interface Locale {
  /** The language the words are in now. `undefined` until the player has one: show the picker first. */
  language(): Language | undefined
  /** True when the player's language is their saved choice or the host's own. False: they have not been asked. */
  asked(): boolean
  /** The flag the picker opens on: the device's language when the game has it, else none. */
  suggested(): Language | undefined
  /** The game's languages in the fixed order. */
  readonly languages: readonly Language[]
  /** The same languages as a player's list: `language() ?? suggested()` first, nothing else moved. */
  listed(): readonly Language[]
  /** Words in the language now. Before there is one, a key comes back as itself, as a word nobody wrote does. */
  readonly words: Words
  /** Words in one language whatever the language is now: the picker shows its title in a flag's language. */
  wordsIn(language: Language): Words
  say(message: Message): string
  /** Rejects with a `RangeError`, changing nothing, for a language this game has no words in. */
  set(language: Language): Promise<StoreResult<void>>
  onChange(listener: (language: Language) => void): () => void
}
export function createLocale(options: {
  readonly content: GameContent
  readonly host: Pick<Host, 'language' | 'deviceLanguages'>
  readonly settings: Settings
  /** Watch mode: nobody is there to ask, so until a choice the words are in `suggested()`, else the game's `source`. */
  readonly watching?: boolean
}): Locale

// picker.ts
export interface Picker {
  /** The flags in the order shown: `locale.listed()` when the picker was made. */
  readonly flags: readonly Language[]
  chosen(): Language | undefined
  /** Throws a `RangeError` for a language that is not one of `flags`. */
  choose(language: Language): void
  /** One flag back or on. With none chosen, the first flag. Stops at each end. */
  move(step: -1 | 1): void
  /** The picker's words in the chosen flag's language; `undefined` while none is chosen. */
  words(): { readonly title: string; readonly go: string } | undefined
  /** Keeps the choice (`locale.set`) and answers the host's answer. `undefined`, and nothing happens, with no flag
   *  chosen or after an earlier `go`. */
  go(): Promise<StoreResult<void> | undefined>
  onChange(listener: () => void): () => void
}
export function createPicker(locale: Locale): Picker

// tests/fixtures/locale/chosen.ts
/** A locale on a test host whose player has already chosen `language`. */
export function chosenLocale(content: GameContent, language: Language): Promise<Locale>
```

`Locale.choice()` and the `'auto'` choice are removed.

- [ ] **Step 1: Write the failing tests**

`pick.test.ts`:

```ts
const SIX = LANGUAGES
test('a first-time player with a French device is not given a language', () => {
  expect(pickLanguage({ device: ['fr-FR', 'fr'], shipped: SIX })).toEqual({ language: undefined, suggested: undefined })
})
test('the saved choice is the language', () => {
  expect(pickLanguage({ saved: 'ko', device: ['ja-JP'], shipped: SIX })).toEqual({ language: 'ko', from: 'saved' })
})
test("a host that knows the player's language sets it", () => {
  expect(pickLanguage({ host: 'pt_BR.UTF-8', device: ['ja-JP'], shipped: SIX })).toEqual({ language: 'pt', from: 'host' })
})
test('a saved or host language the game lacks is passed over, and the device only suggests', () => {
  expect(pickLanguage({ saved: 'pt', host: 'pt', device: ['ja-JP'], shipped: ['zh', 'ja'] })).toEqual({
    language: undefined, suggested: 'ja',
  })
})
test.each([['zh-Hant-TW', 'zh'], ['pt-PT', 'pt'], ['en-GB', 'en'], ['es-ES', 'es']] as const)(
  'a device that says %s opens the picker on %s', (tag, flag) => {
    expect(pickLanguage({ device: [tag], shipped: SIX })).toEqual({ language: undefined, suggested: flag })
  })
test("a player's list has their own language first and nothing else moved", () => {
  expect(playersOrder('ko', SIX)).toEqual(['ko', 'zh', 'es', 'en', 'pt', 'ja'])
  expect(playersOrder(undefined, SIX)).toEqual(SIX)
  expect(playersOrder('ko', ['zh', 'es'])).toEqual(['zh', 'es'])
})
```

`words.test.ts`: in a Korean-source game where Spanish lacks `keeper.hello`, `wordsOf(content, 'es')('keeper.hello')`
is the Korean text; a key no file has comes back as the key; `frameworkWords('ja')('automata.touch.label')` is the
Japanese text and `frameworkWords('ja')('nobody.wrote.this')` is the key.

`library.test.ts`: every one of the six files has every key the others have (compare each with each, no file is "the
first"), including `automata.picker.title` and `automata.picker.go`.

`create.test.ts`:
- French device, nothing saved: `language()` is `undefined`, `asked()` false, `suggested()` undefined,
  `listed()` equals `languages`, and `words('keeper.hello')` is `'keeper.hello'`.
- Japanese device: `language()` undefined, `suggested()` `'ja'`, `listed()[0]` `'ja'`.
- After `await locale.set('ko')`: `language()` `'ko'`, `asked()` true, listeners heard `'ko'`, and a second locale
  made on the same host is Korean from the start.
- Review Focus 1: the store holds `pt`, the game has only `zh` and `ja`: `asked()` false, and the stored section
  still says `pt` afterwards.
- `watching: true`: Japanese device gives `language()` `'ja'` and `asked()` false; a French device in a
  Korean-source game gives `'ko'` and `asked()` false; a game with no words and a French device gives `undefined`.
- `set` of a language the game lacks rejects with a `RangeError`.

`picker.test.ts`: French device: `flags` is the fixed order, `chosen()` undefined, `words()` undefined, `go()`
resolves `undefined` and the store is untouched. `move(1)` chooses `flags[0]`; `move(-1)` at the first flag stays.
`choose('ko')`: `words()` equals `{ title: '한국어로 플레이', go: '시작' }`. `go()` saves; a second `go()` answers
`undefined` and the store was written once. Japanese device: `flags[0]` is `'ja'` and it is chosen.

`first-visit.test.ts` (the end-to-end test of this task, in Node): one `testHost` with a French device; make a
locale and a picker; choose Korea; go; make a second locale on the same host's store; its `language()` is `'ko'`,
`asked()` is true and its `words('automata.touch.label')` is the Korean text.

`paraglide.test.ts`: with no language yet, the bound `getLocale` answers `runtime.baseLocale`.
`online.test.ts`: every call passes `frameworkWords(<a language the test names>)`.

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: The library's two new words, in all six files, in `writeContent`'s key order**

| Key | zh | es | en | pt | ja | ko |
|---|---|---|---|---|---|---|
| `automata.picker.go` | 开始 | Vamos | Go | Vamos | スタート | 시작 |
| `automata.picker.title` | 用中文玩 | Jugar en español | Play in English | Jogar em português | 日本語でプレイ | 한국어로 플레이 |

- [ ] **Step 4: `pick.ts`, `words.ts`, `online.ts`**

`pickLanguage`: the saved tag, if the game has it, is the language (`from: 'saved'`); else the host's, if the game
has it (`from: 'host'`); else no language, and `suggested` is the first device tag the game has. `matchLanguage` is
unchanged. The word chain is: the game's file in the language, the library's in the language, the game's file in
`content.project.source`, the library's in that source, the key. A game with no `source` stops after the second.
`frameworkWords` is the library's file in the language, then the key.

- [ ] **Step 5: `create.ts`, `picker.ts`, `paraglide.ts`, `web/lang.ts`, `settings.ts` comments**

`createLocale` resolves through `pickLanguage`. With `watching`, a pick with no language shows `suggested`, else
`content.project.source`. `followLanguage` removes the `lang` attribute while `language()` is `undefined`.
`bindParaglide`'s `getLocale` answers `locale.language() ?? runtime.baseLocale`. `settings.ts`: `null` is "not chosen
yet"; "follow my device" is gone from every comment.

- [ ] **Step 6: Push; green. Commit** `feat(locale): no language is chosen for a player, and the picker's rules`

---

### Task 5: Every caller passes the player's language

**Golden impact:** none.

**Files:**
- Modify: `src/features/game/players.ts`, `game.ts`, `online.ts`, `src/features/input/touch.ts`, `input.ts`,
  `bindings.ts`, `src/features/web/notice.ts`
- Modify: every test and fixture that calls `startGame`, `startOnlineGame`, `createInput`, `createTouch`,
  `createPlayers` or `soundNotice` (find them with a search; about twenty files), `tests/install/smoke.mjs`,
  `tests/install/consumer.ts`
- Test: `tests/features/game/players.test.ts`, `game.browser.test.ts`, `language.browser.test.ts`,
  `tests/features/input/touch-words.browser.test.ts`, `bindings.test.ts`, `input.browser.test.ts`,
  `tests/features/web/notice.browser.test.ts`

**Interfaces:**
- Consumes: `Locale`, `chosenLocale` (Task 4).
- Produces:
  - `createPlayers(options)`: `words: Words` required.
  - `createTouch(mount, controls, options: { readonly win?: Window; readonly words: Words })`.
  - `InputOptions.words: Words` required.
  - `GameOptions.locale: Locale` and `OnlineOptions.locale: Locale` required.
  - `soundNotice(options)`: `locale: Pick<Locale, 'words' | 'onChange'>` required; `words?: string` stays the game's
    own words in its place.
  - `bindings.ts`: the pure `rebind` answers a refusal as `{ ok: false, reason, key, values? }`, with no `message`.
    `Input.rebind` answers `Rebound | (Refusal & { readonly message: string })`, exported as `SaidRebound`, where
    `Refusal` is the pure refusal and `message` is always in the input's words.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/features/game/game.browser.test.ts
test('a game does not start before the player has a language', async () => {
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  const locale = createLocale({ content, host, settings: await openSettings({ game: 'no-language', store: host.store }) })
  await expect(startGame({ ...options, host, locale })).rejects.toThrow(
    'No language is chosen yet. Show the language picker first (languagePicker), then start the game.',
  )
  expect(mount.childElementCount).toBe(0)
})
```

And, beside it, the same refusal for a watching locale that has a language (`createLocale({ …, watching: true })`
on a Japanese device, so `language()` is `'ja'` and `asked()` is false): a page that keeps the watch's locale after a
take-over cannot start the game without the picker. The same two tests for `startOnlineGame`.

`notice.browser.test.ts`: with a Korean locale and a game that has a cue, the button `startGame` shows reads
`눌러서 소리를 켜세요`; there is no test left for "no locale given". `bindings.test.ts`: a refusal has `reason`, `key`
and `values` and no own property `message`; the test that held the English in `bindings.ts` to the library's is
deleted with the English. `input.browser.test.ts`: `input.rebind` of a reserved key, with `frameworkWords('es')`,
answers the Spanish sentence as `message`. `touch-words.browser.test.ts`: with `frameworkWords('ja')` the overlay's `aria-label` is the
Japanese text; there is no test left for "no words given". `players.test.ts`: a refusal's `message` is in the
language of the `words` it was made with (`es`).

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: Implement**

`startGame` and `startOnlineGame`: right after `checkControls`, throw the sentence above when `!locale.asked()`
(call 2). Every `locale === undefined ? {} : …` goes. `soundNotice` is always given
`locale`, and the game's own string as `words` when `soundNotice` is one; inside it, `frameworkWords('en')` goes.
`bindings.ts`: `refused` no longer takes or returns an English sentence, and `Input.rebind` says every refusal with
its words (`words(answer.key, answer.values)`). `touch.ts`: `OVERLAY_WORDS` and
the "else English" comment are deleted; the overlay's name is `words('automata.touch.label')`. A button's words stay
`controls.<action>`, else the control's own `label`, which is the game's. Doc comments that say "Default: English"
are rewritten.

- [ ] **Step 4: The tests and fixtures**

A test that reads a sentence names its language with `chosenLocale(content, '<code>')` or `frameworkWords('<code>')`.
One that reads none uses `chosenLocale(content, 'ko')`, so nothing passes by leaning on English.
`tests/fixtures/locale/page.ts` stops adding `'en-US'` to the device's list. `language.browser.test.ts`: the
`&device=en-US` runs now save English first (`&saved=en`, a new query the fixture page reads and saves before it
makes the locale).

- [ ] **Step 5: Push; green in every engine and in `online`. Commit** `feat(game)!: a game starts in the player's language, never a default`

---

### Task 6: The flags and the picker screen

**Golden impact:** none.

**Files:**
- Create: `src/features/web/library/flags/{zh,es,en,pt,ja,ko}.svg`, `src/features/web/library/{globe,check}.svg`,
  `src/features/web/ambient.d.ts`, `src/features/web/flags.ts`, `src/features/web/picker.ts`,
  `src/features/input/pad-menu.ts`
- Modify: `src/features/web/web.ts`, `src/features/input/input.ts` (exports), `knip.json` only if CI names it
- Modify: `tests/fixtures/locale/page.ts` (the picker, a flags row for settings, `?source=`, `?watch`)
- **Where the flags live (a deviation from the spec, plan audit I2).** The spec puts them in
  `src/features/locale/library/flags/`. They are in `src/features/web/library/flags/` instead: the architecture rule
  `through-the-entry` fails any import into another feature's folder but its entry, so `web/flags.ts` could not
  import `../locale/library/flags/zh.svg?raw`; and `locale` is a headless feature the command runs in Node, where a
  `?raw` import of a drawing has no meaning. A drawing is the screen's, and the screen is `web`'s. The picker's rules,
  its two words and the order stay in `locale`, as the spec says.
- Test: `tests/features/web/flags.test.ts`, `tests/features/input/pad-menu.browser.test.ts`,
  `tests/features/web/picker.browser.test.ts`, `tests/features/csp/picker-no-eval.browser.test.ts`,
  `tests/features/game/language.browser.test.ts`

**Interfaces:**
- Consumes: `Locale`, `createPicker` (Task 4); `createPads`, `createMenu`, `MenuPress`, `PadLike`, `Frames`.
- Produces:

```ts
// input/pad-menu.ts, exported from input.ts
/** Gamepad presses for a screen shown while no game runs. What is held when it is made does nothing until let go. */
export function padMenu(options?: {
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
}): { on(listener: (press: MenuPress) => void): () => void; destroy(): void }

// web/flags.ts
/** The flag of a language as a drawing: no words in it, hidden from a screen reader (its button has the name). */
export function languageFlag(language: Language): SVGSVGElement
/** One real button for each language, in the order given. A press calls `onChoose`. */
export function languageRow(options: {
  readonly mount: HTMLElement
  readonly languages: readonly Language[]
  readonly chosen: Language | undefined
  readonly onChoose: (language: Language) => void
}): { choose(language: Language | undefined): void; focus(language: Language): void; destroy(): void }

// web/picker.ts
export const PICKER_PROPERTIES: readonly string[] // the CSS properties a game sets to dress the picker
/** The first-run screen. `done` resolves with the language once Go is pressed; it never resolves after `destroy`. */
export function languagePicker(options: {
  readonly mount: HTMLElement
  readonly locale: Locale
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
}): { readonly done: Promise<Language>; destroy(): void }
```

**The page it builds** (class names and attributes are the tests' hooks and plan U's):

```
div.automata-picker  role="dialog" aria-modal="true" tabindex="-1"   lang and aria-label set once a flag is chosen
  div.automata-picker-globe  aria-hidden="true"                      globe.svg; hidden once a flag is chosen
  h1.automata-picker-title   hidden until a flag is chosen           automata.picker.title, in the flag's language
  div.automata-picker-flags  role="group"
    button.automata-flag  type="button" data-language="ko" lang="ko" aria-label="한국어" aria-pressed="false"
  button.automata-picker-go  type="button" aria-disabled="true"      check.svg, then a span with automata.picker.go
```

- A flag button is 72 by 56 CSS pixels with the drawing 60 by 40 inside; Go is at least 64 by 64. The flags sit in a
  grid three across, never wider than 360 pixels, so two rows fit a phone held sideways (390 pixels high).
- `lang` on a flag button and on the dialog is `LANGUAGE_TAGS[language]`; a flag's `aria-label` is
  `LANGUAGE_NAMES[language]`.
- Go is never `disabled` (it must take focus); with no flag chosen it has `aria-disabled="true"`, shows only the
  icon, and a press does nothing.
- Choosing: a tap or click on a flag; focus arriving on a flag (Tab); ArrowLeft or ArrowUp (`move(-1)`),
  ArrowRight or ArrowDown (`move(1)`), with focus following the choice; the pad's left, up, right and down the same.
  Enter, Space and the pad's `accept` press Go, wherever the focus is. When the picker opens, focus goes to the
  suggested flag, or to the dialog itself when there is none.
- The chosen flag has `aria-pressed="true"` and a 4-pixel outline in `var(--automata-picker-chosen, #fff)`.
- `PICKER_PROPERTIES`: `--automata-picker-background` (fallback `#14141e`), `--automata-picker-color` (`#fff`),
  `--automata-picker-chosen` (`#fff`), `--automata-picker-radius` (`16px`), `--automata-picker-font`
  (`700 22px/1.2 system-ui,sans-serif`). Styles are set as `touch.ts` sets them, inline, each through its property.
- The picker fills the mount (`position:absolute; inset:0`), and puts back what it changed on the mount when it goes.

**The drawings.** Each flag file is one `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">` of plain shapes
with `fill` attributes: no `style`, no `<script>`, no `<text>`, no `href`, no `<image>`, under 2048 bytes, and readable
at 44 pixels wide.

| File | Drawing |
|---|---|
| `zh.svg` | China: a red field, one large yellow star at the top left and four small ones beside it |
| `es.svg` | Mexico: green, white and red upright thirds, with a small round emblem at the middle of the white |
| `en.svg` | The United States: thirteen stripes, red first, and a blue corner with rows of white dots for stars |
| `pt.svg` | Brazil: a green field, a yellow diamond, a blue disc with one white band across it |
| `ja.svg` | Japan: a white field and a red disc at the middle |
| `ko.svg` | South Korea: a white field, a red-over-blue disc, and four groups of black bars at the corners |

`globe.svg` and `check.svg` are 24-by-24 line drawings with `stroke="currentColor"` and the same rules.

- [ ] **Step 1: Write the failing tests**

`flags.test.ts` (Node, reads the files): there is one file for each of `LANGUAGES` and no other; each holds the rules
above (assert each by pattern); all six texts differ.

`pad-menu.browser.test.ts`: with a made-up pad, `dpad-right` held for one frame fires `'right'` once; `south` fires
`'accept'`; **Review Focus 5:** `south` held when `padMenu` is made fires nothing until it is let go and pressed again;
after `destroy` nothing fires and no frame is asked for.

`picker.browser.test.ts`, on `tests/fixtures/locale/page.ts` in a frame (as `language.browser.test.ts` opens it),
each journey in Chromium, WebKit and Firefox:

1. **A French device, first visit** (`&device=fr-FR`): six flags in the order `zh es en pt ja ko`, none pressed; the
   title is hidden and the page shows no letters at all (`innerText` of the dialog is empty); pressing Go changes
   nothing and the game has not started. Tapping Korea's flag shows the title `한국어로 플레이` and Go reads `시작`. Go
   starts the game: the greeting is Korean and `<html lang>` is `ko`. A second page on the same storage shows no
   picker and is Korean.
2. **A Japanese device, first visit** (`&device=ja-JP`), three runs: Japan's flag is first and pressed, the title is
   Japanese before anything is touched; one press of Go by a touch pointer, by the Enter key, and by the pad's
   `south` each starts the game in Japanese.
3. **Settings:** on a page already in Korean, the fixture's flags row (a `languageRow` over `locale.listed()`) has
   Korea first, then `zh es en pt ja`. Choosing Mexico's flag makes the greeting, the level's name, the refusal and
   the three touch buttons Spanish while the sim's tick goes on from where it was. A second page on the same storage
   is Spanish, with Mexico first.
4. **A Korean-source game** (`&source=ko&drop=es:keeper.hello`, the fixture drops that key from Spanish and sets
   `source`): with Spanish chosen, the greeting is the Korean text and every other word is Spanish.
5. **Watch mode, first visit** (`&watch&device=ja-JP`): the fixture plays a recording with
   `createLocale({ …, watching: true })` and no picker; the level's name is shown in Japanese. A tap stops the watch
   and shows the picker with Japan pressed; Go starts the level, which then takes a held key.
6. **Review Focus 2** (`&storage=refused&device=fr-FR`): choose Korea, Go: the game starts in Korean and nothing
   throws; a second page shows the picker again.
7. **Review Focus 4:** two clicks on Go in one task start one game (one canvas) and write the settings once.
8. **At every size in `SCREENS`:** each flag and Go is at least 48 by 48, whole on the screen, and the element at its
   middle is itself; each flag's drawing is not blank (a picture of it has more than one color). A picture is saved
   as `__screenshots__/picker-<name>.png` with nothing chosen and `picker-chosen-<name>.png` with Korea chosen.
9. **A screen reader's names:** each flag's accessible name is `LANGUAGE_NAMES[language]` and its `lang` is
   `LANGUAGE_TAGS[language]`.
10. **Keys:** from a French device, ArrowRight chooses the first flag, ArrowRight again the second, ArrowLeft the
    first, ArrowLeft again stays; Tab to the third flag chooses it.

`tests/features/csp/picker-no-eval.browser.test.ts`: `languagePicker` is loaded and shown inside
`attemptsToBuildCode` (`tests/fixtures/strict-csp.ts`), and the list of attempts is empty.

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: Draw the six flags and the two icons; push; `flags.test.ts` passes**

- [ ] **Step 4: `ambient.d.ts`, `flags.ts`, `pad-menu.ts`**

`ambient.d.ts` declares `'*.svg?raw'` as a string, as `physics/ambient.d.ts` declares its own. `flags.ts` imports the
six files with `?raw`, parses one with `DOMParser` (`image/svg+xml`), imports the node into the page and sets
`aria-hidden="true"` and `focusable="false"`; nothing is put in the page as a string of HTML. `pad-menu.ts` is
`createPads` and `createMenu` stepped on `frames` (default `pageFrames`), with `pads.mask()` called once when made.

- [ ] **Step 5: `picker.ts`, the exports, the fixture page**

The screen holds no rule of its own: what is chosen, the order and what is kept are `createPicker`'s. It draws, and
turns taps, keys and pad presses into `choose`, `move` and `go`.

- [ ] **Step 6: Push; green in the three engines. Look at the pictures**

Read `pr-<n>/<engine>/picker-*.png` from the `ci-screens` branch (the `screens` job copies them) and look at each: six
flags a person can tell apart, nothing cut off, Go under them. Fix a drawing that cannot be told at phone size.

- [ ] **Step 7: Commit** `feat(web): the language picker, six flags and one press of Go`

---

### Task 7: The template's page shows the picker

**Golden impact:** none. `template/replays/level-1.json` is not touched; only the page changes.

**Files:**
- Modify: `template/src/features/page/page.ts`, `template/src/style.css`, `template/index.html`
- Test: `tests/template/page.browser.test.ts`, `tests/template/words.test.ts`, `tests/template/files.test.ts`

**Interfaces:**
- Consumes: `languagePicker`, `createLocale`, `followLanguage` (Tasks 4 and 6).
- Produces: `root.dataset.state` is `'loading'`, then `'picking'` while the picker shows, then `'playing'` or
  `'problem'`. `WORDS.loading` is gone.

- [ ] **Step 1: Write the failing tests** (`page.browser.test.ts`)

The `open` helper gains `language?: Language`: when given, it is saved in the host's store before the page starts
(`openSettings({ game: 'my-game', store: host.store })`, then the `language` section set). Every test there today
that is not about the picker passes one; those that read English pass `'en'`.

New tests:
- **French device:** state is `'picking'`; six `.automata-flag` in the fixed order, none pressed; no canvas; Go
  pressed, state still `'picking'`. Korea's flag, then Go: state `'playing'`, the keys' hint is the Korean text of
  the template's `ko.json`, `document.documentElement.lang` is `ko`. `stop()`, then a second page on the same host:
  never `'picking'`, Korean.
- **Spanish device:** Mexico's flag is first and pressed; Go; the hint is
  `Las flechas para moverte. Espacio para saltar.` (This replaces the test that read Spanish with no press.)
- **While loading** the page has no letters: `root.textContent` is `''`, and the loading mark has `role="status"`
  and `aria-busy="true"`.
- **`stop()` while picking** empties the root and the picker's `done` never starts a game.

`files.test.ts`: `template/index.html` has no `lang` attribute on `<html>`; no file under `template/src/` holds
`'en'` or `"en"`; `automata.toml` has exactly one line that matches `/^source = "en"$/m`.

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: Implement**

After `createLocale`: when `!locale.asked()`, set the state to `'picking'` and
`await languagePicker({ mount: root, locale, frames }).done`. Then `followLanguage`, then `startGame`, as today.
`page.stop()` destroys a picker that is showing. The loading mark is an element with no text and a CSS spinner (it
honors `prefers-reduced-motion`: no spin, a still ring). `style.css` dresses the picker with the page's own colors
through `--automata-picker-background: var(--paper)` and `--automata-picker-color: var(--ink)`. `index.html`'s
`<html>` has no `lang`; the comment on `createLocale` in the page no longer says "else English".

- [ ] **Step 4: Push; green in the three engines. Commit** `feat(template): a new game asks the player's language`

---

### Task 8: `automata words`, the MCP `words` tool and the check's note

**Golden impact:** none.

**Files:**
- Create: `src/features/cli/unread.ts`, `tests/features/cli/unread.test.ts`
- Modify: `src/features/cli/args.ts`, `cli.ts`, `help.ts`, `mcp-tools.ts`, `game-folder.ts`, `check-files.ts`,
  `words.ts`
- Modify: `README.md` (the commands table and a new "automata words" part: a test holds the help and the README
  together), `template/AGENTS.md`
- Test: `tests/features/cli/args.test.ts`, `cli.test.ts`, `mcp-tools.test.ts`, `check-files.test.ts`,
  `words.test.ts`, `tests/docs/readme.test.ts`

**Interfaces:**
- Consumes: `ReadMarks`, `markRead`, `unreadWords`, `writeReadMarks`, `emptyReadMarks` (Task 3).
- Produces:

```ts
// args.ts
export type CommandName = 'create' | 'check' | 'play' | 'replay' | 'art' | 'words' | 'mcp' // COMMAND_NAMES in this order
export interface CommandInput {
  // …as today, and:
  /** Flags that take a value and then any more words, like `--read es keeper.hello`: every word, the value first. */
  readonly lists: Readonly<Record<string, readonly string[]>>
}

// unread.ts
export interface UnreadWord {
  readonly language: Language
  readonly key: string
  /** The game's own text, in its source language. */
  readonly source: string
  readonly text: string
}
export interface WordsReport {
  readonly source: Language
  /** What still waits, after any marking: `LANGUAGES` order, then key order. */
  readonly unread: readonly UnreadWord[]
  /** Only with `read`: what was marked. */
  readonly marked?: { readonly language: Language; readonly keys: readonly string[] }
}
export function runWords(options: {
  readonly folder: string
  readonly read?: { readonly language: string; readonly keys: readonly string[] }
}): Effect.Effect<WordsReport, CliError, Ports>
export function describeWords(report: WordsReport): readonly string[]
```

`ContentApi` in `game-folder.ts` also picks `markRead`, `writeReadMarks` and `emptyReadMarks`.

**The words a person reads** (`describeWords`), for a Korean-source game:

```
Checked against Korean (ko).

Spanish (es): 2 words wait for a native speaker.
  keeper.hello
    Korean:  안녕하세요!
    Spanish: ¡Hola!
  keeper.bye
    …

Once a native speaker has read a language, mark it: automata words --read es
```

One block for each language that has unread words, in `LANGUAGES` order; "1 word waits". With nothing unread the
whole answer is the heading, a blank line, and `A native speaker has read every translated word.` After `--read`, the
first line is `Marked 2 words in Spanish as read.`, then a blank line, then the answer above.

**What stops it** (each a `CliError`, exit 2, nothing written):

| When | Sentence |
|---|---|
| the game does not load | `The game does not load, so its words cannot be listed:` then the diagnostics |
| the game has no words | `This game has no words yet. Add a messages file like content/messages/es.json, list it in automata.toml, and write source = "es".` |
| the marks file does not read | its diagnostics, one a line |
| `--read` names the source | `This game is written in Korean, so Korean is not read against anything. Mark one of: zh, es, en, pt, ja.` |
| `--read` names anything else the game lacks | `This game has no words in "fr". Mark one of: zh, es, en, pt, ja.` |
| a key the language does not have | `Spanish has no word called "keeper.helo". Check the key in content/messages/es.json.` |
| `--read` with no language | `--read needs a language after it, like --read es.` (from `parseArgs`) |

The exit code is 0 whenever the command ran: unread words are not a fault.

- [ ] **Step 1: Write the failing tests**

`args.test.ts`:

```ts
expect(parseArgs(['words', '--read', 'es', 'keeper.hello', 'keeper.bye', '--json'])).toEqual({
  command: 'words', flags: { json: true }, lists: { read: ['es', 'keeper.hello', 'keeper.bye'] }, rest: [],
})
expect(parseArgs(['words', 'my-game', '--read', 'es'])).toMatchObject({ folder: 'my-game', lists: { read: ['es'] } })
expect(parseArgs(['words', '--read'])).toEqual({ problem: '--read needs a language after it, like --read es.' })
expect(parseArgs(['check'])).toMatchObject({ lists: {} })
```

`unread.test.ts` (the memory layer, a Korean-source game with Spanish and Portuguese):
- the list: `source` is `'ko'`, every entry's `source` is the Korean text and `text` the translation, Spanish before
  Portuguese, keys sorted;
- `read: { language: 'pt', keys: [] }` marks every Portuguese word: no `pt` entry is left, `marked.keys` has them
  all, and **the only file written is `game/automata.translations.toml`**, which starts
  `format = 2\nsource = "ko"\n\n[read.pt]\n`;
- `read: { language: 'es', keys: ['keeper.hello'] }` marks one, and the other Spanish word still waits;
- a format 1 marks file in an English-source game keeps its reads and is written back as format 2;
- a marks file made against English in a Korean-source game: every word is listed, and marking writes
  `source = "ko"` with only the new marks;
- each row of the "what stops it" table, with nothing written.

`cli.test.ts` (the end-to-end test of this task: `main([...], memory.layer)`): `main(['words', 'game'])` prints the
block above and exits 0; `main(['words', 'game', '--json'])` prints one JSON value equal to the `WordsReport`;
`main(['words', 'game', '--read', 'pt'])` prints `Marked … words in Portuguese as read.` and exits 0;
`main(['words', 'game', '--read', 'ko'])` exits 2 with the sentence; `main(['words', '--help'])` prints the help.

`mcp-tools.test.ts`: the `words` tool with `{ folder }` runs `['words', folder]`; with `{ folder, read: 'pt' }`
runs `['words', folder, '--read', 'pt']`; with `keys` they follow the language; `keys` without `read` fails with
`keys needs read: name the language whose words these are.`; over a real child (`mcp-client.test.ts`'s way) its
text is the same JSON `automata words --json` prints.

`check-files.test.ts`: the note is one line for each language, in order:
`12 words in Spanish wait for a native speaker. See them with automata words.` (`1 word in Spanish waits …`); with
marks made against another language the first note is
`The read marks were made against English, and this game is now written in Korean, so every word waits again. See them with automata words.`

`words.test.ts` (`compileWords`): for a Korean-source game the generated `runtime.js` has `baseLocale = "ko"`; a game
with no words fails with
`This game has no words to compile. Add a messages file, list it in automata.toml, and write source.`

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: `args.ts`**

`Flags` gets `lists: readonly string[]`; `words` is `{ switches: ['json'], values: [], lists: ['read'] }`, every
other command `lists: []`. A list flag takes the next word (or its `=value`) and every word after it up to the next
word that starts with `--`. Those words are not the folder and not `rest`.

- [ ] **Step 4: `unread.ts`, `cli.ts`, `help.ts`**

`runWords` reads the game with `readGame`, reads and parses the marks file with the game's own copy of the
framework (`game.content`), marks when asked, and writes only when it marked. Help:

```
automata words [folder]

Lists the translated words no native speaker has read yet, each beside the game's own text. A translation made by
a machine is a first draft; this is the list of what still needs a person.

  --read <language>            Mark every listed word of that language as read.
  --read <language> <key> …    Mark only those words.
  --json                       Print the answer as JSON, for an agent or another tool.
```

and the root help's line: `automata words           List the translated words nobody has read, and mark them read.`

- [ ] **Step 5: `mcp-tools.ts`, `check-files.ts`, `words.ts`**

The tool, after `art`:
`"List a game's translated words that no native speaker has read, beside the game's own text, or mark them read: use it after you add or change a word."`
with `folder`, `read` (`'A language to mark as read: zh, es, en, pt, ja or ko.'`) and `keys`
(`'Only these words; leave it out for every listed word of that language.'`). `compileWords`: the base language is
`content.project.source`, written first in `languages`; the name clashes are looked for in the source's keys; the
file's top comment no longer says "English first". `compileWords` is still wired to no command: where it goes on the
command line is plan K's call (the spec).

- [ ] **Step 6: The README's commands table and "automata words" part, and `template/AGENTS.md`'s commands list**

- [ ] **Step 7: Push; green. Commit** `feat(cli): automata words lists and marks the words nobody has read`

---

### Task 9: `automata create --source`, and the new game end to end

**Golden impact:** none. `create` changes `automata.toml`'s `source` line and the marks file; the template's replay
is copied as it is, and Task 2's test proves its hash holds for every source.

**Files:**
- Modify: `src/features/cli/ports.ts`, `live.ts`, `create.ts`, `args.ts`, `cli.ts`, `help.ts`, `mcp-tools.ts`
- Modify: `tests/fixtures/cli/memory.ts`, `tests/install/create-commands.ts`, `tests/install/create-smoke.mjs`,
  `tests/create/create.journey.test.ts`, `README.md` ("Start here" and "automata create")
- Test: `tests/features/cli/create.test.ts`, `live.test.ts`, `cli.test.ts`, `tests/docs/readme.test.ts`

**Interfaces:**
- Consumes: `matchLanguage`, `LANGUAGES`, `languageName`, `parseReadMarks`, `writeReadMarks`, `emptyReadMarks`.
- Produces:

```ts
// ports.ts
export interface DeviceService {
  /** The languages this machine says its person uses, best first. May be empty. */
  readonly languages: () => Effect.Effect<readonly string[]>
}
export const Device: Context.Tag<DeviceService, DeviceService> // 'automata/Device'
export type Ports = FilesService | ToolsService | CodeService | OutService | RunnerService | DeviceService

// create.ts
export function createGame(options: {
  readonly folder: string
  readonly framework?: string
  readonly source?: string
}): Effect.Effect<{ readonly folder: string; readonly source: Language; readonly files: readonly string[] }, CliError, Ports>

// tests/fixtures/cli/memory.ts
MemoryOptions.deviceLanguages?: readonly string[] // default: none

// tests/install/create-commands.ts
START_HERE[0] === 'npx @automataframework/framework create my-game --source en'
```

- [ ] **Step 1: Write the failing tests**

`create.test.ts`:
- `source: 'ko'`: `automata.toml` has the line `source = "ko"` and no other `source` line; the marks file is
  `format = 2\nsource = "ko"\n`; the answer's `source` is `'ko'`; the new game loads, and `translationProblems` is `[]`.
- `source: 'en'`: the marks file is the template's own bytes.
- no `source`, `deviceLanguages: ['ja_JP.UTF-8']`: `source = "ja"`.
- no `source`, no device language (and again with `['C.UTF-8']` and `['fr_FR.UTF-8']`): fails, **nothing written**,
  with `Say which language you write the game's words in: add --source with one of zh, es, en, pt, ja, ko, like automata create my-game --source es.`
- `source: 'fr'`: fails, nothing written, with
  `"fr" is not a language a game can be written in. Use one of zh, es, en, pt, ja, ko, like --source es.`

`live.test.ts`: the live `Device` answers `['ko_KR.UTF-8']` with `LC_ALL` set to it; `LC_ALL` wins over `LANG`; with
none of the three set on a system that is not Windows it answers `[]`.

`cli.test.ts`: `main(['create', 'my-game', '--source', 'es'])` prints, after `Made my-game.`, the line
`Its words are written in Spanish. To change that, change source in automata.toml.`

`readme.test.ts`: "Start here" holds `START_HERE` (it already compares them), and the section says `--source` and
names the six codes.

- [ ] **Step 2: Push; they fail**

- [ ] **Step 3: `ports.ts`, `live.ts`, `memory.ts`**

Live: the non-empty values of `LC_ALL`, `LC_MESSAGES` and `LANG`, in that order; on Windows, when none is set,
`[Intl.DateTimeFormat().resolvedOptions().locale]`. The comment says why `Intl` is not asked elsewhere (call 7).

- [ ] **Step 4: `create.ts`, `args.ts`, `cli.ts`, `help.ts`, `mcp-tools.ts`**

The source is settled before anything is written: `--source`, else the first device tag `matchLanguage` finds among
`LANGUAGES`, else the sentence. `automata.toml`'s one `source` line is replaced, found by
`/^source = "[a-z]+"$/m` and not by naming English, which Task 10's rule would fail (plan audit M1); a template
without exactly one such line is a `CliError` that names the template. The marks file is kept when the template's marks were made
against the new source, else it is `writeReadMarks(emptyReadMarks(source))`. `create`'s flags gain the value
`source`; help gains
`  --source <language>  The language you write the game's words in: zh, es, en, pt, ja or ko. Left out, your computer's own language is used when it is one of them.`
The MCP `create` tool gains an optional `source` with the same words.

- [ ] **Step 5: `create-commands.ts`, the README, `create-smoke.mjs`**

README, right under the "Start here" block: ``--source` is the language you write the game's words in: `zh`
(Chinese), `es` (Spanish), `en` (English), `pt` (Portuguese), `ja` (Japanese) or `ko` (Korean). The game ships in
all six, and each player picks their own.`` The smoke, on all three systems, after `npm run check`:

- `npx --no automata words --json`: `source` is `'en'`, and `unread` has five languages' worth of the template's keys;
- `npx --no automata words --read pt`, exit 0; `words --json` again has no `pt` entry; `automata.translations.toml`
  starts `format = 2\nsource = "en"\n\n[read.pt]\n`; `npm run check` still passes;
- in the work folder: `create ko-game --source ko` (with the same `--framework`): its `automata.toml` has
  `source = "ko"`, its marks file is `format = 2\nsource = "ko"\n`, and `automata check ko-game --only files --json`
  is `ok`;
- where the system is not Windows: `create ja-game` with `LC_ALL=ja_JP.UTF-8` and no `--source` gives `source = "ja"`.

The smoke's second `create` call (near its end) passes `--source en` too.

- [ ] **Step 6: The create journey** (`tests/create/create.journey.test.ts`; the packed package, real browsers)

The game is made with `--source es`. Before the browsers, in `beforeAll` after `npm install`:
`npx --no automata check --json` is `ok`; `npx --no automata words --json` has `source: 'es'` and each entry's
`source` is the text of that key in the game's `content/messages/es.json`; `words --read pt` exits 0 and a second
`words --json` has no Portuguese.

In each engine:

- **Every size** (the loop there today; a new context each time, whose browser says `en-US`): the page shows
  `.automata-picker` and no canvas; the first flag is `[data-language="en"]` and is pressed; a picture is saved as
  `<engine>-picker-<width>x<height>.png`; Go is pressed (a tap on a touch size, a click on the desktop size); then
  everything the loop checks today.
- **A French browser** (`locale: 'fr-FR'`, 1280 by 720): six flags in the order `zh es en pt ja ko`, none pressed;
  the picker has no letters; a click on Go leaves the picker up and `automataGame` undefined; a click on Korea's flag
  shows `한국어로 플레이`; Go; the hint is Korean and `<html lang>` is `ko`. After `page.reload()` there is no picker
  and the hint is Korean.
- **A Japanese browser** (`locale: 'ja-JP'`), three fresh contexts: Japan's flag is first and pressed. Go by touch
  (`hasTouch: true`, `page.tap`), by `page.keyboard.press('Enter')`, and by a gamepad (an init script gives
  `navigator.getGamepads` one connected pad with `mapping: 'standard'`, 17 buttons and 4 axes, whose button 0 the
  test presses by setting a flag on `window`). Each ends with the hint in Japanese (`矢印キー`). This replaces the
  Japanese block there today.

The broken-level check stays as it is, after the picker.

- [ ] **Step 7: Push; green on `create` (Linux, Windows, macOS) and `create-play`. Look at the picker's pictures on
  `ci-screens` at the five sizes in the three engines**

- [ ] **Step 8: Commit** `feat(cli): automata create asks which language the game is written in`

---

### Task 10: The rule that holds it, the docs, and the handoffs

**Golden impact:** none.

**Files:**
- Modify: `tests/architecture/rules.ts`, `tests/architecture/rules.test.ts`
- Modify: `README.md`, `template/README.md`, `template/AGENTS.md`, `skills/automata/SKILL.md`,
  `skills/automata-content/SKILL.md`, `skills/automata-api/SKILL.md` (if it names a changed export), `CLAUDE.md`,
  `docs/superpowers/specs/2026-11-14-m2-design.md`, `docs/superpowers/specs/2026-11-13-2d-first-layer-design.md`,
  `docs/superpowers/progress.md`
- Test: `tests/docs/readme.test.ts`, `tests/skills/skills.test.ts`, `tests/template/messages.test.ts` (as CI names)

- [ ] **Step 1: Write the failing test** (`rules.test.ts`)

```ts
test.each([
  ["const words = options.words ?? frameworkWords('en')", 'src/features/game/players.ts'],
  ['type Translated = Exclude<Language, "en">', 'src/features/content/other.ts'],
  ['const english = files.en', 'src/features/content/translations.ts'],
  ["const tag = language === 'x' ? 'en-GB' : tag", 'src/features/locale/fill.ts'],
])('a file that names English as a fallback breaks no-default-language: %s', (text, file) => {
  expect(checkArchitecture({ [file]: text }).map((v) => v.rule)).toContain('no-default-language')
})
test('the list of languages, the format 1 marks and a comment may name English', () => {
  const rules = (file: string, text: string) => checkArchitecture({ [file]: text }).map((v) => v.rule)
  expect(rules('src/features/content/messages.ts', "export const LANGUAGES = ['zh', 'en'] as const")).not.toContain('no-default-language')
  expect(rules('src/features/content/read-marks.ts', "const FORMAT_1_SOURCE: Language = 'en'")).not.toContain('no-default-language')
  expect(rules('src/features/locale/words.ts', "// never 'en'\nimport en from './library/en.json'\nconst L = { en: held(en) }")).not.toContain('no-default-language')
})
```

- [ ] **Step 2: Push; it fails. Step 3: add the rule**

In `checkArchitecture`, for every file in `src/`, on the text with comments taken out and with two declarations
taken out too (the `LANGUAGES` line in `src/features/content/messages.ts`, `export const LANGUAGES = [ … ] as const`,
and the `FORMAT_1_SOURCE` line in `src/features/content/read-marks.ts`), a match of

```ts
const ENGLISH_BY_NAME = /(['"`])en\1|\.en\b(?!\.json)|\ben-GB\b/
```

adds the violation `no-default-language` with the detail
`English is named here as a language of its own. Use the game's source or the player's language.`
`tests/architecture.test.ts` then holds all of `src/`. If it names a line this plan missed, fix that line; do not
widen the two exceptions. They are lines, not files: `messages.ts` held three English fallbacks before this plan
(`englishLacks` and its neighbours), and a whole-file exception would let the next one back in unseen (plan audit I3).
`rules.test.ts` also expects `if (file.id === 'en') return` in `src/features/content/messages.ts` and
`const english = files.en` in `src/features/content/read-marks.ts` to break the rule.

- [ ] **Step 4: The docs** (developer text, in English; the six are listed `zh, es, en, pt, ja, ko` everywhere)

- `README.md`, "Languages": the files are listed in the fixed order; "The file of the game's own language (`source`
  in `automata.toml`) says what a word is for"; the example file is `"id": "es"`; the player's language is "the one
  they picked on the first visit: a new player is shown six flags, with their device's language already chosen when
  the game has it"; the `createLocale` example shows `locale.language()` being `undefined`, `languagePicker`, and
  `set`; "A word a language lacks is said in the game's own language, and one that lacks too is shown as its key";
  the `translationProblems` sentence is the new one; the marks are format 2 with `source`; `automata words`;
  `onlineWords(status, locale.words)`; `startGame` needs `locale`. The `files` row of the check table says "every
  language has every word the game's own language has". The content rule says "a game's words live in `messages`
  files, one per language, and `source` in `automata.toml` names the one the team writes in".
- `template/README.md` step 4: "Open the file of your game's language in `content/messages/` (`source` in
  `automata.toml` names it) and change a word…". It stays under 60 lines.
- `template/AGENTS.md`: the words row reads "(the `source` language in `automata.toml` says what a word is for)";
  the commands list has `npx --no automata words`. It stays under 80 lines.
- `skills/automata/SKILL.md` and `skills/automata-content/SKILL.md`: `source`, the fixed order, an example file that
  is not English, `automata words` after a word is added or changed.
- `docs/superpowers/specs/2026-11-14-m2-design.md`, "Languages (plan L)": "…the language is the player's saved choice,
  then the host's; a player with neither picks from flags, and nobody is given English (see
  [`2026-11-14-no-default-language-design.md`](2026-11-14-no-default-language-design.md))". Its table rows and the
  first-layer spec's, and `CLAUDE.md`'s "Languages" line, list the languages in the fixed order: "Chinese, Spanish,
  English, Portuguese, Japanese and Korean. Editors add Russian, German and French."

- [ ] **Step 5: `progress.md`, Cycle 5**

Stage 4 at 100% for plan W, the commit and test counts, and under "Before Release 1": the framework's library now has
29 words in each language, so 145 wait for a native speaker's read (the log's "135" line is history; the line under
"Before Release 1" is what changes). Correct the plan L log line that says `automata words` moves the inlang packages
back to `dependencies`: plan W's `automata words` does not compile, so they stay development dependencies until the
step named under "Plan K" below (plan audit I5). Add the handoffs below as the tracker's notes.

- [ ] **Step 6: Push; every job green, on the last commit. Commit** `docs: no default language, and the rule that holds it`

---

## Handoffs

- **Plan U (screens).** The default flow is Warnings (if needed), Language picker, Splash, Main menu, Gameplay (with
  pause), Main menu. The picker is `languagePicker` and is already the template page's first step; plan U moves it
  into the flow between the warnings and the splash. Settings' language part is `languageRow` over `locale.listed()`
  with `locale.set`. `padMenu` gives a screen gamepad presses while no game runs. `automata.saves.refused.*` (plan L's audit, M3) joins the
  library in all six.
- **Plan D (Examples).** `source = "en"` in the demo's `automata.toml`, written in the same change as its first
  messages file (a `source` with no words file is a load problem, and the demo has none today); marks to format 2;
  the page shows the picker on a first visit, and in watch mode makes its locale with `watching: true` and, when a
  player takes over, shows the picker whenever `!locale.asked()` (never by testing `language()`, which a watching
  locale has); `--automata-picker-chosen` is Peach Red; the picker's title needs the demo's Korean, Japanese and Chinese
  fonts; the `ci-screens` pictures add the picker at the five sizes; `startGame` now needs `locale`; the pin moves to
  the commit that lands this plan. Neither golden moves.
- **Editors.** No call the Editors make changes shape: they use `loadGame`, `parseProject`, `parseContent`,
  `writeContent` and the level helpers, none of which this plan breaks. When their pin moves, a game with words and no
  `source` shows the load sentence; their fixture game lists no words, so no test there moves. The nine flags and the
  editors' own picker are M3.
- **Plan K.** `compileWords` takes the `source` as its base language. This plan does not put it on the command
  line (the spec leaves that to plan K), so the two inlang packages stay development dependencies and
  `bindParaglide` still has no command that makes its `runtime.js`. When plan K wires it, it is
  `automata words --compile <outdir>`, and that pull request moves the two packages to `dependencies`
  (`tests/package.test.ts` says so). No plan K step names this today (Part 2's left steps are S, T and U), so the
  tracker's Cycle 4 notes gain one line giving it a home: plan K Step U wires `automata words --compile`, since plan U
  is the first to show a game's words through Paraglide on a page. The coordinator may move it; it is not left
  unowned (plan audit I5).
- **The other repos' `CLAUDE.md` pages** list the languages in the old order; each is corrected with that repo's next
  pull request.
