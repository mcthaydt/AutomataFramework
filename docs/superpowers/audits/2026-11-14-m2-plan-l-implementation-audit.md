# M2 plan L (languages): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-languages.md`](../plans/2026-11-14-m2-languages.md) as
merged in PR 73 (Task 1), PR 76 (Tasks 2 to 11) and PR 82 (Task 12, Paraglide), against that plan, its
[plan audit](2026-11-14-m2-languages-plan-audit.md) (PR 72), the [M2 spec](../specs/2026-11-14-m2-design.md)
("Languages (plan L)", the `messages` row, the showcase's Languages row and journey), the first spec's layer 10, and
`main` at `735e2e3`. Written 2026-11-14.

**Verdict:** the build is sound. Every task is there, and the plan audit's findings are in the code. C1:
`simContent` drops both the maps and the `project.content` entries, now for words, sounds and art. I1 and I3:
`controls.<action>` and `Touch.relabel`. I2: the Spanish is Latin American. M1: `_` and `.UTF-8` in tags. M2: a
listener that throws. M4 to M6 are in too, and so are J1 to J3. No golden moved and no schema changed.

No critical fault was found. Three important ones were, all of them integrations left half done. First, the sound's
"Tap to start the sound" stayed English, though plan L was built after plan S and the plan gave that key to whichever
came second. Second, a refused change of key (plan I's `rebind`) is a sentence a player reads, and it stayed English
in a feature below `locale`. Third, Paraglide's two packages were installed into every game, though nothing a game
installs can load them. Four minor faults are fixed, and seven rulings are accepted. One new Owner direction (English
must not be the default) is reported and has its own spec. All fixes are in this pull request, tests first.

How it was checked: the plan, its audit and the merged code were read. That covers every file in
`src/features/locale/`, `src/lib/message.ts`, `content/translations.ts`, `content/read-marks.ts`,
`level/sim-content.ts`, `net/words.ts`, `input/touch.ts`, `input/input.ts`, `input/bindings.ts`, `web/lang.ts`,
`web/notice.ts`, `game/game.ts`, `game/online.ts`, `game/players.ts` and `cli/words.ts`, plus `package.json`,
`vite.config.ts`, `knip.json`, the README's Languages and Sound sections, the API report, the library tests, the
language page fixture and the three language journeys. Every `'en'`, "English" and player-facing sentence under `src/`
was searched for. Nothing was run locally; the tests were run in the pull request's CI.

## Important

**I1. The sound's button stayed English.** `soundNotice` says "Tap to start the sound", typed in `web/notice.ts`,
and neither `startGame` nor `startOnlineGame` gave it the locale. The plan's handoff says "whichever is second" of
plans S and L adds `automata.sound.start` and passes the player's words. Plan S was on `main` when plan L was built,
so plan L was second. A Korean player saw Korean touch buttons and an English sound button above them. Fixed:
`automata.sound.start` is in the six library files. `soundNotice` takes a `locale` (only its `words` and `onChange`),
says the key in its words, and says it again when the language changes. Words a game gives as a string still win.
Both game starts pass the locale. Tests: two in `notice.browser.test.ts` (the button follows a change, survives a
hide and show, and stops listening when removed; a string wins), and one in `sound.browser.test.ts` (a real locale
over `testHost({ language: 'ko' })` gives Korean, and `set('pt')` gives Portuguese).

**I2. A refused change of key was English only.** `rebind` answers a refusal with `message`, a sentence the remapping
screen (plan U) shows a player: "Escape is kept for the game's menus. Pick another key." It lives in `input`, below
`locale`. The plan's rule is that a feature below `locale` answers with a key and values, but plan L's table missed
`bindings.ts` (so did its audit, which checked `net`, `game` and `touch`). Fixed the way `players.ts` does it. A
refusal is now also a `Message`: `key` is `automata.rebind.*` and `values` are `{action}` or `{input}`, so
`locale.say(answer)` works on it. `createInput`'s `words` (a locale's, kept current by `relabel`) fills `message`, and
English stands when the words lack the sentence. Six sentences are added to the library in six languages. Tests: the
existing `bindings.test.ts` cases expect the key and values; a new one holds each refusal's English to the library's,
word for word; and `touch-words.browser.test.ts` checks a refusal said in the input's words, before and after `relabel`.

**I3. Paraglide's packages were installed by every game for nothing.** PR 82 put `@inlang/paraglide-js` and
`@inlang/plugin-message-format` under `dependencies`. `vite.config.ts` leaves every dependency for the game's bundler,
and `compileWords` is in no entry's import graph (no command and no export reaches it), so the published package never
loads them. Yet every game that installs the framework would have installed the inlang SDK. `dependencies` is right
only once a command runs the compiler, because that command resolves them from the installed package. Fixed: they are
`devDependencies` (in `package.json` and the lockfile's importer, with no version change). `tests/package.test.ts`
says the PR that gives `compileWords` a command moves them back. The Owner has since answered plan K's Q1: `automata
words` is built, once a game names its own source language (the "no default language" spec). That pull request moves
them back. The command isn't built here.

The same fact has a second side, recorded for that question. `bindParaglide` is exported and documented, but no game
can make the `runtime.js` it takes with this package alone, because no command runs `compileWords`. The README already
says "no command runs it yet". Task 12 is complete as the plan wrote it, but nobody can use it end to end until
`automata words` lands.

## Minor (all fixed)

- **M1. The language page waited on a sleep.** `tests/fixtures/locale/page.ts`'s `tap` waited 50 ms for the pick to be
  kept. It now waits on the pick's own promise. With storage refused, `set` resolves with the refusal, so the wait still
  ends.
- **M2. `createLocale` asked for the whole host.** The contract says `Pick<Host, 'language' | 'deviceLanguages'>`, and
  those two are all it reads. Taking the whole `Host` meant an editor or an agent's script in Node had to make a store,
  visibility and quit just to get words. It now takes the two, and the API report says so. A test makes a locale from
  a host of two functions.
- **M3. The words compiler could remove a game's own files.** After a compile it removed every file under
  `<outdir>/messages/` that the compile did not make. With `outdir = "src"` and a game folder `src/messages/`, that
  would have removed the game's own code. It now removes only a word's generated file, a `.js` directly under
  `messages/`. The compile test leaves a `messages/notes.txt` and a `messages/drafts/keeper.js` and finds both still
  there.
- **M4. The library's plain-words test banned "key".** It meant a message's key, but a keyboard's key is a word a
  player knows, and I2's sentences need it ("Pick another key"). It now bans "message key", "translation" and
  "fallback" (the plan's list) and lets "key" through.

## The builder's rulings, judged

- **`Words` in `src/lib/message.ts`.** Right. `input` is below `locale` and takes a `Words`, so the type has to live
  below both. `locale` re-exports it.
- **`createLocale({ content, host, settings })`.** The shape is right; the host type was too wide (M2).
- **`typed(_file, words)`** instead of the contract's `typed<M>(words)`. Accepted. A value argument lets TypeScript
  infer the keys with no type written out. The cost is that a game passes its `en.json` (an import a bundler includes)
  where a type would do, so a game that minds can pass `typed(undefined as unknown as typeof en, words)`. Not worth a
  second signature.
- **`Input.relabel` and `Touch.relabel`.** Right, and now `Input.relabel` also changes the words refusals are said in
  (I2).
- **`fill` builds its pattern from `placeholdersOf`.** Safe. A name is `[a-z][a-zA-Z0-9]{0,31}`, so it has nothing that
  needs escaping in an expression. It is one pass, and a value is never read again (Review Focus 3 has its test).
- **The journeys click the language buttons inside the frame** (`button.click()`, not a pointer at a point). Accepted.
  Hit testing is proved separately: `buttons()` asks `elementFromPoint` at each button's middle and requires the button
  itself, at five sizes.
- **The page reads its settings from its script's address.** Right. A `srcdoc` frame has no address of its own.
- **`bindParaglide` and `ParaglideRuntime` exported.** Right as the plan's contract. See I3 for what a game cannot yet do
  with them.
- **`compileWords` wired to no command.** As the plan wrote Task 12. The Owner's answer: `automata words`, after the
  source-language change (I3). Not built here.
- **The outdir check.** Sound for the folders it names, and widened at removal time (M3).
- **API report entries written by hand.** The `package` job compares the report with what the build prints, so a
  hand-written entry that differed would have failed. This PR's three changed entries are held the same way.
- **The whole-branch review was self-review.** This audit is the independent read. It found I1 to I3, which a
  self-review over the plan's own tables could not find: two of them sit in features the tables did not list.
- **Deviations not in the rulings, accepted:** the stored section is `{"format":1,"language":null}` for "follow my
  device", not `"auto"`. The schema's `null` is a value, so a stored `"auto"` from nowhere is refused and the section
  starts again unwritten. `wordsOf` and `frameworkWords` take the language with no default, which fits the Owner's new
  direction below. `fitLabel` takes no `max`, since the save label's 80 is the only use.

## The Owner's new direction: no default language

The Owner, 2026-11-14: English must not be the default language. Reported in this thread with every place it is
assumed: picking ends on `'en'`; words fall back to the game's English, then the framework's; `loadGame` needs
`en.json` and checks every file against it; conversations need English lines; the translation check and its
sentences; the read marks (`Exclude<Language, 'en'>`); Paraglide's base locale; `LANGUAGES`' order; and the template,
README and spec. A game would name its own first language in `automata.toml`. The coordinator made it its own spec
("Spec no default language"), so this audit does not change it. The fixes above keep English as the last word only
where `main` already does, and add no new place that assumes it.

## Numbers

- Framework words waiting for a native read: 27 keys, five languages, so 135. That is 100 before I1 and I2's seven
  keys. The demo's 45 are unchanged.
- No golden moved and no schema changed: the fixes are words, a page's button and the answer of a refused change.
