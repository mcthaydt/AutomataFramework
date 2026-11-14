# M2 Plan L: Languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game shows its words in the player's language (English, Spanish, Korean, Japanese, Chinese or
Portuguese), picked as the player's saved choice, then the host's, then the device's, then English; a check says
which words are missing in which language; and changing a word never moves a hash.

**Architecture:** A new headless feature, `locale`, right above `host`: it picks the language, reads the words from
the game's `messages` files (and the framework's own six small files for its own sentences), fills in values, and
keeps the player's choice in the `language` settings section. Features below it never hold a sentence: they answer
with a key and its values, and `locale` turns that into words. The words leave what the sim is given, so a
translation is content a replay never notices. Two pure checks in `content` say what is not translated and what no
native speaker has read yet.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, smol-toml 1.9.0, Vitest 5.0.3 (browser mode on Playwright
1.63.0), Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0. No new dependency in Tasks 1 to 11. Task 12
(Paraglide) is held for the Owner's answer and is the only place a package could join.

**Spec:** [`docs/superpowers/specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md), the section
"Languages (plan L)", the `messages` row of "Content: the new files", and the showcase's "Languages" row and
journey ("the language is changed and every screen shows it"); on top of
[`2026-11-13-2d-first-layer-design.md`](../specs/2026-11-13-2d-first-layer-design.md), layer 10 and "Type" in the
Visual direction. Principles served: 1 (every word a player reads is a line in a JSON file an agent can write, and
the two checks answer in plain sentences that name the file and the key), 2 (one file per language, one key per
line, so the M3 Story editor changes one thing at a time), 3 (2D only), 4 (one package), 6 (the stack; see the open
question on Paraglide), 7 (the old repo's language picking is ported for this layer only).

## Open question for the Owner (holds Task 12 only)

Sent to the coordinator on 2026-11-14. **Do not default it.** Tasks 1 to 11 are the same under either answer.

The spec says "Paraglide messages from the `messages` files". A game's words are content: they are read at run time
by `loadGame`, and a conversation names its lines by key, as data, so a run-time lookup by key is needed whatever is
chosen. Paraglide is a build step that turns the same files into generated code for a game's own code to call.

1. **Use Paraglide.** Task 12 is built. It needs the Owner's yes for `@inlang/plugin-message-format` 4.4.4 (the old
   repo's pin; Paraglide cannot read a messages file without it), beside `@inlang/paraglide-js` 2.25.4, which the
   stack table already names. Both become dependencies of the framework. Task 12 waits for plan K's Part 1.
2. **Leave Paraglide out of M2.** Task 12 is struck, and the first spec's stack table gains the written reason:
   words are content read at run time, and typed keys come from TypeScript reading the game's `en.json` (Task 6's
   `typed`). No new package.

The plan's author recommends 2. Until the Owner answers, Task 12 is not started and nothing is installed.

## What this plan covers, and what it does not

Covered: words out of the sim's hash; values in a text (`{name}`); the check for a missing translation; the marks
for a native speaker's read; the `locale` feature (picking, words, the settings section, level names and save
labels); the framework's own sentences in six languages; `startGame` taking a `Locale`; the page's `lang`; journeys
in three real browsers; an agent's journey; the packed package; the README.

Not in this plan, each with whose it is:

| Not here | Whose |
|---|---|
| The settings screen's language list, and every other screen's words | Plan U. It calls `locale.languages`, `LANGUAGE_NAMES`, `locale.set` and `locale.words`, and adds its own keys to `src/features/locale/library/` |
| The demo's words in six languages, its fonts (Fredoka's Japanese, Korean and Chinese partners) and its licence notices | Plan D's step for L, in Examples (below). The framework imposes no font |
| `automata check` saying these sentences, and a command that marks words as read | Plan K's Step L: its `files` step adds `translationProblems`, and it prints `unreadWords` as a note |
| The speech box's "Next" and "Skip", and "Tap to start the sound" | The keys are added by whichever of plans T, S and L is built second (see "What the other plans rely on") |
| French, Russian and German | The editors, M3 |
| Right-to-left text, plural rules beyond one and many, number and date formats | No M2 language needs them: all six read left to right, and one and many is enough for each. A later language adds them with its own plan |
| A paid service or a model call that translates | Ruled out, as for art. The translations in this plan were written by its author and wait for a native speaker's read |
| A changeset | Nothing is published per plan |

## Before starting

Stop and report to the coordinator if one is not true. Do not work around it.

1. This plan's audit (`docs/superpowers/audits/2026-11-14-m2-languages-plan-audit.md`) is merged, and its findings
   are applied as you go. **Task 1 alone may be built before the audit, as its own small pull request**, if the
   coordinator asks for it: it needs nothing else in this plan.
2. `main` passes CI, and plans C and V with their fixes are on it: `src/features/content/messages.ts`,
   `src/features/saves/settings.ts` and `Host.language()` exist.
3. `tests/fixtures/full-game/content/messages/` holds six files with the same five keys each.

Plans S, T, A, U and K may or may not have merged. This plan needs none of them, and says below what to do for
each when it has. Shared files will collide: `tests/architecture/rules.ts`, `src/headless.ts`, `src/index.ts`,
`src/features/game/game.ts`, `src/features/level/game-sim.ts` and the full game's six messages files. Merge `main`
before each task and before each push; keep both sides, with the features in this order:

```
sim, physics, commands, net, content, level, server, render, input, audio, saves, host, locale, story, ui, screens, web, game
```

## Global Constraints

- **The sim never reads a word.** Nothing in `sim`, `physics`, `commands`, `net` or `level` imports `locale`, and no
  text of a messages file reaches `createSim`. A conversation in the sim holds keys.
- **No recorded hash moves** on `main` as it is today: no golden there is from a game that lists a messages file.
  If plan T's `tests/golden/story.json` is on `main` when Task 1 is built, it moves once (its fixture lists two
  messages files): record it again in CI, in a commit that names it and says why, and report to the coordinator at
  once, who shows the Owner before and after. Any other golden that moves is a stop.
- **A missing word is never a blank and never a crash.** The order is: the game's text in the player's language,
  the framework's text in that language, the game's English, the framework's English, then the key itself.
- **A text is shown as it was typed.** Words are another team's: nothing here builds HTML from one, and a value put
  into a text is never read again for more values.
- **Languages are the six of `LANGUAGES`** (`en`, `es`, `ko`, `ja`, `zh`, `pt`), in that order wherever a list is
  shown. *The author's calls:* `zh` is Simplified Chinese (the fonts the Owner picked for it are Simplified), `pt`
  is Brazilian Portuguese and `es` is neutral Latin American Spanish (the list follows the most used languages for
  Godot).
- The drunk-grandma test: every sentence of a check names the file, the key and what to write. No sentence a player
  reads says "locale", "key", "fallback" or "translation".
- Game words never name colours. No strategy, market, competitor or pricing words anywhere.
- Effect is never imported under `src/` outside its two places. Zod is the only schema language, through
  `src/lib/zod.ts`. TOML is read only in `content`.
- `locale` touches no page API: it runs in Node. Only `src/features/web/` writes the page's `lang`.
- A source file has at most 600 lines. Features import only features below them. Comments say why. Every exported
  name has a doc comment.
- **Nothing is run locally:** no tests, no `pnpm` command, no script. Each task's "run" step is a push and a read of
  the pull request's CI (`check`, three `engines`, `online`, `package`), with `gh run list --branch <branch>` and
  `gh run view <id> --log-failed`. `schemas/*.json` and `docs/api/framework.api.md` are generated: when their check
  fails in the `package` job, take the text from that job's log; if the log does not hold it, stop and report.
- Before any commit: `git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`,
  and a local hook that refuses any other author. No AI attribution anywhere.

## How every task is verified

Each task pushes twice. First the tests alone: the job the step names must fail for the reason it names. Then the
implementation: every job must pass. Do not write the implementation before reading the red run. After each task:
tick its boxes here, update plan L's line in `docs/superpowers/progress.md` (eleven tasks, 9% each, and 1% for the
last green run), and send the coordinator one line: commit, test count, surprises. Stop rules: a failing check you
cannot explain, a third fix for the same failure, an access refusal, a missing tool. Hand off at 90 minutes.

## Ported from the old repo

Source: AutomataFrameworkFailed at `ed8592e8`. Read, do not copy whole files.

| Old file (`packages/`) | What comes over | What does not |
|---|---|---|
| `automata/src/features/locale/negotiate-locale.ts` | Matching a tag (the same tag, then the same first part) and the order saved, host, device, default | Ruken's session locale |
| `automata/src/features/locale/locale.manager.ts` | The shape of the service: the choice kept in memory first, then stored; a refused write keeps the choice | Its own save key, the presentation bus, `<html dir>` |
| `content/src/shared/locale/messages.ts` | `Object.hasOwn` for keys; a translation is checked against the source both ways | Keys made from content paths, the inlang `$schema` line |
| `content/src/shared/locale/default-locales.ts`, `endonyms.ts` | The six languages' own names | `Intl.DisplayNames` for other languages |
| `content/src/shared/locale/compile-messages.ts`, `automata/src/features/locale/paraglide.ts` | Task 12 only, if the Owner says yes | Everything, if not |

## Review Focus

Each has its test in the task named.

1. **A device that asks for a language in a spelling of its own:** `pt-BR`, `zh-Hant-TW`, `ES-mx`, `ko_KR`,
   `ko_KR.UTF-8`, an empty string, `*`, a tag 300 characters long. Expected: the first five find `pt`, `zh`, `es`,
   `ko` and `ko` (audit M1: a desktop or store host may write `_`); the rest find nothing and the next in line is
   tried; nothing throws (Task 5).
2. **A saved choice the game no longer has** (the game dropped Korean; another build wrote `"language": "fr"`; the
   section is `null` or a number). Expected: the game picks as if nothing were saved, the stored value is left as
   it is until the player chooses, and `choice()` says `'auto'` (Task 7).
3. **A text and its values that do not match:** a `{name}` with no value given, a value nobody asked for, a value
   that itself holds `{count}`, a `{` with no end, `{}`. Expected: what cannot be filled is shown as typed, an
   extra value is ignored, a value is never filled a second time, and nothing throws (Task 6).
4. **The host refuses to keep the choice** (private browsing, storage full). Expected: the game changes language
   at once and stays changed for this visit; `set` answers with the refusal so a screen can say so; nothing is
   written anywhere else (Task 7).
5. **A long name in a save's label:** a level name of 40 Korean characters, one with an emoji made of several
   parts, a label built to 200 characters. Expected: `fitLabel` cuts between whole characters to at most 80 and
   never leaves half an emoji; `save` takes the label (Task 7).

## File structure

```
src/lib/message.ts                        Message and Values: what a feature below locale answers with      new
src/features/level/sim-content.ts         simContent: the content the sim is given                           new (or + messages)
src/features/level/game-sim.ts            gives the sim simContent(content)                                  changed
src/features/content/messages.ts          + placeholdersOf, languageName                                     changed
src/features/content/translations.ts      translationProblems                                                new
src/features/content/read-marks.ts        the marks file: parse, write, markRead, unreadWords                new
src/features/locale/locale.ts             the entry                                                          new
src/features/locale/pick.ts               matchLanguage, pickLanguage                                        new
src/features/locale/names.ts              LANGUAGE_NAMES, LANGUAGE_TAGS                                      new
src/features/locale/fill.ts               fill: values into a text                                           new
src/features/locale/words.ts              wordsOf, frameworkWords, typed                                     new
src/features/locale/settings.ts           LanguageSettingsSchema, LANGUAGE_SETTINGS_DEFAULT                  new
src/features/locale/create.ts             createLocale                                                       new
src/features/locale/labels.ts             levelName, fitLabel                                                new
src/features/locale/online.ts             onlineWords (moved up from net)                                    new
src/features/locale/library/*.json        the framework's own sentences: en, es, ko, ja, zh, pt             new
src/features/locale/library/automata.translations.toml   their read marks (none read yet)                    new
src/features/net/words.ts                 onlineMessage replaces onlineWords                                 changed
src/features/input/touch.ts               the overlay's label is an option                                   changed
src/features/game/players.ts, game.ts     GameOptions.locale; join answers in the player's language          changed
src/features/web/lang.ts                  followLanguage: the page's lang                                    new
src/headless.ts, src/index.ts             + locale (headless), followLanguage (page)                         changed
tests/architecture/rules.ts, rules.test.ts   + locale in LAYERS                                              changed
tests/features/level/sim-content.test.ts, sim-content.parity.test.ts                                         new
tests/features/content/messages.test.ts, translations.test.ts, read-marks.test.ts                            new or added to
tests/features/locale/pick.test.ts, fill.test.ts, words.test.ts, library.test.ts, create.test.ts,
  labels.test.ts, online.test.ts                                                                             new
tests/features/net/words.test.ts          onlineMessage's keys and values                                    changed
tests/features/game/language.browser.test.ts, tests/features/web/lang.browser.test.ts,
  tests/features/web/language-kept.browser.test.ts                                                           new
tests/fixtures/locale/content.ts, page.ts                                                                    new
tests/fixtures/full-game/                 + automata.translations.toml, + level names in six files           changed
tests/features/content/agent-journey.test.ts, tests/public-surface.test.ts, tests/install/smoke.mjs,
  consumer.ts, tests/docs/readme.test.ts, README.md, docs/api/framework.api.md, tsconfig.json                changed
```

## The contract: names every task uses

```ts
// ---- src/lib/message.ts ----
/** What may be put into a text: a word, a number, or a list of them ("1, 2 and 4"). */
export type Value = string | number | readonly (string | number)[]
export type Values = Readonly<Record<string, Value>>
/** A sentence not yet in any language: its key and what goes into it. */
export interface Message { readonly key: string; readonly values?: Values }

// ---- content (headless) ----
/** The names between `{` and `}` in a text, each once, in the order they first come: `{count}` gives ['count']. */
export function placeholdersOf(text: string): readonly string[]      // a name is /[a-z][a-zA-Z0-9]{0,31}/
/** A language's name in English, for a check's sentence: 'Korean'. */
export function languageName(language: Language): string
/** What is not translated, in plain sentences; [] for a game with no words at all. Never throws. */
export function translationProblems(content: GameContent): readonly Diagnostic[]

/** The marks file's name, at the top of a game: which translated words a native speaker has read. */
export const READ_MARKS_FILE = 'automata.translations.toml'
/** For each language but English, each read key and the mark of the two texts that were read. */
export type ReadMarks = Readonly<Partial<Record<Exclude<Language, 'en'>, Readonly<Record<string, string>>>>>
export function parseReadMarks(text: string): Parsed<ReadMarks>
export function writeReadMarks(marks: ReadMarks): string
/** The mark of one word as it is now: 16 hex digits from the English text and the translated one. */
export function readMark(english: string, translated: string): string
/** `marks` with every word of `language` (or only `keys`) marked as it is now. */
export function markRead(content: GameContent, marks: ReadMarks, language: Exclude<Language, 'en'>, keys?: readonly string[]): ReadMarks
/** Every translated word with no mark, or a mark of older texts: language order, then key order. */
export function unreadWords(content: GameContent, marks: ReadMarks): readonly { readonly language: Language; readonly key: string }[]

// ---- level (headless) ----
/** The content the sim is given and hashes: everything but the words (and, with plan S, the audio kinds), both
 *  their maps and their entries in `project.content` (audit C1). The very same object when the game lists none. */
export function simContent(content: GameContent): GameContent

// ---- locale (headless): src/features/locale/locale.ts ----
/** A text by key, in one language, with its values filled in. Never throws; an unknown key gives the key.
 *  Declared in `src/lib/message.ts` (audit I3: `input`, below `locale`, takes one) and re-exported here. */
export type Words = (key: string, values?: Values) => string
export const LANGUAGE_NAMES: Readonly<Record<Language, string>>   // English, Español, 한국어, 日本語, 中文, Português
export const LANGUAGE_TAGS: Readonly<Record<Language, string>>    // en, es, ko, ja, zh-Hans, pt-BR: for a page's lang
export function matchLanguage(tag: string, shipped: readonly Language[]): Language | undefined
export function pickLanguage(options: {
  readonly saved?: string | undefined
  readonly host?: string | undefined
  readonly device: readonly string[]
  readonly shipped: readonly Language[]
}): Language
export function fill(text: string, values: Values | undefined, language: Language): string
/** The languages a game has words in, in `LANGUAGES` order; all six for a game with no messages file. */
export function languagesOf(content: GameContent): readonly Language[]
export function wordsOf(content: GameContent, language?: Language): Words        // default 'en'
/** The framework's own sentences alone, for a page with no game loaded yet. */
export function frameworkWords(language?: Language): Words
/** `words` with its keys held to those of a messages file: `typed<typeof en.messages>(locale.words)`. */
export function typed<M extends Readonly<Record<string, string>>>(words: Words): (key: keyof M & string, values?: Values) => string
export interface LanguageSettings { readonly format: 1; readonly language: Language | 'auto' }
export const LanguageSettingsSchema: z.ZodType<LanguageSettings>
export const LANGUAGE_SETTINGS_DEFAULT: LanguageSettings           // { format: 1, language: 'auto' }
export interface Locale {
  /** What the player may pick from. */
  readonly languages: readonly Language[]
  /** The language words are in now. */
  language(): Language
  /** What the player picked; 'auto' when they have not, or picked a language this game no longer has. */
  choice(): Language | 'auto'
  /** Changes it at once, then stores it. A host that will not keep it is the answer, not a rejection. Throws a
   *  `RangeError` for a language not in `languages`. */
  set(choice: Language | 'auto'): Promise<StoreResult<void>>
  /** Called when `language()` changes. Returns a function that stops listening. */
  onChange(listener: (language: Language) => void): () => void
  /** Always answers in `language()` as it is when called, so a screen that asks again shows the new language. */
  readonly words: Words
  say(message: Message): string
}
export function createLocale(options: {
  readonly content: GameContent
  readonly settings: Settings
  readonly host: Pick<Host, 'language' | 'deviceLanguages'>
}): Locale
/** A level's name for a player: the text of `level.<id>.name`, or the id when the game gives none. */
export function levelName(words: Words, level: string): string
/** `text` cut to at most `max` (default 80, a save label's limit), never through the middle of a character. */
export function fitLabel(text: string, max?: number): string
export function onlineWords(status: OnlineStatus, words?: Words): string       // default frameworkWords('en')

// ---- net (headless) ----
/** What to tell a person about the room, as a key and its values; undefined while playing with everyone here. */
export function onlineMessage(status: OnlineStatus): Message | undefined

// ---- web (page only) ----
/** Sets `lang` on `element` (default `<html>`) to the locale's language and keeps it so. Returns a stop function. */
export function followLanguage(locale: Locale, element?: HTMLElement): () => void

// ---- game (page only): GameOptions gains
/** The player's language. Left out, the game's own sentences are English. */
readonly locale?: Locale
```

**Stored form.** The settings section is `language`: `{"format":1,"language":"ko"}`, or `"auto"`.

**The marks file**, `automata.translations.toml` at the top of a game, written only by `writeReadMarks` (languages
in `LANGUAGES` order, keys sorted, a newline at the end, a first line `format = 1`):

```toml
format = 1

[read.es]
"keeper.hello" = "5d3f9a1c2b4e6f70"
```

A word is read when its mark equals `readMark` of the English text and the translated text as they are now, so
changing either makes it unread again with nobody remembering to say so. `readMark` is `xxhash64` of the UTF-8 of
`canonical([english, translated])`, as 16 hex digits.

**A level's name** is the message `level.<id>.name` (for `level-1`, `level.level-1.name`). It is a word, so it is
in no level file and moves no hash.

**The framework's own keys** all start `automata.`. A game may give the same key in its own messages files to say
it its own way.

## What the other plans rely on (change only with a note to the coordinator)

- **Plan S** (audio). `simContent` is the one in its Task 1. Whichever plan is built second adds its kinds to the
  list in `src/features/level/sim-content.ts` and keeps the other's tests, and both kinds' `project.content` entries
  leave the hash too (audit C1; plan S's branch keeps the list as it stands). Its "Tap to start the sound" becomes the
  key `automata.sound.start` in the six library files, added by whichever is second; `startGame` then passes
  `soundNotice: locale.words('automata.sound.start')`.
- **Plan T** (story). `wordsOf` and `Words` live in `locale` (its audit's M7). If plan T is on `main` when Task 6 is
  built, `src/features/story/words.ts` keeps `BoxWords` and re-exports `wordsOf` and `Words` from `locale`, and its
  tests stay as they are (a `Words` here takes an optional second argument, so every call of theirs still fits).
  If plan T is built second, it imports them from `locale` and writes no `wordsOf` of its own. "Next" and "Skip"
  become `automata.story.next` and `automata.story.skip`, added by whichever is second; `startGame` with a `locale`
  passes `words: locale.words` and builds `boxWords` from those two keys, again on every `locale.onChange`, and
  calls the story view's `update()`. Its fixture's two messages files are enough: `translationProblems` is not part
  of `loadGame`.
- **Plan U** (screens). The language list is `locale.languages` shown with `LANGUAGE_NAMES`, each name in its own
  language whatever the game is showing, plus one more choice for `'auto'`; a pick calls `locale.set`, and an answer
  that is not `ok` is shown in words plan U adds to the library as `automata.saves.refused.<refusal>` (audit M3:
  `StoreResult.detail` is for a developer, and no player words for a refusal exist on `main`). Every screen draws its words again on `locale.onChange`.
  Its own words go in `src/features/locale/library/` as `automata.<screen>.<word>`, in all six files, and
  `tests/features/locale/library.test.ts` holds them to that. A save's label is
  `fitLabel(levelName(locale.words, level))`. It calls `followLanguage(locale)` once.
- **Plan K** (the command). Step L: the `files` step of `automata check` adds `translationProblems(content)` to
  what `loadGame` said; it prints `unreadWords` as a note that never fails the check, with the count per language;
  the template has six messages files and an `automata.translations.toml`. A command that marks a language as
  read (`markRead`, `writeReadMarks`) is its to name.
- **Plan N** (networking). `contentHash` no longer holds the words, so two players with different translations of
  the same game can share a room. `onlineWords` is exported from the same package entry as before, with the same
  first argument.
- **Editors** (M3). Story's Writer opens the `messages` files. A word changed there changes no replay. The marks
  file is plain TOML an editor may show ("12 words wait for a read") and never needs to write.

## Plan D's step for languages (in Examples, after this merges and the pin moves)

Not tasks of this plan. The demo's every word goes into `content/messages/` in six languages, and its code asks
`locale.words` for them. `tests/game/` gains a test that `translationProblems` of the real game is empty, so CI
fails on a missing word. `automata.translations.toml` is committed, empty of marks. The fonts the first spec names
join as development-only packages at exact versions named in that pull request, in `src/features/play/*.css` only:
`@fontsource/m-plus-rounded-1c`, `@fontsource/jua` and `@fontsource/zcool-kuaile`, after Fredoka in the font list,
with `font-synthesis: none`; `knip.json` and `public/licences.txt` (and its test) take all three. The page calls
`followLanguage`. Its journey: the device says Korean and the game opens in Korean; the language is changed in the
game's own way and kept across a real reload, at phone, tablet and desktop sizes in three browsers. No golden
moves: the words are not in the hash. The build's size before and after is measured and reported, because Chinese
and Japanese fonts are large: both what a Korean page downloads (Fontsource splits each font by `unicode-range`) and
`dist/`'s size, with one weight of each font imported, and the Site's "about 1.2 MB" sentence checked against it
(audit M9). Examples' own controls gain `controls.<action>` words in six languages (audit I1).

---

### Task 1: Words stay out of what the sim hashes

**Files:**
- Create: `src/features/level/sim-content.ts` (if plan S has made it, modify it), `tests/features/level/sim-content.test.ts`,
  `tests/features/level/sim-content.parity.test.ts`
- Modify: `src/features/level/game-sim.ts`, `src/features/level/level.ts` (the export)

**Interfaces:**
- Consumes: `GameContent`, `createGameSim`.
- Produces: `simContent(content: GameContent): GameContent` (the contract).

Today the whole content is hashed into every snapshot, so a comma changed in `ko.json` moves every hash of that
game, says "content changed" to every replay, and stops two players sharing a room. `GameContent.messages` is
there only when a game lists a messages file, so a game with none hashes as it does today.

- [x] **Step 1: Write the failing tests.**

```ts
// tests/features/level/sim-content.test.ts (the full game: tests/fixtures/full-game/read.ts)
test('changing a word moves no hash', ...)
  // ko.json's keeper.hello changed; two createGameSim: contentHash equal, hash() equal at tick 0 and after 60 idle ticks
test('taking a language away, or every language, moves no hash', ...)
  // audit C1: automata.toml without ko.json's [[content]] block gives the same contentHash; "every language" on the
  // M1 fixture with six messages files added (the full game's keeper conversation needs English, so loadGame refuses it)
test('the list of words files is not hashed either', ...)
  // simContent(full).project.content has no 'messages' entry and keeps every other entry in its order
test('changing a level still moves the content hash', ...)          // the crate's x changed: contentHash differs
test('the sim is given no words, and the game keeps them', ...)
  // simContent(content).messages is undefined; content.messages is untouched and still frozen
test('a game with no words is given the very same content', ...)    // the M1 fixture: simContent(content) === content
test('adding six words files to a game that had none moves no hash', ...)
  // audit C1, plan D's change to Examples: the M1 fixture with six messages files listed ends sixty idle ticks on
  // push-crate.json's idleHash60
test('a replay recorded before a word changed still plays', ...)
  // record 60 ticks on the full game, change es.json, verifyReplay on a new sim: ok, not 'content-changed'
// tests/features/level/sim-content.parity.test.ts
test('the M1 fixture still ends sixty idle ticks on the recorded hash', ...)   // push-crate.json's idleHash60
```

- [x] **Step 2: Push; `check` fails** with "simContent is not exported" (or, with plan S merged, the first test
  fails on unequal hashes).
- [x] **Step 3: Implement.** `simContent` returns `content` itself when it has none of the left-out maps, else a
  frozen copy without them and with `project` copied without the `project.content` entries of those kinds (audit C1:
  the list names every file by path, so keeping it would move every hash when a language is added or dropped). If
  plan S's `simContent` is on `main`, widen it so the list entries of its kinds go too, keep its tests, and say so. In `createGameSim`, only `createSim` is given `simContent(content)`; `spawnLevel`,
  `joinPlugin` and `touchKinds` keep the content they have today. Correct `createGameSim`'s doc comment, which says
  all the content goes into the sim. Search `src/` for every other `createSim(` and `content:` handed to a sim and
  report any that does not go through `createGameSim`.
- [x] **Step 4: Push; every job passes;** `git diff main -- tests/golden` is empty (or shows only `story.json`,
  handled as the Global Constraints say).
- [x] **Step 5: Commit** (`feat(level): a game's words are not in what the sim hashes`).

### Task 2: Values in a text, and a message with no language yet

**Files:**
- Create: `src/lib/message.ts`, `tests/lib/message.test.ts` (types only: one `expectTypeOf` test)
- Modify: `src/features/content/messages.ts`, `src/features/content/content.ts`, `tests/features/content/messages.test.ts`

**Interfaces:**
- Produces: `Value`, `Values`, `Message`; `placeholdersOf`; `languageName`.

- [x] **Step 1: Write the failing tests.**

```ts
test('the names in a text, each once, in order', () => {
  expect(placeholdersOf('Waiting for {count} more. Code: {code}. {count}!')).toEqual(['count', 'code'])
})
test('what is not a name is not one', () => {
  for (const text of ['{}', '{ count }', '{Count}', '{1st}', '{count', 'count}', '{a-b}', `{${'a'.repeat(33)}}`])
    expect(placeholdersOf(text), text).toEqual([])
})
test('a text of 2000 braces is read without trouble', ...)           // '{'.repeat(2000): []
test('each language has an English name', ...)   // English, Spanish, Korean, Japanese, Chinese, Portuguese
```

- [x] **Step 2: Push; `check` fails** on the missing exports.
- [x] **Step 3: Implement.** One regular expression with no nested repeat: `/\{([a-z][a-zA-Z0-9]{0,31})\}/g`.
  The schema does not change: a brace that is not a name is an ordinary character, so every messages file that
  reads today still reads and `schemas/messages.schema.json` stays as it is.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(content): the values a text asks for`).

### Task 3: The check for a missing translation

**Files:**
- Create: `src/features/content/translations.ts`, `tests/features/content/translations.test.ts`
- Modify: `src/features/content/content.ts`, the full game's six messages files (the level's name),
  `tests/features/content/full-game.parity.test.ts`

**Interfaces:**
- Consumes: `placeholdersOf`, `languageName`, `GameContent.project.content` (each file's path).
- Produces: `translationProblems` (the contract).

The spec: "A check fails when a message is missing in any of the six languages." *The author's call, marked for the
audit:* this is a check of its own and not part of `loadGame`. A game with a word missing in Korean still loads and
runs, with English standing in for that word, because a missing translation should not stop an English player's
game or lock a team out of the editor; CI and `automata check` call this and fail. `loadGame` keeps the rule it
has: a key that English lacks is a mistake in the file.

The sentences (tests quote them; `<...>` is filled in):

| When | File and path | Sentence |
|---|---|---|
| A language has no file | `automata.toml`, `content` | `This game has no words in <Korean>. Add <content/messages/ko.json> with every word English has, and list it here.` |
| A file lacks an English key | that file, `messages` | `This file has no "<keeper.hello>". English says "<Hello there!>". Write it in <Korean>.` |
| English asks for a value the text lacks | that file, `messages.<key>` | `English has {<count>} in this text and this one does not. Put {<count>} where the number or name belongs.` |
| The text asks for a value English lacks | that file, `messages.<key>` | `This text has {<count>}, which English does not. Take it out, or fix its spelling.` |
| A level's name is over 40 characters | that file, `messages.<key>` | `A level's name is at most 40 characters, so it fits on a save. This one has <52>.` |
| A button's words are over 12 characters (audit I1) | that file, `messages.<key>` | `A button's words are at most 12 characters, so they fit on the button. This one has <15>.` |
| A level's name for a level the game does not have (audit M6) | that file, `messages.<key>` | `This game has no level called "<level-9>". Take this line out, or fix the level's name in the key.` |

The missing file's path is English's own path with the file name changed. An English text longer than 60
characters is cut in the sentence to 60 and "...". Order: the missing files in `LANGUAGES` order, then each listed
language in that order, its keys sorted.

- [x] **Step 1: Write the failing tests:** one per row, each on content made in memory
  (`tests/fixtures/content/`); and

```ts
test('a game with no words has nothing to translate', ...)                 // the M1 fixture: []
test('the full game is translated in full', ...)                           // []
test('English alone: five sentences, one for each language it lacks, in order', ...)
test('a key named "constructor" or "toString" is a key like any other', ...)
test('a level name of exactly 40 characters passes, and English is held to it too', ...)
test('a thousand missing words are a thousand sentences, sorted', ...)
```

- [x] **Step 2: Push; `check` fails** on the missing export.
- [x] **Step 3: Implement** `translationProblems`. Keys are looked up with `Object.hasOwn`. Add
  `"level.level-1.name"` to the full game's six files (`Level 1`, `Nivel 1`, `레벨 1`, `レベル1`, `第 1 关`,
  `Fase 1`), and the fixture controls' words (audit I1): `controls.left`, `controls.right`, `controls.jump` as
  `Left`/`Right`/`Jump`, `Izquierda`/`Derecha`/`Saltar`, `왼쪽`/`오른쪽`/`점프`, `左`/`右`/`ジャンプ`, `左`/`右`/`跳`,
  `Esquerda`/`Direita`/`Pular`, each in the place `writeContent` puts it; the parity test's byte check holds them.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(content): a check that says which words are not translated`).

### Task 4: The marks for a native speaker's read

**Files:**
- Create: `src/features/content/read-marks.ts`, `tests/features/content/read-marks.test.ts`,
  `tests/fixtures/full-game/automata.translations.toml`
- Modify: `src/features/content/content.ts`, `tests/fixtures/full-game/read.ts` (the new file is not content: it is
  read beside the game, and `loadGame` never asks for it)

**Interfaces:**
- Produces: `READ_MARKS_FILE`, `ReadMarks`, `parseReadMarks`, `writeReadMarks`, `readMark`, `markRead`,
  `unreadWords` (the contract).

The spec: "M2's translations are written by an agent and marked for a native speaker's read before Release 1."
The mark is kept by what was read, not by a flag, so it cannot go stale.

- [x] **Step 1: Write the failing tests.**

```ts
test('with no marks, every translated word waits for a read, and English never does', ...)
  // the full game: 5 languages x 9 keys = 45 (audit I1 adds three controls.* keys in Task 3), es first, keys sorted;
  // no entry has language 'en'
test('marking a language reads all of it, and only it', ...)
test('a word changed after its read waits again; so does a word whose English changed', ...)
test('a mark for a word the game no longer has is dropped when the marks are written', ...)
test('the file is written the same whatever order the marks were made in, and reads back the same', ...)
  // equals the block under "The marks file" for one es mark
test('a file that is not TOML, has no format, or has a mark that is not 16 hex digits says so plainly', ...)
  // 'automata.translations.toml: This file is not valid TOML. ...'; 'Write format = 1.';
  // 'read.es.keeper.hello: A mark is 16 letters and digits, written by the tool. Take this line out.'
test('an empty file, and one with only format = 1, both mean nothing is read', ...)
test('a [read.en] or [read.fr] table is refused in words', ...)
  // 'read.fr: This is not a language a game has words in. Use es, ko, ja, zh or pt.'
```

- [x] **Step 2: Push; `check` fails** on the missing exports.
- [x] **Step 3: Implement.** Parse with `smol-toml` through the same `withoutMark` and `checkData` as
  `parseProject`, with a strict Zod schema. `writeReadMarks` writes the text itself (keys are message keys, values
  are hex, so each line is `"<key>" = "<mark>"`); a language with no marks has no table. Commit the full game's
  marks file as `format = 1` and a newline.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(content): marks for the words a native speaker has read`).

### Task 5: The `locale` layer and picking a language

**Files:**
- Create: `src/features/locale/locale.ts`, `pick.ts`, `names.ts`, `tests/features/locale/pick.test.ts`
- Modify: `tests/architecture/rules.ts`, `tests/architecture/rules.test.ts`, `src/headless.ts`

**Interfaces:**
- Consumes: `LANGUAGES`, `Language`.
- Produces: `matchLanguage`, `pickLanguage`, `LANGUAGE_NAMES`, `LANGUAGE_TAGS`.

- [x] **Step 1: Write the failing tests.**

```ts
// rules.test.ts
test('locale sits right above host and may import it; host may not import locale', ...)
test('the headless entry may reach locale', ...)                 // locale is not a page feature
// pick.test.ts
test('the same tag, whatever its case', ...)                     // 'KO' -> 'ko'
test('a longer tag finds its language', ...)                     // pt-BR, es-419, ES-mx, zh-Hant-TW, zh-CN, ja-JP
test('a tag written with _ or ending in .UTF-8 is read as one with -', ...)   // ko_KR, ko_KR.UTF-8, pt_BR -> ko, ko, pt (audit M1)
test('a tag that is no language of ours finds nothing', ...)     // fr, '', '*', 'k', 'korean', 300 x 'a', 'en-'.repeat(100)
test('a language the game does not have finds nothing', ...)     // 'ko' with shipped ['en', 'es']
test('saved first, then the host, then the device in its order, then English', ...)
  // saved 'ja' wins over host 'ko'; saved 'fr' falls to host 'ko'; host undefined falls to device ['fr-CA', 'pt-BR', 'es'] -> 'pt';
  // device [] -> 'en'; shipped ['en'] and everything else Korean -> 'en'
test('each language is named in its own words, and has a tag for a page', ...)
  // English, Español, 한국어, 日本語, 中文, Português; en, es, ko, ja, zh-Hans, pt-BR
```

- [x] **Step 2: Push; `check` fails** ("locale is not a feature" and the missing exports).
- [x] **Step 3: Implement.** `LAYERS` gains `'locale'` after `'host'`. `matchLanguage` drops what follows a `.`, reads `_` as `-`
  (audit M1), lower-cases the tag and takes what is before the first `-`; a tag over 35 characters or with a character outside `a-z`, `0-9` and `-`
  finds nothing. `pickLanguage` tries saved, host, then each device tag, and ends on `'en'`.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(locale): the layer, and which language a player gets`).

### Task 6: Words: the game's, the framework's own, and their values

**Files:**
- Create: `src/features/locale/fill.ts`, `words.ts`, `src/features/locale/library/{en,es,ko,ja,zh,pt}.json`,
  `src/features/locale/library/automata.translations.toml`, `tests/features/locale/fill.test.ts`,
  `words.test.ts`, `library.test.ts`
- Modify: `src/features/locale/locale.ts`, `tsconfig.json` (`"resolveJsonModule": true`, if the typecheck asks),
  and, only if plan T is on `main`, `src/features/story/words.ts` (see "What the other plans rely on")

**Interfaces:**
- Consumes: `placeholdersOf`, `MessagesSchema`, `translationProblems`, `unreadWords`, `LANGUAGE_TAGS`.
- Produces: `Words`, `fill`, `languagesOf`, `wordsOf`, `frameworkWords`, `typed`.

The six library files are in "The framework's own sentences" at the end of this plan: copy them as they are. Each
is a messages file, in the bytes `writeContent` gives. They are imported as
`import en from './library/en.json' with { type: 'json' }`, so the scripts that Node runs read them too; nothing
typed from a JSON file is exported (each import is held in a `MessagesFile`), so no `.d.ts` names one.

- [x] **Step 1: Write the failing tests.**

```ts
// fill.test.ts
test('a value goes where its name is, as often as it is named', ...)
test('a number is shown as written, and a list is joined the way the language joins one', () => {
  expect(fill('Players {players}', { players: [1, 2, 4] }, 'en')).toBe('Players 1, 2 and 4')
  expect(fill('Players {players}', { players: [1, 3] }, 'en')).toBe('Players 1 and 3')
  expect(fill('{players}', { players: [2] }, 'ko')).toBe('2')
  for (const language of LANGUAGES)     // every number is there, in order, in every language and every engine
    expect(fill('{p}', { p: [1, 2, 4] }, language)).toMatch(/1.*2.*4/)
})
test('a name with no value is shown as typed; a value nobody asked for is ignored', ...)
test('a value is never filled a second time', () => {
  expect(fill('{a} {b}', { a: '{b}', b: 'x' }, 'en')).toBe('{b} x')
})
test('a value named like something every object has is only a value', ...)   // {constructor}, {toString} with no value: as typed
test('an engine with no list formatter joins with commas', ...)              // Intl.ListFormat stubbed away
// words.test.ts
test('the language asked for, then English, then the key', ...)              // plan T's three cases
test('the framework's own words are there in a game that says nothing of them', ...)
  // wordsOf(m1Content, 'es')('automata.touch.label') === 'Controles táctiles'
test('a game may say a framework sentence its own way; a language it leaves out keeps the framework's', ...)
  // game en gives automata.touch.label 'Buttons': en -> 'Buttons', ko -> '터치 조작'
test('the game's languages, in order; all six for a game with no words', ...)
test('a key no file has, and "constructor", give the key back', ...)
test('typed holds a key to the file it was given', ...)                      // expectTypeOf; a wrong key is @ts-expect-error
// library.test.ts (reads the six files as text with ?raw)
test('each file is a messages file, in the bytes writeContent gives', ...)
test('the six files are translated in full', ...)                            // translationProblems of a content built from them: []
test('every automata.* key written in src/ is in en.json, and every key of en.json is written in src/', ...)
  // reads src/**/*.ts as text, as architecture.test.ts does; a key built from a variable is listed in the test by its stem
test('no sentence names a colour or says locale, key, fallback, socket or tick', ...)
test('how many of the framework's words wait for a native read is printed, and never fails', ...)
  // console.log(`native read: ${n} of ${total} framework words wait`); with an empty marks file n === total
```

- [x] **Step 2: Push; `check` fails** on the missing exports.
- [x] **Step 3: Implement.** `fill` replaces with one pass of `placeholdersOf`'s expression and `Object.hasOwn`. A
  list is formatted with `new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' })`, where the tag is
  `LANGUAGE_TAGS` but `en-GB` for English ("1, 2 and 4", as the level's own errors say it), and with `', '` when
  the engine has no `Intl.ListFormat`. `wordsOf` looks up, in order: the game's file for the language, the
  framework's for it, the game's English, the framework's English, then gives the key; the text found is filled in
  the language asked for.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(locale): words by key, with their values, in six languages`).

### Task 7: The player's language: the service, its settings, names for saves

**Files:**
- Create: `src/features/locale/settings.ts`, `create.ts`, `labels.ts`, `tests/features/locale/create.test.ts`,
  `labels.test.ts`, `tests/fixtures/locale/content.ts`
- Modify: `src/features/locale/locale.ts`

**Interfaces:**
- Consumes: `openSettings`, `Settings`, `memoryStore`, `testHost`, `createSaves`, `pickLanguage`, `wordsOf`.
- Produces: `LanguageSettings`, `LanguageSettingsSchema`, `LANGUAGE_SETTINGS_DEFAULT`, `Locale`, `createLocale`,
  `levelName`, `fitLabel`.

- [x] **Step 1: Write the failing tests** (the full game, `testHost`, `memoryStore`).

```ts
test('a first visit takes the device's language; with none, English', ...)
  // deviceLanguages ['pt-BR', 'en'] -> 'pt', choice() 'auto'; [] -> 'en'
test('the host's language comes before the device's, and a saved choice before both', ...)
test('a pick changes the words at once, tells listeners once, and is kept', ...)
  // await set('ko'): language() 'ko', words('keeper.hello') is Korean, one onChange('ko');
  // the store holds {"format":1,"sections":{"language":{"format":1,"language":"ko"}}}
test('a second game opened on the same store starts in the picked language', ...)
test('back to auto follows the device again, and is kept as auto', ...)
test('picking the language already shown tells nobody', ...)
test('a host that will not keep the choice: the game still changes, and the answer says no', ...)
  // a store whose set refuses 'unavailable': language() 'ja'; the answer is { ok: false, refusal: 'unavailable', ... }
test('a saved language this game does not have is as good as none, and is left stored', ...)
  // stored "fr", stored "ko" with a game of en and es, stored null, stored 7: choice() 'auto'; the store's text is unchanged
test('a language the game does not have cannot be picked', ...)       // set('ko') on en+es: RangeError, in words; nothing changes
test('a listener that throws does not stop the choice being kept or the others being told', ...)
  // audit M2, as SettingsHandle.set does: every listener is told, the store holds the choice, then set rejects
  // with the first listener's error
test('say fills a message as words does', ...)
// labels.test.ts
test('a level's name in the player's language; the id when the game names nothing', ...)
test('a label that fits is left alone; a long one is cut to 80 with nothing split', ...)
  // 200 x '가' -> 80; 79 x 'a' + a family emoji of 11 units -> the 79 letters, no half emoji; '' -> ''
test('a cut label is one a save takes', ...)                          // createSaves(...).save(0, data, { label: fitLabel(long) }) is ok
test('an engine with no Intl.Segmenter cuts between code points', ...)
```

- [x] **Step 2: Push; `check` fails** on the missing exports.
- [x] **Step 3: Implement.** `createLocale` is not async: it takes the section with
  `settings.section({ name: 'language', schema: LanguageSettingsSchema, initial: LANGUAGE_SETTINGS_DEFAULT })`,
  and listens to that handle's `onChange`, so a choice set by anyone holding the same handle is followed too.
  `set` passes the write's answer back. `words` reads the language on every call. `fitLabel` counts as a save does
  (`length`, UTF-16 units) and walks `Intl.Segmenter`'s graphemes, or code points where there is none.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`feat(locale): the player's language, kept with their settings`).

### Task 8: The features below speak in keys

**Files:**
- Create: `src/features/locale/online.ts`, `src/features/web/lang.ts`, `tests/features/locale/online.test.ts`,
  `tests/features/web/lang.browser.test.ts`
- Modify: `src/features/net/words.ts`, `net.ts`, `src/features/input/touch.ts`, `input.ts`,
  `src/features/game/players.ts`, `game.ts`, `online.ts`, `src/features/web/web.ts`, `src/index.ts`,
  `tests/features/net/words.test.ts`, the tests of `players.ts` and `touch.ts`

**Interfaces:**
- Consumes: `Message`, `Words`, `Locale`, `frameworkWords`.
- Produces: `onlineMessage` (net), `onlineWords` (locale), `followLanguage` (web), `GameOptions.locale`,
  `createTouch(mount, controls, options?: { win?, words? })` and `Touch.relabel(words: Words)` (audit I1 and I3:
  the overlay's label is `automata.touch.label` and each button's words are `controls.<action>` when `words` has
  that key, else the control's `label`; `relabel` says them all again). `input` is below `locale`, so the
  `Words` type moves to `src/lib/message.ts` beside `Message`, and `locale` re-exports it.

A feature below `locale` cannot ask it for words, so it must not hold a sentence. The keys and values:

| Was | Key | Values |
|---|---|---|
| `onlineWords` waiting, `missing === 1` / more | `automata.online.waiting.one` / `.many` | `code`; `.many` also `count` |
| playing, one away / more | `automata.online.away.one` / `.many` | `players` (the list of numbers) |
| reconnecting | `automata.online.reconnecting` | |
| ended | `automata.online.ended.<problem>` | |
| `JoinAnswer.reason` `one-player-game`, `no-shared` | `automata.join.<reason>` | |
| `full` | `automata.join.full` | `count` |
| `no-start`, one start / more | `automata.join.no-start.one` / `.many` | `.many`: `count` |
| `taken`, by the keyboard / a gamepad | `automata.join.taken.keyboard` / `.gamepad` | |
| the touch overlay's `aria-label` | `automata.touch.label` | |
| a touch button's words (audit I1) | the game's `controls.<action>`, else the control's own `label` | |

- [x] **Step 1: Write the failing tests.**

```ts
// tests/features/net/words.test.ts: each case that quoted a sentence now expects its key and values
test('playing with everyone here is nothing to say', ...)                 // onlineMessage -> undefined
// tests/features/locale/online.test.ts: every sentence the old words.test.ts quoted, word for word, from onlineWords(status)
test('the same room in Korean', ...)                                      // onlineWords(status, wordsOf(content, 'ko'))
test('every problem a room can end on has a sentence in every language', ...)   // ONLINE_PROBLEMS x LANGUAGES: not the key
// players: every English `message` the tests quote today still comes back with no locale given;
test('with a locale, a refused join is said in the player's language, as it is when asked', ...)
  // locale at 'es': 'Este juego es para un jugador.'; after set('ja') the next answer is Japanese
// touch
test('the overlay is labelled with the words it is given, and "Touch controls" with none', ...)
test('each button says controls.<action> when the words have it, and its own label when not', ...)   // audit I1
test('relabel says every word again, the button's aria-label too, and keeps what is held', ...)       // a held Jump stays held
// tests/features/web/lang.browser.test.ts
test('the page says which language it is in, and keeps saying so', ...)
  // followLanguage(locale, element): lang 'ko'; after set('zh') 'zh-Hans'; after set('pt') 'pt-BR'; after stop(), no more changes
test('with no element it is the page's own <html>', ...)                  // and the test puts back what was there
```

- [x] **Step 2: Push; `check` and the `engines` jobs fail** on the missing exports.
- [x] **Step 3: Implement.** `net/words.ts` keeps `OnlineStatus` and answers with `onlineMessage`; its sentences
  go (they are in `library/en.json`). `locale/online.ts` is
  `onlineWords(status, words = frameworkWords('en'))`: the message said by `words`, or `''`. `players.ts` takes
  `words: Words` in its options and builds each `message` with it when the answer is made; `startGame` and
  `startOnlineGame` pass `options.locale?.words ?? frameworkWords('en')`, give `createTouch` the words, and on
  `locale.onChange` call `touch.relabel(locale.words)` (stopped by `stop`). A button's words are found with
  `Object.hasOwn` on the key, so a game that names no `controls.*` shows its labels as today. `followLanguage` is exported by
  `src/index.ts` only. `tests/fixtures/online/page/main.ts` and the README's online example import `onlineWords`
  from the same entry as before and need no change; if either fails, stop and report.
- [x] **Step 4: Push; every job passes,** the `online` job too.
- [x] **Step 5: Commit** (`feat(locale): the framework's own sentences in the player's language`).

### Task 9: Journeys in three real browsers

**Files:**
- Create: `tests/fixtures/locale/page.ts`, `tests/features/game/language.browser.test.ts`,
  `tests/features/web/language-kept.browser.test.ts`
- Modify: `tests/journeys/online.journey.test.ts` and `tests/fixtures/online/page/` (audit J2: `?lang=`)
- Modify: `.github/workflows/ci.yml` only if a picture's name must be added to the `screens` job (say so in the
  commit), `tests/workflows/ci.test.ts`

**Interfaces:**
- Consumes: `startGame`, `webHost`, `openSettings`, `createLocale`, `followLanguage`,
  `tests/fixtures/saves/open-page.ts` (a real second page on the same storage), `tests/fixtures/game/screens.ts`
  or `layout.browser.test.ts`'s sizes.

`tests/fixtures/locale/page.ts` is a page like `tests/fixtures/saves/page.ts`: it loads the full game, opens the
settings on the real `webHost()`, makes a locale, calls `followLanguage`, starts the game with the locale and the
fixture controls (the full game is a one-player game, so a second player's join is refused with
`automata.join.one-player-game`; audit M4), with an injected `frames` so a test counts ticks, not frames (audit M5),
and shows three things as text a test can read: the keeper's greeting (`keeper.hello`), the level's name, and the
answer to an `addPlayer` that must be refused. It has one real `<button>` per language, named with
`LANGUAGE_NAMES`, each at least 48 px tall, and posts the same three messages as the saves page.

- [x] **Step 1: Write the failing tests.**

```ts
// language.browser.test.ts, at 390x844, 844x390, 820x1180, 1180x820 and 1280x720
test('a first-time player whose device says Korean is greeted in Korean', ...)
  // webHost({ navigator: { language: 'ko-KR', languages: ['ko-KR', 'en-US'] } }): the greeting is ko.json's, <html lang="ko">
test('a player taps 日本語 and everything on the page is Japanese', ...)
  // a real tap; the greeting, the level's name, the refused join, the touch overlay's label and the three touch
  // buttons' words (audit J1: 左, 右, ジャンプ) are Japanese; lang is 'ja';
  // the canvas is still there and the sim's tick went on counting: the game was not restarted
test('every language's button can be read and pressed at every size', ...)
  // six buttons, none cut off or covered, each 48 px or taller; each name is drawn (audit J3: on a canvas in the
  // page's font, the name and as many U+0378 make pictures whose pixels differ; empty boxes would match)
test('changing the language moves no hash', ...)
  // two games, the same held keys for 120 ticks (injected frames); one changes language at tick 60: sim.hash() equal
test('a picture of the page in each language', ...)       // six pictures at 390x844, saved as the other journeys save theirs
// language-kept.browser.test.ts
test('a language picked on one page is the language of the next', ...)
  // pick Português, wait for the write, open a real second page on the same storage: Portuguese before any tap, lang 'pt-BR'
test('with storage refused the pick still shows, and the next page is the device's language again', ...)
// tests/journeys/online.journey.test.ts (audit J2): the fixture page takes ?lang=es and says its status with
// onlineWords(status, frameworkWords(lang)); the second page's waiting sentence is Spanish and holds the room's code
test('a player whose page is in Spanish is told in Spanish who the room waits for', ...)
```

- [x] **Step 2: Push; the `engines` jobs fail** because the page fixture does not exist.
- [x] **Step 3: Implement** the page fixture. No change under `src/`: if a test needs one, the earlier task was
  wrong; fix it there and say so in the report.
- [x] **Step 4: Push; every job passes** in Chromium, WebKit and Firefox. Look at the six pictures on the
  `ci-screens` branch: each language's letters are drawn (no empty boxes), and say what you saw in the report.
- [x] **Step 5: Commit** (`test: a player picks a language and keeps it, in three browsers`).

### Task 10: An agent's journey, the package and the README

**Files:**
- Modify: `tests/features/content/agent-journey.test.ts`, `tests/public-surface.test.ts`, `tests/install/smoke.mjs`,
  `tests/install/consumer.ts`, `README.md`, `tests/docs/readme.test.ts`, `docs/api/framework.api.md`

- [x] **Step 1: Write the failing tests.**

```ts
// agent-journey.test.ts: an agent adds a line, with nothing but the files and the sentences it is given
test('an agent adds a word in English and is told, file by file, where else to write it', ...)
  // adds "keeper.joke" to en.json: loadGame is ok; translationProblems is five sentences, each naming one file and the key;
  // it writes the five (each with writeContent): []; unreadWords now holds those five; markRead('es') leaves four
test('an agent misspells a value in one language and is told which', ...)
// public-surface.test.ts: both entries gain the locale names of the contract, placeholdersOf, languageName,
//   translationProblems, the read-marks names, simContent, onlineMessage; the page entry gains followLanguage;
//   onlineWords is still there
// readme.test.ts: the README has "## Languages"; every name it uses is exported; its code blocks are checked as the others are
```

- [x] **Step 2: Push; `check` and `package` fail** on the surface and the README.
- [x] **Step 3: Write.** `smoke.mjs`, on the full game it already loads: `createLocale` with `testHost({ deviceLanguages: ['ja-JP'] })`
  and `memoryStore()` greets in Japanese, and `translationProblems` is empty. `consumer.ts` uses `typed` on a
  messages object and `Locale`. The README's "Languages" section, after "Saves", in plain words: where words live
  (one file per language, one line per word), `{name}` values, how the language is picked, `createLocale` and
  `locale.words` in a dozen lines, `startGame({ locale })` and `followLanguage`, a level's name, the two checks and
  what their sentences look like, the marks file and that every translation here waits for a native speaker's
  read, and that changing a word changes no replay. "Play online" keeps `onlineWords` and gains one line: pass
  `locale.words` for the player's language. Take the API report's text from the `package` job's log.
- [x] **Step 4: Push; every job passes.**
- [x] **Step 5: Commit** (`docs: languages in the README, the package and an agent's journey`).

### Task 11: The whole branch, the tracker and the handoff

- [x] **Step 1:** Whole-branch self-review (no subagents): every sentence in this plan's tables appears in a test;
  each Review Focus line has its test; `git diff main -- tests/golden` is empty (or only `story.json`, named in its
  commit); `git diff main -- schemas` is empty; no file under `src/` is over 600 lines; nothing in `sim`,
  `physics`, `commands`, `net` or `level` imports `locale`.
- [x] **Step 2:** `docs/superpowers/progress.md`: plan L's execution at 100%, a log line with the test count and
  how many of the framework's words wait for a native read, and (audit M8) a "Before Release 1" line in plan L's
  row: every framework and demo word has a read mark, so `unreadWords` is empty.
- [x] **Step 3:** Report to the coordinator: the merge commit to move pins to; which of plans S, T and U must now
  add their keys to the library; that plan K's Step L and plan D's step for L can start; anything the journeys'
  pictures showed.
- [x] **Step 4: Push; the last run is green on the head.**

### Task 12 (held: only if the Owner answers "use Paraglide"): typed messages for a game's code

Not started, and no package installed, until the coordinator passes on the Owner's yes for
`@inlang/plugin-message-format` 4.4.4. It also waits for plan K's Part 1 on `main` (`src/features/cli/`, where
Effect and `node:` imports are allowed). If the Owner says no, strike this task and add the reason to the first
spec's stack table in the same pull request. If it is built, it is its own pull request and the plan audit's
method applies to it again before it starts, because it adds a build step to every game.

**Files:**
- Create: `src/features/locale/paraglide.ts`, `src/features/cli/words.ts`, `tests/features/locale/paraglide.test.ts`,
  `tests/features/cli/words.test.ts`
- Modify: `package.json` (`@inlang/paraglide-js` 2.25.4 and `@inlang/plugin-message-format` 4.4.4, exact),
  `tests/architecture/rules.ts` (both packages confined to `src/features/cli/words.ts`), `tests/package.test.ts`

**Interfaces:**
- Produces: `bindParaglide(runtime: ParaglideRuntime, locale: Locale): void`, where `ParaglideRuntime` is
  `{ readonly locales: readonly string[]; readonly baseLocale: string; overwriteGetLocale(fn: () => string): void; overwriteSetLocale(fn: (locale: string) => void): void }`
  (structural: the framework's page code never imports Paraglide);
  `compileWords(options: { folder: string; outdir: string }): Effect.Effect<readonly string[], CliError, Ports>`
  (the files written).

- [ ] **Step 1: Write the failing tests:** a fake runtime bound to a locale reads `locale.language()` and its
  `setLocale` calls `locale.set`; `compileWords` on the full game writes `messages.js` and `runtime.js` under the
  outdir, with English as the base, and a second run with nothing changed writes nothing; an outdir inside
  `content/` is refused in words.
- [ ] **Step 2: Push; `check` fails.**
- [ ] **Step 3: Implement,** porting the old repo's `compile-messages.ts` and `sync-folder.ts` (`ed8592e8`): the
  inlang project is made in a temporary folder for each compile from the game's messages files, the strategy is
  `['baseLocale']` only, and what differs is copied into the outdir.
- [ ] **Step 4: Push; every job passes;** the `package` job's install still works in an empty folder.
- [ ] **Step 5: Commit** (`feat(cli): a game's words as typed functions`).

---

## The framework's own sentences

The six files of `src/features/locale/library/`, as `messages` maps (each file is `{ "format": 1, "id": "<lang>",
"messages": { ... } }` with its keys sorted, as `writeContent` writes it). English is word for word what
`net/words.ts`, `game/players.ts` and `input/touch.ts` say on `main` today. The other five were written by this
plan's author, not by a native speaker: every one of them waits for a read.

```json
"en": {
  "automata.join.full": "Everyone is in. This game has room for {count} players.",
  "automata.join.no-shared": "This game's keys cannot be shared. Join with a gamepad.",
  "automata.join.no-start.many": "This level has room for {count} players.",
  "automata.join.no-start.one": "This level has room for one player.",
  "automata.join.one-player-game": "This game is for one player.",
  "automata.join.taken.gamepad": "That gamepad already has a player.",
  "automata.join.taken.keyboard": "The keyboard is already shared.",
  "automata.online.away.many": "Players {players} lost their connection. The game goes on.",
  "automata.online.away.one": "Player {players} lost their connection. The game goes on.",
  "automata.online.ended.bad-room": "That room could not be made. Check the level and the number of players.",
  "automata.online.ended.different-version": "This game is a different version from the room. Reload the page to get the newest one, then join again.",
  "automata.online.ended.lost": "The connection was lost and could not be got back. Start or join a room to play again.",
  "automata.online.ended.no-room": "No room has that code. Check the code and try again.",
  "automata.online.ended.no-server": "Could not reach the game server. Check your internet and try again.",
  "automata.online.ended.room-full": "That room is full. Start a new room, or ask for another code.",
  "automata.online.ended.server-full": "The server has no space for another room right now. Try again in a minute.",
  "automata.online.reconnecting": "Connection lost. Trying to get you back in.",
  "automata.online.waiting.many": "Waiting for {count} more players. Share this code so friends can join: {code}",
  "automata.online.waiting.one": "Waiting for 1 more player. Share this code so a friend can join: {code}",
  "automata.touch.label": "Touch controls"
}
"es": {
  "automata.join.full": "Ya están todos. En este juego caben {count} jugadores.",
  "automata.join.no-shared": "Las teclas de este juego no se pueden compartir. Únete con un control.",
  "automata.join.no-start.many": "En este nivel caben {count} jugadores.",
  "automata.join.no-start.one": "En este nivel cabe un jugador.",
  "automata.join.one-player-game": "Este juego es para un jugador.",
  "automata.join.taken.gamepad": "Ese control ya tiene un jugador.",
  "automata.join.taken.keyboard": "El teclado ya está compartido.",
  "automata.online.away.many": "Los jugadores {players} perdieron la conexión. El juego sigue.",
  "automata.online.away.one": "El jugador {players} perdió la conexión. El juego sigue.",
  "automata.online.ended.bad-room": "No se pudo crear esa sala. Revisa el nivel y el número de jugadores.",
  "automata.online.ended.different-version": "Este juego es de una versión distinta a la de la sala. Recarga la página para tener la más nueva y vuelve a unirte.",
  "automata.online.ended.lost": "Se perdió la conexión y no se pudo recuperar. Crea una sala o únete a una para volver a jugar.",
  "automata.online.ended.no-room": "Ninguna sala tiene ese código. Revisa el código y prueba otra vez.",
  "automata.online.ended.no-server": "No se pudo conectar con el servidor del juego. Revisa tu internet y prueba otra vez.",
  "automata.online.ended.room-full": "Esa sala está llena. Crea una sala nueva o pide otro código.",
  "automata.online.ended.server-full": "El servidor no tiene espacio para otra sala ahora mismo. Prueba de nuevo en un minuto.",
  "automata.online.reconnecting": "Se perdió la conexión. Estamos intentando que vuelvas a entrar.",
  "automata.online.waiting.many": "Faltan {count} jugadores. Comparte este código para que tus amigos se unan: {code}",
  "automata.online.waiting.one": "Falta 1 jugador. Comparte este código para que un amigo se una: {code}",
  "automata.touch.label": "Controles táctiles"
}
"ko": {
  "automata.join.full": "모두 들어왔어요. 이 게임은 {count}명까지 할 수 있어요.",
  "automata.join.no-shared": "이 게임은 키보드를 같이 쓸 수 없어요. 게임패드로 들어오세요.",
  "automata.join.no-start.many": "이 레벨은 {count}명까지 할 수 있어요.",
  "automata.join.no-start.one": "이 레벨은 한 명만 할 수 있어요.",
  "automata.join.one-player-game": "이 게임은 한 명이 하는 게임이에요.",
  "automata.join.taken.gamepad": "그 게임패드에는 이미 플레이어가 있어요.",
  "automata.join.taken.keyboard": "키보드는 이미 같이 쓰고 있어요.",
  "automata.online.away.many": "플레이어 {players}의 연결이 끊겼어요. 게임은 계속됩니다.",
  "automata.online.away.one": "플레이어 {players}의 연결이 끊겼어요. 게임은 계속됩니다.",
  "automata.online.ended.bad-room": "그 방을 만들 수 없었어요. 레벨과 플레이어 수를 확인해 주세요.",
  "automata.online.ended.different-version": "이 게임은 방과 버전이 달라요. 페이지를 새로 고쳐 최신 버전을 받은 다음 다시 들어오세요.",
  "automata.online.ended.lost": "연결이 끊겨서 되돌릴 수 없었어요. 다시 하려면 방을 만들거나 방에 들어오세요.",
  "automata.online.ended.no-room": "그 코드의 방이 없어요. 코드를 확인하고 다시 해 보세요.",
  "automata.online.ended.no-server": "게임 서버에 연결할 수 없었어요. 인터넷을 확인하고 다시 해 보세요.",
  "automata.online.ended.room-full": "그 방은 꽉 찼어요. 새 방을 만들거나 다른 코드를 받아 보세요.",
  "automata.online.ended.server-full": "지금은 서버에 새 방을 만들 자리가 없어요. 1분 뒤에 다시 해 보세요.",
  "automata.online.reconnecting": "연결이 끊겼어요. 다시 들어가는 중이에요.",
  "automata.online.waiting.many": "플레이어 {count}명을 기다리고 있어요. 친구들이 들어올 수 있게 이 코드를 알려 주세요: {code}",
  "automata.online.waiting.one": "플레이어 1명을 기다리고 있어요. 친구가 들어올 수 있게 이 코드를 알려 주세요: {code}",
  "automata.touch.label": "터치 조작"
}
"ja": {
  "automata.join.full": "全員そろいました。このゲームは{count}人まで遊べます。",
  "automata.join.no-shared": "このゲームではキーボードを2人で使えません。ゲームパッドで入ってください。",
  "automata.join.no-start.many": "このレベルは{count}人まで遊べます。",
  "automata.join.no-start.one": "このレベルは1人だけ遊べます。",
  "automata.join.one-player-game": "このゲームは1人用です。",
  "automata.join.taken.gamepad": "そのゲームパッドにはもうプレイヤーがいます。",
  "automata.join.taken.keyboard": "キーボードはもう2人で使っています。",
  "automata.online.away.many": "プレイヤー{players}の接続が切れました。ゲームは続きます。",
  "automata.online.away.one": "プレイヤー{players}の接続が切れました。ゲームは続きます。",
  "automata.online.ended.bad-room": "その部屋を作れませんでした。レベルと人数をたしかめてください。",
  "automata.online.ended.different-version": "このゲームは部屋とバージョンがちがいます。ページを読みこみ直して最新版にしてから、もう一度入ってください。",
  "automata.online.ended.lost": "接続が切れて、元にもどせませんでした。もう一度遊ぶには、部屋を作るか部屋に入ってください。",
  "automata.online.ended.no-room": "そのコードの部屋はありません。コードをたしかめて、もう一度ためしてください。",
  "automata.online.ended.no-server": "ゲームサーバーにつながりませんでした。インターネットをたしかめて、もう一度ためしてください。",
  "automata.online.ended.room-full": "その部屋はいっぱいです。新しい部屋を作るか、別のコードをもらってください。",
  "automata.online.ended.server-full": "いまサーバーに新しい部屋を作る空きがありません。1分後にもう一度ためしてください。",
  "automata.online.reconnecting": "接続が切れました。もう一度つないでいます。",
  "automata.online.waiting.many": "あと{count}人を待っています。友だちが入れるように、このコードを教えてあげてください: {code}",
  "automata.online.waiting.one": "あと1人を待っています。友だちが入れるように、このコードを教えてあげてください: {code}",
  "automata.touch.label": "タッチ操作"
}
"zh": {
  "automata.join.full": "人都到齐了。这个游戏最多 {count} 人玩。",
  "automata.join.no-shared": "这个游戏的键盘不能共用。请用手柄加入。",
  "automata.join.no-start.many": "这一关最多 {count} 人玩。",
  "automata.join.no-start.one": "这一关只能一个人玩。",
  "automata.join.one-player-game": "这个游戏只能一个人玩。",
  "automata.join.taken.gamepad": "那个手柄已经有玩家了。",
  "automata.join.taken.keyboard": "键盘已经在共用了。",
  "automata.online.away.many": "玩家 {players} 掉线了。游戏继续。",
  "automata.online.away.one": "玩家 {players} 掉线了。游戏继续。",
  "automata.online.ended.bad-room": "那个房间没能建成。请检查关卡和玩家人数。",
  "automata.online.ended.different-version": "这个游戏和房间的版本不一样。请刷新页面获取最新版本，然后再加入。",
  "automata.online.ended.lost": "连接断了，没能恢复。想再玩，请新建或加入一个房间。",
  "automata.online.ended.no-room": "没有房间用这个代码。请检查代码再试一次。",
  "automata.online.ended.no-server": "连不上游戏服务器。请检查网络再试一次。",
  "automata.online.ended.room-full": "那个房间满了。请新建一个房间，或者要一个别的代码。",
  "automata.online.ended.server-full": "服务器现在没有位置再开一个房间。请一分钟后再试。",
  "automata.online.reconnecting": "连接断了。正在帮你重新进入。",
  "automata.online.waiting.many": "还差 {count} 位玩家。把这个代码告诉朋友们，让他们加入：{code}",
  "automata.online.waiting.one": "还差 1 位玩家。把这个代码告诉朋友，让他加入：{code}",
  "automata.touch.label": "触屏按键"
}
"pt": {
  "automata.join.full": "Todo mundo já entrou. Este jogo tem lugar para {count} jogadores.",
  "automata.join.no-shared": "As teclas deste jogo não podem ser divididas. Entre com um controle.",
  "automata.join.no-start.many": "Esta fase tem lugar para {count} jogadores.",
  "automata.join.no-start.one": "Esta fase tem lugar para um jogador.",
  "automata.join.one-player-game": "Este jogo é para um jogador.",
  "automata.join.taken.gamepad": "Esse controle já tem um jogador.",
  "automata.join.taken.keyboard": "O teclado já está sendo dividido.",
  "automata.online.away.many": "Os jogadores {players} perderam a conexão. O jogo continua.",
  "automata.online.away.one": "O jogador {players} perdeu a conexão. O jogo continua.",
  "automata.online.ended.bad-room": "Não foi possível criar essa sala. Confira a fase e o número de jogadores.",
  "automata.online.ended.different-version": "Este jogo está em uma versão diferente da sala. Recarregue a página para pegar a mais nova e entre de novo.",
  "automata.online.ended.lost": "A conexão caiu e não voltou. Crie uma sala ou entre em uma para jogar de novo.",
  "automata.online.ended.no-room": "Nenhuma sala tem esse código. Confira o código e tente de novo.",
  "automata.online.ended.no-server": "Não foi possível falar com o servidor do jogo. Confira sua internet e tente de novo.",
  "automata.online.ended.room-full": "Essa sala está cheia. Crie uma sala nova ou peça outro código.",
  "automata.online.ended.server-full": "O servidor está sem espaço para outra sala agora. Tente de novo em um minuto.",
  "automata.online.reconnecting": "A conexão caiu. Estamos tentando colocar você de volta.",
  "automata.online.waiting.many": "Faltam {count} jogadores. Compartilhe este código para seus amigos entrarem: {code}",
  "automata.online.waiting.one": "Falta 1 jogador. Compartilhe este código para um amigo entrar: {code}",
  "automata.touch.label": "Controles de toque"
}
```

The key order above is by eye; the files are committed in the order `writeContent` gives, which the library test
holds. If English on `main` differs from a sentence here when Task 6 is built, `main` wins: change `en.json`, and
tell the coordinator which translations need another look.

## Self-review (the author's, 2026-11-14)

- **Spec coverage.** "Paraglide messages from the `messages` files": the run-time half is Tasks 2, 6 and 7; the
  Paraglide half is Task 12, held on the Owner's question. "The language is the player's saved choice, then the
  host's, then the browser's, then English": Tasks 5 and 7. "The demo's fonts follow the Visual direction": plan
  D's step, since the framework imposes no font. "A check fails when a message is missing in any of the six
  languages": Task 3, called by CI here, by Examples' CI and by `automata check`. "Written by an agent and marked
  for a native speaker's read before Release 1": Task 4, and the library's own count in Task 6. "Every plan has
  end-to-end tests": Task 9 in three browsers at five sizes, and Task 10's agent journey and packed package.
  "The language is changed and every screen shows it": the mechanism and its journey on a fixture page here; the
  screens are plan U's, the demo's journey plan D's.
- **Handed to this plan by others.** Plan S's audit (words are hashed): Task 1. Plan T's audit M7 (`wordsOf`
  below `story`): Task 6. Plan V's audit (labels from level names in six languages, at most 80): Task 7. Plan N's
  `words.ts` ("plan L translates these"): Task 8. Plan K's Step L (the missing-message sentence): Task 3's
  export.
- **Calls marked for the audit.** (1) The missing-translation check is not part of `loadGame` (Task 3). (2) Words
  leave the sim's content whole, so plan T's `story.json` moves once if it was recorded first (Task 1). (3) A
  level's name is a message by a fixed key, not a field of the level file, so naming a level moves no hash. (4)
  One and many keys, not plural rules. (5) A device that asks for Traditional Chinese is given Simplified, not
  English.
- **Types.** `Words` here takes `(key, values?)`; plan T's `(key) => string` uses are all calls with one argument.
  `Locale.set` answers `StoreResult<void>`, as `SettingsHandle.set` does. `onlineWords` keeps its first argument.
- **Proportion.** The library's six files are exact copy and make up a quarter of this document; no function body
  is written out.
