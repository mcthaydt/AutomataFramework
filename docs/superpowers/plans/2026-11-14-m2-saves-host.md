# M2 Plan V: Saves and the Host Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game keeps progress in save slots and its settings in one record, through a host port that also answers
for the language, links and quitting, with a web host and a test host behind it.

**Architecture:** A new headless feature, `saves`, owns the stored form (a versioned envelope in canonical JSON), the
upgrade rules, the slots and the settings, and defines the small storage port (`SaveStore`) it writes through. The
`host` feature's port grows to carry a `SaveStore`, the language, links and quit, and gains a `testHost` that runs in
Node. The web adapter moves to its own page-only feature, `web`, and keeps saves in the browser's `localStorage`,
answering with a refusal whenever the browser says no. Nothing falls back to memory.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, Vitest 5.0.3 (browser mode on Playwright 1.63.0), Biome 2.5.15,
knip 6.39.0, pnpm 10.34.6, Node 24.21.0. No new dependency.

**Spec:** [`docs/superpowers/specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md), the sections "Saves
(plan V)" and "Host (plan V, with saves)", on top of
[`2026-11-13-2d-first-layer-design.md`](../specs/2026-11-13-2d-first-layer-design.md) (feature layers 9 and 14).
Principles served: 1 (a save is a documented JSON envelope under a documented key, and the test host lets an agent run
all of it in Node with no page), 3 (2D only), 4 (one package), 6 (the old stack, nothing added), 7 (the save policy and
the link rule are ported from the old repo for this layer only).

## What this plan covers, and what it does not

Covered: the `saves` feature (slots, settings, versions and upgrades), the grown `Host` port, the `web` and `test`
hosts, and the proof that a save outlives the page that made it, in three browsers and through the packed package.

Not in this plan, each with its reason:

- **Screens and words.** The saves screen, "Continue" on the title screen and the sentence a player reads when saving
  is refused belong to plans U (screens) and L (languages). This plan gives them the answers to show (see "What the
  other plans rely on") and draws nothing.
- **What goes in the settings.** Volumes are plan S's, key bindings plan I's, the language plan L's. Each of those
  plans exports a section's schema and first values as plain data; `input` and `audio` sit below `saves` in the
  layers, so they never import it. Whoever wires a game together (plan U's screens) turns each into a
  `settings.section(...)`. This plan ships the record they share and no section of its own. (Audit F3.)
- **The demo using saves.** That is plan D's step for V, in AutomataFrameworkExamples, after this plan has merged and
  the pin has moved. Its journey ("a save is continued", across a real reload of the built page) is named below.
- **A sim snapshot inside a save.** Left out because nothing in M2 uses one: the demo continues from the level
  reached. The envelope's `format` number lets a later plan add it without breaking stored saves.
- **Saving by itself on a timer or when the page hides.** A game calls `save` when it wants to (the demo: when a
  level is finished). Left out for the same reason.
- **itch.io, Wavedash and Tauri hosts.** M4.
- **A changeset.** Nothing is published per plan (the Owner, 2026-11-13); Release 1 writes the changelog.

## Before starting

Stop and report to the coordinator if either is not true. Do not work around one.

1. This plan's audit (`docs/superpowers/audits/2026-11-14-m2-saves-host-plan-audit.md`) is merged, and its findings are
   applied as you go.
2. `main` passes CI.

Other M2 plans (C, I, N) are being built in this repo at the same time. Three files are shared and will collide:
`tests/architecture/rules.ts` (`LAYERS`, `PAGE_FEATURES`), `src/headless.ts` and `src/index.ts`. Merge `main` into
your branch before each push; on a collision keep both sides, with the features in this order (plan N adds `net`
and `server`, plans S, L, T and U the rest as they land):

```
sim, physics, commands, net, content, level, server, render, input, audio, saves, host, locale, story, ui, screens, web, game
```

`host` sits right above `saves` and below `locale`, `ui` and `screens`, not after `screens` as the first spec's list
has it: plan L reads `host.language()` and plan U reads `host.canQuit`, and a feature may import (even a type) only
from features below it. `web` sits just below `game`, the only feature that may choose an adapter. In
`PAGE_FEATURES`, `host` is out and `web` is in; a merge that keeps both sides must not put `host` back. In
`src/index.ts`, the `host` line goes (headless carries it); a merge that brings it back is harmless but is removed.
(Audit F1.)

## Global Constraints

- The sim has no I/O, no wall clock and no `Math.random`. Saves never enter the sim: nothing in `sim`, `physics`,
  `commands` or `level` imports `saves` or `host`, and no stored value is read during a tick.
- Effect is never imported under `src/`. Zod is the only schema language.
- A refused or missing way of saving is an answer the game is given. It is never replaced by another way of saving,
  and never by memory that looks like a save (the spec: "it never falls back quietly").
- `saves` and `host` touch no page API at all: they run in Node. Of the page, only `src/features/web/` reads
  `localStorage`, `navigator`, `window.open` and the document's visibility (`render` and `input` keep their own
  canvas, keys and buttons, as today). (Audit F7.)
- A source file has at most 600 lines. Features import only features below them, through the entry file.
- Comments say why. Every exported name has a doc comment (the API report prints them).
- Tests run only in GitHub-hosted CI. Never run a test locally; `pnpm lint`, `pnpm typecheck`, `pnpm knip` and
  `pnpm build` are fine locally.
- No Claude attribution anywhere; commits are by `McThayDT <107786093+mcthaydt@users.noreply.github.com>`.
- Words a person reads (the README here) pass the drunk-grandma test.

## How every task is verified

As in the M1 plan: each task proves itself in the pull request's CI. Read runs with `gh run list --branch <branch>`
and `gh run view <id> --log-failed`.

- A task pushes twice. First the tests alone: `check` (or the `engines` jobs, for a browser test) must fail for the
  reason the step names. Then the implementation: every job must pass. Do not write the implementation before reading
  the red run.
- After each task: tick its boxes here, update this cycle's line in `docs/superpowers/progress.md` (each of the eight
  tasks is 12% of this stage, and the last 4% is the final green run on the whole branch), and send the coordinator
  one line: commit, test count, surprises.
- Stop rules (project): a failing check you cannot explain, a third fix for the same failure, an access refusal or a
  missing tool. Stop that task and report at once. Hand off at 90 minutes.

## Ported from the old repo

Source: AutomataFrameworkFailed at `ed8592e8`. Read, do not copy whole files: the old code is built on Ruken's
contract, which this project leaves out.

| Old file (`packages/automata/src/`) | What comes over | What does not |
|---|---|---|
| `features/saves/save.schema.ts` | The envelope idea, upgrades one version at a time, the policy below | Autosave policy, snapshots, `contentHash`, Ruken key rules |
| `shared/host/link.ts` | `isOpenableLink`, as it is | Nothing |
| `features/targets/web/hosting-web.ts` | Why a new tab's `opener` is cut by hand instead of with `noopener` | Rounds, analytics, capabilities, handshake |

The save policy, kept from the old repo because it was learned the hard way:

- A save written by a newer version of the game is never upgraded, changed or written over by itself.
- A save that cannot be read is kept as it is and shown as damaged. It is never read as empty.
- Settings are the other way round on purpose: losing a preference is acceptable, losing progress is not. A settings
  section that cannot be read starts again from its first values.

## What the other plans rely on

This section is a contract. Change it only with a note to the coordinator.

```ts
// ---- saves (headless): src/features/saves/saves.ts ----

/** Why a host would not keep or give back a value. */
export type StoreRefusal =
  | 'unavailable'   // the host is not letting the game save at all (storage blocked, private window, a locked frame)
  | 'full'          // there is no room left
  | 'failed'        // anything else; `detail` says what
export type StoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly refusal: StoreRefusal; readonly detail: string }

/** Where a host keeps a game's saved text. Every host adapter makes one; nothing else stores anything. */
export interface SaveStore {
  /** Can a value be kept right now? A title screen asks this before a player has played for five minutes. */
  check(): Promise<StoreResult<void>>
  /** `null` when nothing is stored under `key`. */
  get(key: string): Promise<StoreResult<string | null>>
  set(key: string, value: string): Promise<StoreResult<void>>
  remove(key: string): Promise<StoreResult<void>>
}

/** A store in memory, for the test host and for tests. It can be told to refuse, and shows what it holds. */
export interface MemoryStore extends SaveStore {
  /** From now on every call is refused this way; `undefined` lets calls through again. */
  refuse(refusal: StoreRefusal | undefined): void
  /** Everything stored, by key. */
  entries(): Readonly<Record<string, string>>
}
export function memoryStore(initial?: Readonly<Record<string, string>>): MemoryStore

/** A game's progress save: what it holds, and how older versions become this one. */
export interface SaveDef<S> {
  /** The game's own short id, e.g. 'crate-game': 1 to 40 of a-z, 0-9 and '-'. Never the display name, which may change. */
  readonly game: string
  /** This build's version of the data, a whole number from 1. Raise it when `schema` changes shape. */
  readonly version: number
  readonly schema: z.ZodType<S>
  /** How many slots the game has, 1 to 9. */
  readonly slots: number
  /** `upgrades[n]` turns version `n` data into version `n + 1` data. */
  readonly upgrades?: Readonly<Record<number, (data: unknown) => unknown>>
}
/** Checks `game`, `version` and `slots` and throws a `RangeError` with a plain message; otherwise returns `def`. */
export function defineSave<S>(def: SaveDef<S>): SaveDef<S>

/** Why a stored save cannot be used as it is. */
export type SaveProblem =
  | { readonly kind: 'refused'; readonly refusal: StoreRefusal; readonly detail: string }
  | { readonly kind: 'damaged'; readonly detail: string }       // not a save envelope, or data its schema refuses
  | { readonly kind: 'newer'; readonly version: number }        // written by a newer version of the game
  | { readonly kind: 'too-old'; readonly version: number }      // no upgrade from that version, or the upgrade threw

/** One slot, as a saves screen lists it. */
export type SlotState =
  | { readonly slot: number; readonly kind: 'empty' }
  | { readonly slot: number; readonly kind: 'ready'; readonly savedAt: number; readonly label?: string }
  | { readonly slot: number; readonly kind: 'damaged' | 'newer' | 'too-old'; readonly problem: SaveProblem }

export interface Saves<S> {
  check(): Promise<StoreResult<void>>
  /** Every slot, in order, read afresh from the host each time. */
  list(): Promise<StoreResult<readonly SlotState[]>>
  /** `data` is at this build's version, upgraded if it was stored older. `null` for an empty slot. */
  load(slot: number): Promise<
    | { readonly ok: true; readonly data: S | null; readonly savedAt?: number; readonly label?: string }
    | { readonly ok: false; readonly problem: SaveProblem }
  >
  /**
   * Writes the slot. A slot that is damaged, newer or too old is not written over unless `replace` is true (a saves
   * screen passes it after the player has said yes); the answer is then that slot's problem.
   */
  save(slot: number, data: S, options?: { readonly label?: string; readonly replace?: boolean }):
    Promise<{ readonly ok: true } | { readonly ok: false; readonly problem: SaveProblem }>
  erase(slot: number): Promise<StoreResult<void>>
}
export function createSaves<S>(options: {
  readonly def: SaveDef<S>
  readonly store: SaveStore
  /** Milliseconds since 1970, for the slot list only. Default `Date.now`. Never reaches the sim. */
  readonly now?: () => number
}): Saves<S>
/** The ready slot saved last, for "Continue"; `undefined` when none is ready. Ties go to the lower slot. */
export function latestSlot(states: readonly SlotState[]): number | undefined

/** One feature's part of the settings: its name, its shape and what a new player starts with. */
export interface SettingsSection<T> {
  /** 1 to 40 of a-z, 0-9 and '-', e.g. 'sound', 'controls', 'language'. */
  readonly name: string
  readonly schema: z.ZodType<T>
  readonly initial: T
}
export interface SettingsHandle<T> {
  /** Frozen (`src/lib/deep-freeze.ts`): a screen changes a setting only through `set`. */
  get(): T
  /** Keeps the value at once and writes it; writes go out in the order they were asked for. */
  set(value: T): Promise<StoreResult<void>>
  /** Called after each `set`. Returns a function that stops listening. */
  onChange(listener: (value: T) => void): () => void
}
export interface Settings {
  /** The same handle every time for the same name. A section stored in a shape its schema refuses starts at `initial`. */
  section<T>(def: SettingsSection<T>): SettingsHandle<T>
  /** Set when the settings could not be read: every section then starts at `initial`, and a screen can say so. */
  readonly problem: SaveProblem | undefined
}
/** Reads the game's settings once. Never rejects: a refusal or a damaged record is `problem`. */
export function openSettings(options: { readonly game: string; readonly store: SaveStore }): Promise<Settings>

// ---- host (headless): src/features/host/host.ts ----

export type HostTarget = 'web' | 'test'
/** 'refused': not an `https:` address, so nothing was tried. 'blocked': the host or the player said no. */
export type LinkAnswer = 'opened' | 'blocked' | 'refused'

/** What a game needs of where it runs. A game never reads `document`, `navigator` or a store's API itself. */
export interface Host {
  readonly target: HostTarget
  visible(): boolean
  onVisibility(listener: (visible: boolean) => void): () => void
  /** Where this host keeps the game's saves and settings. */
  readonly store: SaveStore
  /** The language the host itself says the player uses (a store or a desktop setting); `undefined` when it has no say. */
  language(): string | undefined
  /** The device's own languages, best first (a browser's list). May be empty. */
  deviceLanguages(): readonly string[]
  /** Opens a web page outside the game. The game is never navigated away. */
  openLink(url: string): Promise<LinkAnswer>
  /** False where there is nowhere to go back to (a web page): a screen then shows no Quit button. */
  readonly canQuit: boolean
  /** Hands the player back to wherever the game was opened from. Answers false, and does nothing, when `canQuit` is false. */
  quit(): Promise<boolean>
}
export function isOpenableLink(url: string): boolean

export interface TestHostOptions {
  readonly visible?: boolean                      // default true
  readonly store?: SaveStore                      // default memoryStore()
  readonly language?: string                      // default undefined
  readonly deviceLanguages?: readonly string[]    // default []
  readonly canQuit?: boolean                      // default false
  readonly blockLinks?: boolean                   // default false: an https link answers 'opened'
}
export interface TestHost extends Host {
  readonly target: 'test'
  show(): void
  hide(): void
  /** Every address `openLink` opened, in order. */
  readonly opened: readonly string[]
  /** How many times `quit` handed the player back. */
  readonly quits: number
}
export function testHost(options?: TestHostOptions): TestHost

// ---- web (page only): src/features/web/web.ts ----

/** What the web host reads of the page. Only for tests; a game passes nothing. */
export interface WebSeams {
  readonly document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>
  readonly navigator: Pick<Navigator, 'language' | 'languages'>
  /** `window.open`. `null` means the browser blocked the new tab. */
  readonly open: (url: string, target: string) => { opener: unknown } | null
  /** Gives the page's `localStorage`. May throw: a browser can refuse even to hand it over. */
  readonly storage: () => Storage
}
export function webHost(seams?: Partial<WebSeams>): Host
```

Facts the other plans may rely on:

- **Stored keys:** slot `n` of game `g` is `automata.<g>.save.<n>`; the settings are `automata.<g>.settings`. The web
  host stores them in `localStorage` under exactly those names.
- **Stored forms** (canonical JSON from `src/lib/canonical.ts`, so the same save is the same bytes in every engine):
  a slot is `{"data":…,"format":1,"label":…,"savedAt":…,"version":…}` (`label` only when given); the settings are
  `{"format":1,"sections":{"<name>":…}}`. A section this build does not know is kept and written back untouched.
- **`webHost()` with no argument still works**, and `Host.target`, `visible` and `onVisibility` are unchanged, so a
  game that calls `webHost()` needs no change. A game or test that built a `Host` by hand must add the new members,
  or use `testHost()`. `webHost(doc)` (a test seam) becomes `webHost({ document: doc })`.
- **Both entries export `saves` and `host`** (`@automataframework/framework/headless` too); only the browser entry
  exports `webHost`.
- **Both entries export `z`**, the framework's own Zod, so a game writes its save's schema (and later its commands'
  and settings' schemas) without a Zod of its own. AutomataFrameworkExamples may import nothing but the framework's
  two entries (its `tests/architecture.test.ts`), so without this the demo could not call `defineSave`; and one Zod
  means a game's schemas are never checked by a second copy. (Audit F2.)
- **Plan L** picks the language as: the `language` settings section, then `host.language()`, then
  `host.deviceLanguages()`, then English. On the web `host.language()` is `undefined`.
- **Settings sections' names** are kept for their plans: `controls` (plan I: `InputSettingsSchema`,
  `INPUT_SETTINGS_DEFAULT`, as plan I says), `sound` (plan S) and `language` (plan L). Plan U wires each into
  `settings.section(...)`. (Audit F3.)
- **Plan U** shows `StoreRefusal` and `SaveProblem` in plain words in all six languages, hides Quit when
  `host.canQuit` is false, calls `saves.check()` on the title screen and says so there if saving is refused, and
  asks before passing `replace: true`.
- **Plan D's step for V** (Examples): the demo saves when a level is finished and "Continue" opens the level reached;
  its journey reloads the built page for real and continues, at phone, tablet and desktop sizes in three browsers.
  Moving the pin past this plan also changes Examples' `tests/features/play/play.browser.test.ts`, whose hand-made
  `Host` lacks the new members: it becomes `testHost()`. (Audit F9.)

## File structure

```
src/features/saves/saves.ts      the entry: re-exports the files below
src/features/saves/store.ts      SaveStore, StoreResult, StoreRefusal, memoryStore
src/features/saves/envelope.ts   the stored form of a slot: write it, read it back, say why it cannot be read
src/features/saves/define.ts     SaveDef, defineSave, keys, upgrading stored data to this build's version
src/features/saves/slots.ts      createSaves, SlotState, latestSlot
src/features/saves/settings.ts   openSettings and its sections
src/features/host/host.ts        the entry: the Host port (grown), re-exports link.ts and test.ts
src/features/host/link.ts        isOpenableLink
src/features/host/test.ts        testHost
src/features/web/web.ts          the entry: webHost (moved from host/web.ts) and its seams
src/features/web/storage.ts      a SaveStore over the browser's localStorage
tests/features/saves/            store, envelope (parity), define, slots, settings
tests/features/host/             link, test host
tests/features/web/              web host (moved), storage, and the fresh-page journey
tests/fixtures/saves/            the fixture game's save definition and the page the journey opens
```

`LAYERS` becomes `sim, physics, commands, content, level, render, input, saves, host, web, game`. `saves` sits below
`host` because the host carries a `SaveStore`, a type `saves` owns: the host implements the port, it does not define
it. `PAGE_FEATURES` becomes `render, input, web, game`: `host` leaves it, because the port and the test host must
run in Node.

## Review Focus

The inputs the spec implies and a player will meet, most likely first. Each has its test in the task named.

1. **The browser will not let the page store anything** (a private window, storage blocked, a locked-down frame).
   Expected: `check`, `get` and `set` answer `unavailable`; nothing is kept in memory as if it were saved. Task 5.
2. **Stored text that is not ours or is broken** (hand-edited, cut short, another program's value under our key).
   Expected: the slot lists as `damaged`, the text stays exactly as it was, and `save` does not write over it
   without `replace`. Tasks 2 and 3.
3. **The page is closed straight after a save** (the player taps the door and closes the tab). Expected: the save is
   there on the next page, even though nothing waited for `save` to finish. Task 7.
4. **Storage fills up during a save.** Expected: `full`, and the save that was in the slot before is still whole.
   Task 5.
5. **Two settings changes in quick succession** (a volume slider being dragged). Expected: the last value is the one
   stored, whatever order the writes finish in. Task 4.

---

### Task 1: The storage port and a store in memory

**Files:**
- Create: `src/features/saves/saves.ts`, `src/features/saves/store.ts`
- Modify: `tests/architecture/rules.ts` (`LAYERS`: add `'saves'` after `'input'`)
- Test: `tests/features/saves/store.test.ts`, `tests/architecture/rules.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `StoreRefusal`, `StoreResult`, `SaveStore`, `MemoryStore`, `memoryStore` (the contract above).

- [x] **Step 1: Write the failing tests.** `store.test.ts`:

```ts
test('a value set is the value got, and a key never set is null', ...)
test('remove makes a key null again, and removing a missing key is fine', ...)
test('check says yes', ...)                                 // { ok: true, value: undefined }
test('initial values are there from the start', ...)        // memoryStore({ a: '1' }) -> get('a') is '1'
test('told to refuse, every call answers that refusal and nothing changes', ...)
  // refuse('full'); set('a','2') -> { ok: false, refusal: 'full', detail: 'The test store was told to refuse.' };
  // entries() still has the old value; refuse(undefined) lets calls through again
test('entries is a copy: changing it changes nothing', ...)
```

  `rules.test.ts`, one more case: `saves` may import nothing above it
  (`{ 'src/features/saves/saves.ts': "import '../host/host.ts'" }` gives `['imports-go-down']`).

- [x] **Step 2: Push; `check` fails** because `store.ts` does not exist and `saves` is an unknown feature.
- [x] **Step 3: Implement** `store.ts` and the entry, and add the layer.
- [x] **Step 4: Push; all jobs pass.**
- [x] **Step 5: Commit** (`feat(saves): the storage port and a store in memory`).

### Task 2: The stored form of a save, and upgrading it

**Files:**
- Create: `src/features/saves/envelope.ts`, `src/features/saves/define.ts`
- Modify: `src/features/saves/saves.ts`
- Test: `tests/features/saves/envelope.parity.test.ts`, `tests/features/saves/define.test.ts`
- Create: `tests/fixtures/saves/progress.ts`

**Interfaces:**
- Consumes: `canonicalJson` from `src/lib/canonical.ts`.
- Produces: `SaveDef`, `defineSave`, `SaveProblem` (the contract above), and inside the feature only:

```ts
/** What is stored for one slot. */
export interface Envelope {
  readonly format: 1
  readonly version: number
  readonly savedAt: number
  readonly label?: string
  readonly data: unknown
}
export function writeEnvelope(envelope: Envelope): string
/** Checks the shape only, never the data. `label` is 1 to 80 characters. */
export function readEnvelope(text: string): { readonly ok: true; readonly envelope: Envelope } | { readonly ok: false; readonly detail: string }
export function slotKey(def: SaveDef<unknown>, slot: number): string      // 'automata.<game>.save.<slot>'; RangeError if slot is not a whole number from 0 to def.slots - 1
export function settingsKey(game: string): string                        // 'automata.<game>.settings'; RangeError on a bad game id
/** Brings a read envelope to this build's version and checks it against the schema. */
export function upgrade<S>(def: SaveDef<S>, envelope: Envelope): { readonly ok: true; readonly data: S } | { readonly ok: false; readonly problem: SaveProblem }
```

  The fixture `tests/fixtures/saves/progress.ts` is the fixture game's save, used by every later task:

```ts
/** Version 1 stored `{ level }`; version 2 adds how many doors the player has been through. */
export const progress = defineSave({
  game: 'fixture-game',
  version: 2,
  slots: 3,
  schema: z.strictObject({ level: z.string(), doors: z.number().int().min(0) }),
  upgrades: { 1: (data) => ({ ...(data as { level: string }), doors: 0 }) },
})
```

- [x] **Step 1: Write the failing tests.** `envelope.parity.test.ts` (Node and the three browsers, so the bytes are
  proven the same everywhere):

```ts
test('a save is written as canonical JSON', () => {
  expect(writeEnvelope({ format: 1, version: 2, savedAt: 1700000000000, data: { level: 'level-2', doors: 1 } }))
    .toBe('{"data":{"doors":1,"level":"level-2"},"format":1,"savedAt":1700000000000,"version":2}')
})
test('a label is written when there is one', ...)   // '..."format":1,"label":"Level 2","savedAt":...'
test('what is written reads back the same', ...)
test('text that is not a save says why', ...)
  // '' and '{' -> 'This is not JSON.'; '[]' and '7' -> 'This is not a save.'; format 2 -> 'This save is in a format this game does not know (2).';
  // version 0, 1.5 or missing -> 'This save has no version.'; savedAt missing or not a number -> 'This save has no date.';
  // data missing -> 'This save has nothing in it.'; label 81 characters or a number -> 'This save has a label that cannot be read.'
```

  `define.test.ts`:

```ts
test('defineSave gives back a good definition', ...)
test('defineSave refuses a bad game id, version or slot count, in plain words', ...)
  // game 'Crate Game' -> RangeError 'A save\'s game id is 1 to 40 of a-z, 0-9 and "-", like "crate-game". Got "Crate Game".'
  // version 0 or 1.5 -> 'A save\'s version is a whole number from 1. Got 0.'; slots 0 or 10 -> 'A save has 1 to 9 slots. Got 0.'
test('keys', ...)   // slotKey(progress, 0) 'automata.fixture-game.save.0'; slotKey(progress, 3) throws; settingsKey('fixture-game')
test('data at this version passes straight through the schema', ...)
test('older data is upgraded one version at a time', ...)       // version 1 { level: 'level-1' } -> { level: 'level-1', doors: 0 }
test('a newer save is never touched', ...)                       // version 3 -> { kind: 'newer', version: 3 }
test('no upgrade from that version is too-old', ...)             // a def at version 3 with only upgrades[1] and a version 2 save
test('an upgrade that throws is too-old, not a crash', ...)
test('data the schema refuses is damaged', ...)                  // { level: 7 } -> { kind: 'damaged', detail: 'This save does not hold what this game saves.' }
test('an upgrade is not given the stored object itself', ...)    // the upgrade mutates its argument; the envelope's data is unchanged
```

- [x] **Step 2: Push; `check` fails** because neither file exists.
- [x] **Step 3: Implement.** `upgrade` clones the data with `structuredClone` before the first step.
- [x] **Step 4: Push; all jobs pass.**
- [x] **Step 5: Commit** (`feat(saves): a versioned save envelope and its upgrades`).

### Task 3: Save slots

**Files:**
- Create: `src/features/saves/slots.ts`
- Modify: `src/features/saves/saves.ts`
- Test: `tests/features/saves/slots.test.ts`

**Interfaces:**
- Consumes: Task 1's `SaveStore` and `memoryStore`; Task 2's `SaveDef`, `slotKey`, `writeEnvelope`, `readEnvelope`,
  `upgrade`, and the `progress` fixture.
- Produces: `Saves`, `SlotState`, `createSaves`, `latestSlot` (the contract above).

- [x] **Step 1: Write the failing tests.** Every test builds `createSaves({ def: progress, store: memoryStore(), now })`
  with `now` counting up from `1700000000000` by 1000 each call.

```ts
test('a new game lists three empty slots, in order', ...)
test('a saved slot lists as ready with its date and label, and loads back', ...)
test('save writes exactly the canonical envelope under the slot key', ...)
  // store.entries()['automata.fixture-game.save.1'] is the Task 2 string
test('an empty slot loads as null, not as a problem', ...)        // { ok: true, data: null }
test('a version 1 save lists as ready and loads upgraded; the stored text is not changed by loading', ...)
test('a newer, a too-old and a damaged slot each list with their problem and do not load', ...)
test('save does not write over a damaged, newer or too-old slot', ...)
  // answers { ok: false, problem } with that slot's problem, and the stored text is byte for byte what it was
test('with replace, save writes over it', ...)
test('erase empties a slot, whatever was in it', ...)
test('list reads the host afresh each time', ...)                  // a value put in the store behind its back shows on the next list
test('a refused store: list, load, save and erase all say so', ...)
  // store.refuse('unavailable') -> list { ok: false, refusal: 'unavailable', ... }; load and save { ok: false, problem: { kind: 'refused', refusal: 'unavailable', ... } }
test('a slot number that is not one of the slots throws', ...)     // load(3), save(-1, ...), erase(1.5): RangeError 'This game has slots 0 to 2. Got 3.'
test('data that is not what the game saves throws before anything is written', ...)   // save(0, { level: 7 } as never)
test('data JSON cannot keep throws in plain words before anything is written', ...)   // Audit F5
  // a def whose schema allows it: { level: 'a', at: new Date() } or doors NaN -> RangeError
  // whose message starts 'A save holds plain data only (text, numbers, true or false, lists and objects).' and
  // ends with canonicalJson's own words ('unsupported Date; ...')
test('save finishes without waiting on a timer, an event or a frame', ...)   // Audit F4
  // vi.useFakeTimers() and never advance them: await saves.save(0, data) resolves and the store holds it
test('latestSlot picks the ready slot saved last', ...)            // none ready -> undefined; a tie -> the lower slot
```

- [x] **Step 2: Push; `check` fails** because `slots.ts` does not exist.
- [x] **Step 3: Implement.** `save` parses `data` with the schema first, writes the envelope's text (so a value
  `canonicalJson` refuses throws here, as a `RangeError`, before the store is touched), then reads the slot to decide
  whether it may write, then writes. No step waits on anything but the store.
- [x] **Step 4: Push; all jobs pass.**
- [x] **Step 5: Commit** (`feat(saves): save slots that never lose a save by themselves`).

### Task 4: Settings

**Files:**
- Create: `src/features/saves/settings.ts`
- Modify: `src/features/saves/saves.ts`
- Test: `tests/features/saves/settings.test.ts`

**Interfaces:**
- Consumes: `SaveStore`, `memoryStore`, `settingsKey`, `canonicalJson`, `SaveProblem`.
- Produces: `SettingsSection`, `SettingsHandle`, `Settings`, `openSettings` (the contract above).

- [x] **Step 1: Write the failing tests.** The section used throughout:
  `const sound = { name: 'sound', schema: z.strictObject({ music: z.number().min(0).max(1) }), initial: { music: 0.8 } }`.

```ts
test('a new player gets each section\'s first values, and nothing is written until something is set', ...)
test('a set value is there at once, is stored, and is there the next time the settings are opened', ...)
  // store.entries()['automata.fixture-game.settings'] is '{"format":1,"sections":{"sound":{"music":0.5}}}'
test('the same name gives the same handle', ...)
test('listeners hear each set, and not after they stop listening', ...)
test('setting one section keeps the others, known or not', ...)
  // stored with a "controls" section this test never registers: after sound.set it is still in the stored text, untouched
test('a section stored in a shape its schema refuses starts again from its first values', ...)    // {"music":"loud"} -> 0.8, problem undefined
test('settings that cannot be read: every section starts from its first values, and problem says why', ...)
  // stored 'not json' -> problem { kind: 'damaged', ... }; store.refuse('unavailable') before opening -> problem { kind: 'refused', refusal: 'unavailable', ... }
test('a refused write says so, and the value is still the one set', ...)   // the player hears the new volume now; the screen says it was not kept
test('two sets in a row leave the second one stored', ...)                 // Review Focus 5
  // a store whose first set resolves after its second: void handle.set(a); await handle.set(b); the stored value is b
test('a value its schema refuses throws and changes nothing', ...)
test('a value JSON cannot keep throws and changes nothing', ...)          // Audit F5: the RangeError of Task 3
test('get gives a frozen value', ...)                                      // Audit F10
test('a bad section name throws', ...)                                     // 'Sound FX' -> RangeError naming the rule
```

- [x] **Step 2: Push; `check` fails** because `settings.ts` does not exist.
- [x] **Step 3: Implement.** One write at a time: each `set` chains its write on the one before, and each write
  serialises the settings as they are when it starts. Settings damaged on open are written over by the first `set`
  (losing a preference is acceptable).
- [x] **Step 4: Push; all jobs pass.**
- [x] **Step 5: Commit** (`feat(saves): one settings record, a section per feature`).

### Task 5: The `web` feature, and saving in the browser

**Files:**
- Create: `src/features/web/web.ts` (the body of `src/features/host/web.ts`, moved), `src/features/web/storage.ts`
- Delete: `src/features/host/web.ts`
- Modify: `src/features/host/host.ts` (stops re-exporting `webHost`), `src/index.ts` (adds
  `export * from './features/web/web.ts'`), `tests/architecture/rules.ts` (`LAYERS`: `'web'` after `'host'`;
  `PAGE_FEATURES`: `'web'` in, `'host'` out), `README.md` only if it names the old path (it does not today)
- Move: `tests/features/host/web.browser.test.ts` to `tests/features/web/web.browser.test.ts`
- Test: `tests/features/web/storage.browser.test.ts`, `tests/architecture/rules.test.ts`

**Interfaces:**
- Consumes: `SaveStore`, `StoreResult`.
- Produces: `webHost(doc?: Document): Host`, unchanged for now (Task 6 changes its argument), and inside the feature:

```ts
/** A SaveStore over a page's localStorage. `storage` is called afresh for each call, and may throw. */
export function webStore(storage: () => Storage): SaveStore
```

  Every `webStore` method does its work before it returns its promise (there is no `await` before the storage
  call), so a save asked for as the page closes is already kept. How a browser's "no" maps:
  `storage()` throwing, or a `DOMException` named `SecurityError`, is `unavailable`; a `DOMException` named
  `QuotaExceededError` (or Firefox's `NS_ERROR_DOM_QUOTA_REACHED`) is `full`; anything else is `failed`. `detail` is
  the error's own message. `check` sets and then removes the key `automata.check`.

- [x] **Step 1: Write the failing tests.** `storage.browser.test.ts`, against the real `localStorage` of each browser
  unless a test says otherwise (each test clears the keys it used). Test files can run at the same time in one
  browser and share its `localStorage`, so this file's keys start `automata.web-storage-test.` and no test here reads
  a key another file writes (Audit F6):

```ts
test('a value set is in the real localStorage under that key, and comes back', ...)
test('a key never set is null; remove makes it null again', ...)
test('check says yes, and leaves nothing behind', ...)
  // over a Storage that passes each call to the real localStorage and records it: setItem('automata.check', ...)
  // then removeItem('automata.check'). (Reading the real key back would race Task 7's pages, which call check too.)
test('the write is done before the promise is', ...)
  // const pending = store.set('automata.web-storage-test.a', '1'); expect(localStorage.getItem(...)).toBe('1'); await pending
test('a browser that will not hand over its storage: every call answers unavailable', ...)   // Review Focus 1
  // webStore(() => { throw new DOMException('The operation is insecure.', 'SecurityError') })
test('nothing is kept when the browser refuses', ...)                     // after a refused set, get is refused too: no memory copy
test('a full storage answers full, and what was there before is still there', ...)           // Review Focus 4
  // a Storage whose setItem throws DOMException('...', 'QuotaExceededError') over a real stored value
test('any other error answers failed with the error\'s words', ...)
```

  `rules.test.ts`: headless may now reach `host` but not `web`
  (`{ 'src/headless.ts': "export * from './features/web/web.ts'" }` gives `['headless-is-headless']`; the same with
  `host/host.ts` gives `[]`).

- [x] **Step 2: Push; the `engines` jobs fail** because `storage.ts` does not exist, and `check` fails on the two
  rules.
- [x] **Step 3: Implement** the move, the rules and `webStore`.
- [x] **Step 4: Push; all jobs pass**, the moved web host tests among them.
- [x] **Step 5: Commit** (`feat(web): the web host is its own feature and saves in the browser`).

### Task 6: The host port grows, and a host for tests

**Files:**
- Create: `src/features/host/link.ts`, `src/features/host/test.ts`
- Modify: `src/features/host/host.ts`, `src/features/web/web.ts`, `src/headless.ts` (adds
  `export * from './features/host/host.ts'`, `export * from './features/saves/saves.ts'` and, after the `no-eval`
  import, `export { z } from 'zod'` with a comment saying why (Audit F2); update its first comment line), `src/index.ts` (drops its own `host` line, which headless now carries; update its comment)
- Modify tests: `tests/features/game/game.browser.test.ts`, `layout.browser.test.ts`, `watch.browser.test.ts` (each
  hand-made host becomes `testHost()`), `tests/features/web/web.browser.test.ts` (`webHost(doc)` becomes
  `webHost({ document: doc })`)
- Test: `tests/features/host/link.test.ts`, `tests/features/host/test-host.test.ts`,
  `tests/features/web/web.browser.test.ts`

**Interfaces:**
- Consumes: `SaveStore`, `memoryStore`, `webStore`.
- Produces: `HostTarget`, `LinkAnswer`, `Host` (grown), `isOpenableLink`, `TestHostOptions`, `TestHost`, `testHost`,
  `WebSeams`, `webHost(seams?)` (the contract above).

  `isOpenableLink` is the old repo's, as it was: at most 2048 characters, parses as a URL, `https:`, a host name, no
  user name and no password. The web host's `openLink`: not openable answers `'refused'` and opens nothing;
  otherwise it calls `open(url, '_blank')`, answers `'blocked'` on `null`, and on a tab sets `tab.opener = null` and
  answers `'opened'`. (`noopener` in the features string would make `open` return `null` even when the tab opened, so
  a blocked popup could not be told from an open one.) On the web `language()` is `undefined`, `deviceLanguages()` is
  `navigator.languages`, or `[navigator.language]` when that list is empty, `canQuit` is `false` and `quit()` answers
  `false`. `store` is `webStore(storage)`.

- [x] **Step 1: Write the failing tests.** `link.test.ts`:

```ts
test('an https address can be opened', ...)          // 'https://example.com/a?b=c'
test('nothing else can', ...)
  // 'http://example.com', 'javascript:alert(1)', 'data:text/html,x', 'example.com', '', 'https://', 'https://name:word@example.com',
  // and an https address of 2049 characters
```

  `test-host.test.ts` (Node):

```ts
test('it says it is the test host, on screen, with no language, no quit and a store in memory', ...)
test('show and hide are heard by listeners, and not after they stop listening', ...)
test('the options are what it answers with', ...)    // visible false, language 'ko', deviceLanguages ['pt-BR', 'en'], canQuit true
test('its saves keep what they are given; a store passed in is the one used', ...)
test('an https link is opened and remembered; anything else is refused and not remembered', ...)
test('told to block links, it answers blocked', ...)
test('quit counts when it can quit, and answers false when it cannot', ...)
test('a game runs on it', ...)                       // createSaves({ def: progress, store: testHost().store }): save then load
```

  `web.browser.test.ts`, added to the moved tests, each with made-up seams:

```ts
test('it has no language of its own, and gives the browser\'s list', ...)       // languages ['es-MX', 'en'] -> the same
test('with an empty list it gives the browser\'s one language', ...)
test('an https link opens in a new tab and the tab cannot reach back', ...)     // open called with (url, '_blank'); opener set to null; 'opened'
test('a blocked tab answers blocked; an address that is not https opens nothing', ...)
test('there is nowhere to quit to', ...)                                        // canQuit false; quit() false
test('its saves are the browser\'s storage', ...)                               // set through host.store, read from the seam's Storage
test('with no seams it reads the real page', ...)                               // webHost(): visible() is a boolean, deviceLanguages() is an array
```

- [x] **Step 2: Push; `check` fails** because `link.ts` and `test.ts` do not exist, and typecheck fails on the
  tests' new calls.
- [x] **Step 3: Implement.** Replace the three test files' hand-made hosts with `testHost()` in the same push; they
  no longer typecheck otherwise.
- [x] **Step 4: Push; all jobs pass.**
- [x] **Step 5: Commit** (`feat(host): the port carries saves, language, links and quit; a host for tests`).

### Task 7: End to end: a save outlives its page

**Files:**
- Create: `tests/fixtures/saves/page.ts` (what one page of the fixture game does), `tests/fixtures/saves/open-page.ts`
  (opens a fresh page in a frame)
- Test: `tests/features/web/continue.browser.test.ts`

**Interfaces:**
- Consumes: `startGame`, `webHost`, `createSaves`, `latestSlot`, `openSettings`, the `progress` fixture, the fixture
  game (`loadFixtureGame`, `heroPlugin`, `fixtureControls`, `manualFrames`).
- Produces: nothing a later task uses.

  This is the plan's journey, in real Chromium, WebKit and Firefox, with the real `webHost()` and the browser's real
  `localStorage`. A "page" is a new same-origin `<iframe>`: a new document has its own module instances and its own
  memory, so nothing carries from one page to the next except what the browser stored. That is what a reload is to a
  game. (The reload of the built demo in a real tab is plan D's journey; this one proves the framework's part.)

```ts
// tests/fixtures/saves/page.ts (open-page.ts imports this type from it, which also tells knip the file is used)
/** What the test can ask of one page of the fixture game. Every method runs inside that page. */
export interface SavesPage {
  /** What the title screen would know: can it save, the slot list, the slot "Continue" opens. */
  title(): Promise<{ canSave: boolean; slots: readonly SlotState[]; latest: number | undefined }>
  /** Starts the game at `level` (default the project's start), runs `ticks` ticks, and returns the sim's hash. */
  play(ticks: number, level?: string): Promise<string>
  /** Saves `data` to `slot`. With `wait: false` it returns as soon as `save` has been called, not when it answers. */
  save(slot: number, data: { level: string; doors: number }, options?: { wait?: boolean }): Promise<void>
  load(slot: number): Promise<{ level: string; doors: number } | null>
  setMusic(volume: number): Promise<void>
  music(): Promise<number>
}
// tests/fixtures/saves/open-page.ts
/** Opens a fresh page (frame) of `size`, loads `page.ts` in it, and returns its handle and a `close` that removes it. */
export function openPage(size?: { width: number; height: number }): Promise<{ page: SavesPage; close(): void }>
```

  `page.ts` is loaded in the frame by a module script the opener writes (`import('/tests/fixtures/saves/page.ts')`),
  builds everything from `webHost()` with no seams, and puts its `SavesPage` on the frame's `window` for the opener to
  read. The canvas mounts in the frame's own body.

  Why "a save made as the page closes" yields one task before closing (Audit F4): a player closing a tab is a later
  task than the tap that saved, and a browser runs every promise step of the earlier task first. Removing a frame in
  the middle of those steps is not something a player can do, and browsers skip the promise steps of a removed
  frame, so closing with no yield would pass or fail on how many `await`s `save` has. Task 3's fake-timer test proves
  the other half: no step of a save waits on a timer, an event or a frame.

- [ ] **Step 1: Write the failing test.** `beforeEach` and `afterEach` remove every `localStorage` key starting
  `automata.fixture-game.`.

```ts
test('a first-time player has three empty slots, can save, and has nothing to continue', ...)
test('play, save, close the page: a new page continues from the save', async () => {
  // page A: play(120); save(0, { level: 'level-1', doors: 1 }); close
  // page B: title() -> canSave true, slots[0] ready, latest 0; load(0) -> { level: 'level-1', doors: 1 };
  //         play(120, 'level-1') -> the same hash page A's play gave (the save changed nothing in the sim)
})
test('a save made as the page closes is kept', ...)                 // Review Focus 3
  // page A: save(1, ..., { wait: false }); the opener yields one task (a MessageChannel message), then closes.
  // page B: load(1) is the data
test('the music volume set on one page is the volume on the next', ...)   // setMusic(0.25); close; new page: music() is 0.25
test('a save from the game\'s last version is upgraded on the next page', ...)
  // the test writes a version 1 envelope into localStorage itself; page: slots[0] ready; load(0) has doors 0
test('a save broken by hand lists as damaged and is still there, untouched, after a page that tried to play', ...)   // Review Focus 2
  // localStorage has '{"oops' under slot 2; page: slots[2] damaged, latest undefined; save(2, ...) leaves the text as it was
test('two pages open at once see each other\'s saves', ...)         // page A saves slot 0 while page B is open; B's next title() lists it ready
test.each([[390, 844], [844, 390], [820, 1180], [1180, 820], [1280, 720]])('at %i by %i the game plays and saves', ...)
  // phone, tablet and desktop, upright and sideways: play(60) returns a hash, save then load round-trips
```

- [ ] **Step 2: Push; the `engines` jobs fail** because the fixtures do not exist.
- [ ] **Step 3: Implement the two fixtures.** If a browser's test server will not serve `page.ts` to the frame, or a
  frame cannot be made same-origin, stop and report: do not swap the frame for a second `webHost()` in the same page,
  which would prove less.
- [ ] **Step 4: Push; all three `engines` jobs pass.** If "a save made as the page closes" fails in one engine, stop
  and report with the engine's name: it is a finding about that browser, not a test to loosen.
- [ ] **Step 5: Commit** (`test(web): a save outlives the page that made it, in three browsers`).

### Task 8: The public surface, the packed package and the README

**Files:**
- Modify: `tests/public-surface.test.ts`, `tests/install/smoke.mjs`, `tests/install/consumer.ts`,
  `tests/docs/readme.test.ts`, `README.md`, `docs/api/framework.api.md` (generated), `CLAUDE.md` (nothing in its
  Structure block names a feature list today; leave it unless that has changed)
- Test: the same files; CI's `package` job

**Interfaces:**
- Consumes: everything above.
- Produces: the package other repos install.

- [ ] **Step 1: Write the failing tests.**
  - `public-surface.test.ts`: the headless list gains `'memoryStore'`, `'defineSave'`, `'createSaves'`,
    `'latestSlot'`, `'openSettings'`, `'testHost'`, `'isOpenableLink'`, `'z'`; a new test,
    `'the browser entry adds the web host, and headless does not have it'`, asserts `#src/headless.ts` has no
    `webHost` and that the text of `src/index.ts` exports `./features/web/web.ts` (the entry itself needs a page, so
    a Node test reads it instead of importing it).
  - `tests/install/smoke.mjs`, after the hash check: with `z`, `testHost`, `defineSave`, `createSaves` and
    `openSettings` from `@automataframework/framework/headless` (never from `zod`, which npm's flat folder would let
    it import and so prove nothing), save `{ level: 'level-1' }` to slot 0 of a one-slot save for game
    `smoke`, load it back, and exit non-zero unless it is equal and the host's store holds the key
    `automata.smoke.save.0`. It prints `The installed package saved and loaded a game in Node.`
  - `tests/install/consumer.ts`: the `used` tuple gains `webHost`, `testHost`, `createSaves` and `openSettings`, a
    line that types a hand-written `Host` (`const _host: Host = testHost()`), and a `defineSave` whose schema is
    built with the package's `z`, so the declarations resolve from the tarball.
  - `readme.test.ts`: the README names every `StoreRefusal` (`unavailable`, `full`, `failed`) and both stored key
    patterns (`automata.<game>.save.<slot>`, `automata.<game>.settings`), and its saves example uses only names the
    headless entry exports (`z`, `defineSave`, `createSaves`, `openSettings`, `latestSlot`).
- [ ] **Step 2: Push; `check` and `package` fail** on the new assertions.
- [ ] **Step 3: Write the README** and run `pnpm api-report --update`. Two new sections after "Watch a recorded
  play", and one line changed in "Without a page" (it now lists saves and the host port too):

  **"## Saves"**: a save definition (`z` and `defineSave` imported from the framework, with a game id, a version, a
  schema, slots and one upgrade), then
  `createSaves({ def, store: host.store })`, `list`, `latestSlot` for "Continue", `save` and `load`; then settings
  (`openSettings`, one section, `get` and `set`). In plain words, in this order: where saves go ("On the web, saves
  are kept in this browser, under `automata.<game>.save.<slot>` and `automata.<game>.settings`. Clearing the
  browser's data removes them, and a browser can clear its own storage."); what happens when the browser says no
  ("The game is told, with one of `unavailable`, `full` or `failed`, and nothing is kept anywhere else. Tell the
  player."); and the three rules ("A save from a newer version of your game is never changed. A save that cannot be
  read is kept and listed as damaged. Raise `version` and add an upgrade when you change what a save holds.").

  **"## The host"**: the game asks its host, never the page: `visible`, `store`, `language` and `deviceLanguages`,
  `openLink` (only `https:`), `canQuit` and `quit`. `webHost()` for a page; `testHost()` for Node and for tests, with
  a short example that hides it and reads what it opened.

- [ ] **Step 4: Push; all jobs pass**, `package` among them. Read the diff of `docs/api/framework.api.md`: it must
  add only the names in "What the other plans rely on" (`z` among them) and move `webHost`'s argument. Anything else is a stop.
- [ ] **Step 5: Commit** (`feat: saves and the host port on the public surface`), update the tracker to 100% for
  this stage, and send the coordinator the summary: the eight commits, the test count, every deviation, and the
  contract section's link for plans L, U, I, S and D.

## Self-review

- **Spec coverage.** "Save slots for progress and one for settings, through the host port": Tasks 3, 4 and 6. "The web
  host keeps them in the browser's storage as its declared way of saving, and says so when the browser refuses; it
  never falls back quietly": Task 5, with Task 7 on the real storage. "A save holds a version, and a game that loads
  an older one upgrades it or says it can't": Task 2 (`too-old`, `newer`), Task 3. "The host port grows ... to saves,
  the language, links and quit. Adapters: `web` and a `test` host for Node and journeys": Tasks 5 and 6. "Every plan
  has end-to-end tests": Task 7 in three browsers at five sizes, Task 8 through the packed package in Node. "Each
  [built-in] is in the framework and used through the published package": Task 8.
- **Left to other plans, on purpose:** the words and screens (L, U), the settings' contents (I, S, L), the demo and
  its real-reload journey (D). Each is named in "What the other plans rely on".
- **One deviation from the spec's test line.** The spec asks every plan for journeys "at phone, tablet and desktop
  sizes". This plan draws nothing, so sizes cannot change what it does; Task 7 still runs the game and a save at
  each size, so a size that broke the page would be seen.
