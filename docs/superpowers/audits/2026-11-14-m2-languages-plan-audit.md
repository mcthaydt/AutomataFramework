# M2 plan L (languages): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-languages.md`](../plans/2026-11-14-m2-languages.md) as merged in
`2f675be` (PR 70), against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "Languages (plan L)", its `messages`
row, the showcase's Languages row and journey, the first spec's stack table and "Type", the code on `main` at
`2f675be`, and the other M2 plans as they stand there: C, I, V, N and P (built and fixed), and A, S, T and K (planned
and audited; S and T are being built on their branches, which were read too). Written 2026-11-14.

**Verdict:** sound in its shape, and ready for stage 4 once one critical fault in Task 1 is fixed (it is, in the
plan) and the Owner answers the one open question, which holds only Task 12. The central call holds: words are
content read at run time, `locale` sits right above `host`, the features below it answer with keys, and nothing in
the sim reads a word. But Task 1 as written left the list of words files in the hash, so adding or dropping a
language still moved every hash, and Task 1's own test would have failed (C1). Three important faults were found:
the touch buttons' own words could not be translated or changed (I1); the Spanish is written in Spain's words, not
the neutral Latin American the plan calls for (I2); and the hook that changes the overlay's label on a new language
was not in the contract (I3). Ten minor ones are fixed or handed on. The journeys gain three checks.

How it was checked: the plan was read whole, and the spec's parts named above. On `main`, these were read for every
call the plan makes: `src/features/level/game-sim.ts` and every `createGameSim(` and `contentHash` in `src/`
(`game.ts`, `watch.ts`, `online.ts`, `server/room.ts`, `net/protocol.ts`, `commands/play.ts`, `recorder.ts`),
`src/features/sim/create-sim.ts`'s content hash, `src/features/content/` (`load.ts`'s `GameContent`, `project.ts`'s
`content` list, `messages.ts`, `shared.ts`'s `MessageKey`, `ids.ts`, `conversation.ts` and `cutscene.ts`'s
`englishLacks`, `tuning.ts`'s `controls`), `src/features/saves/settings.ts` and `envelope.ts`'s label rule,
`src/features/host/host.ts`, `test.ts` and `web/web.ts`'s languages, `src/features/net/words.ts` and
`protocol.ts`'s `ONLINE_PROBLEMS`, `src/features/game/players.ts`, `src/features/input/touch.ts` and `controls.ts`,
`tests/fixtures/full-game/` and `tests/fixtures/game/controls.ts`, the goldens in `tests/golden/`, `package.json`'s
build and `tsconfig.json`. On the branches: plan S's `src/features/level/sim-content.ts`, plan T's
`src/features/story/words.ts`, `box.ts`, `src/features/level/` and `tests/golden/story.json`. In
AutomataFrameworkExamples: `automata.toml`, `replays/`, the framework pin and `src/features/play/controls.ts`.
Nothing was run.

## The coordinator's questions

- **Task 1 (words out of what the sim hashes): is the fix sound, and does it stand alone?** It stands alone: it needs
  only `createGameSim`, `GameContent` and the full fixture game, all on `main`, and every sim a game makes goes
  through `createGameSim` (a page, `watchReplay`, the online game's two sims and the room server), so one change
  covers the page, the replay check and a room alike. Nothing in the sim reads `content.messages`, on `main` or on
  plan T's branch, where a conversation holds keys. No golden on `main` is from a game that lists a messages file
  (`push-crate`, `co-op`, `physics-scene`, `bounce`, `playground`, `joints-scene`, `online-two-players`), and
  Examples lists none, so nothing recorded moves. Plan T's `story.json` is still empty on its branch, so if Task 1
  lands first it never moves. **But the fix as written was not sound** (C1): it dropped the `messages` map and kept
  `project.content`, which lists every messages file by path. Fixed in the plan.
- **Paraglide.** See "The Owner question". The audit agrees with option 2, for the reasons there; it is the
  Owner's to answer, and nothing is defaulted.
- **zh Simplified, pt Brazilian, es neutral Latin American.** All three hold. Simplified is also what ZCOOL KuaiLe,
  the Chinese font the Owner picked, draws, so a Traditional Chinese device given Simplified sees the game's own font;
  given Traditional it would see the system's. Brazilian is the larger audience and the words fit it ("fase",
  "controle", "todo mundo"). Latin American Spanish is right, but the Spanish written is Spain's (I2).
- **CJK fonts in Examples.** Right, and already approved: the first spec's "Type" names the three packages and says
  the Owner's yes covers them and that the framework imposes no font. Plan D's step is sound; it gains two notes
  (M9).
- **The native speaker's read.** The marks are the right shape: kept by the two texts read, so a changed word waits
  again with nobody remembering to say so. What was missing is anything that holds Release 1 to it: the count is
  printed and never fails. M8 puts it on the Release 1 list. Every translated sentence was read for this audit;
  what was found is in I2 and M10, and none of it replaces a native read.
- **Do the e2e tests cover enough?** Nearly. Task 9 covers picking, changing and keeping a language in three
  browsers at five sizes, on a real second page and with storage refused, and Task 10 an agent and the packed
  package. Missing were the touch buttons' own words (I1), the online words in a browser (J2), and a check that the
  letters are drawn at all (J3: "wider than 20 px" is true of empty boxes too).

## The Owner question

**Q1. Paraglide** (the plan's own question, sent by its author; still open, not defaulted). Options as the plan
gives them: (1) use Paraglide, adding `@inlang/plugin-message-format` 4.4.4 beside `@inlang/paraglide-js` 2.25.4,
and build Task 12; (2) leave it out of M2 with a written reason, and strike Task 12.

What the audit found, for the Owner's answer:

- A run-time lookup by key is needed whatever is chosen. A conversation names its lines by key as data, a level's
  name is found by its id, and the editors (M3) change a word without a build. Paraglide does not replace Tasks 1 to
  11; it only adds typed functions for a game's own code.
- Paraglide's plugin reads its own file shape (a flat object with a `$schema` line), not the framework's
  `{ "format": 1, "id": "ko", "messages": { ... } }`. Task 12 has to write a temporary inlang project from the
  game's files on every compile, which is a second form of every word that must never be edited.
- It adds a build step to every game. `typed` (Task 6) gives a game's code checked keys from its own `en.json`
  with no step and no package.
- Principle 6 asks only that a part of the stack left out has a written reason; option 2 writes one.

The audit recommends option 2. If the Owner picks it, the same pull request changes three places, not one: the first
spec's stack table (the Paraglide row), its layer 10 line ("Paraglide messages and the language choice"), and the M2
spec's principle 6 row and "Languages (plan L)" sentence (M7).

## Critical

**C1. Adding or dropping a language still moved every hash.** `GameContent.project.content` lists every content
file with its type and path (`project.ts`), and `createSim` hashes the whole content (`create-sim.ts:176`). Task 1
dropped the `messages` map and kept that list, so a game that gains or loses `ko.json` changes `project.content`
and every hash with it. Three things follow:

- Task 1's own test "taking a language away, or every language, moves no hash" fails as the step is written.
- Plan D's step adds six messages files to Examples' `automata.toml`. Its `replays/level-1.json` (a golden the merge
  session watches) would move its `contentHash`, while the step says "No golden moves".
- Two builds of one game with different sets of languages could not share a room (`different-version`).

Fixed in the plan: `simContent` also leaves out each `project.content` entry of a kind it leaves out, and still
gives back the very same object when the game lists none. Task 1 gains a test that a game with and without
`ko.json` listed has one `contentHash`, and one that Examples' kind of change (six files added to a game that had
none) leaves the M1 fixture's recorded hash. The "every language away" test uses a game with no conversation or
cutscene: the full game's `keeper` conversation needs an English file, so `loadGame` refuses it with none.

*Handed to plan S* (being built; its `sim-content.ts` on its branch has the same hole for `sound`, `music` and
`cues` entries). Whichever lands second keeps both kinds' tests; if plan S lands first, Task 1 widens its filter
to the list entries of all four kinds and says so.

## Important

**I1. The touch buttons' own words could not be translated.** A button's words are `Control.label` ("Jump",
"Left"), set in a game's code (Examples' `play/controls.ts`) or in a tuning file's `controls` (plan C), which is
hashed content. They are the words a phone player reads most, and the plan left them in English, outside every
messages file, unchecked by `translationProblems`, and fixed for the life of the overlay. Fixed in the plan
(Task 8): a button's words are the message `controls.<action>` when the game has it, else its `label`, so no file
changes and no hash moves; the `Touch` the overlay returns gains `relabel(words)` (the overlay's own label and every
button's), which `startGame` calls on each `locale.onChange`. `translationProblems` holds a `controls.<action>` text
to 12 characters, the button's own limit (`controls.ts`'s `MAX_LABEL`), with a sentence like the level name's. The
full game's six files gain `controls.left`, `controls.right` and `controls.jump`; Task 4's count becomes
5 x 9 = 45. Task 9's Japanese test reads the three buttons.

**I2. The Spanish is Spain's, not Latin America's.** The plan calls for neutral Latin American Spanish, and three of
its words are Spain's: "mando" for a gamepad (Latin America says "control", twice), and "sitio" for room on the
server ("espacio"). "No se pudo llegar al servidor" reads as travelling there; "conectar con el servidor" is what is
meant. Fixed in the library (four sentences). A native read still follows.

**I3. Changing the overlay's label had no way in.** Task 8 says `startGame` "on `locale.onChange` set[s] the
overlay's label again", but `createTouch` takes the label once and the contract gives `Touch` nothing to change it.
Folded into I1's `relabel`. `createTouch`'s new argument is an options object (`{ win?, words? }`) rather than a
fourth place after `win`, so the next option has a name.

## Minor

- **M1. A tag with `_`.** `matchLanguage` finds nothing for `ko_KR`. A desktop or store host (M4) may well say
  `ko_KR` or `ko_KR.UTF-8`; `_` is now read as `-`, and what follows a `.` is dropped. Review Focus 1 and Task 5's
  test say so.
- **M2. A listener that throws.** `SettingsHandle.set` throws a listener's error after the write, and `createLocale`
  listens through it. The plan did not say what `Locale.set` then does. It now does what `SettingsHandle.set` does:
  every listener is told, each in a `try`, the choice is kept and written, and then `set` rejects with the first
  error a listener threw. Task 7's test says so.
- **M3. Plan U's "refusal words" do not exist.** `StoreResult`'s `detail` is for a developer; there are no player
  words for a refusal on `main`. The handoff now says plan U adds `automata.saves.refused.<refusal>` to the library.
- **M4. The Task 9 page "starts the game for two players".** The full game has no `players`, so it is a one-player
  game and the refused join is `automata.join.one-player-game`. The page now says that, and starts one player.
- **M5. "Moves no hash" in a browser must count ticks, not frames.** Two games in one page run their own loops; the
  test drives both with an injected `frames` (as `game.ts` takes) so both run 120 ticks, then compares.
- **M6. A level-name or control key for nothing.** `level.<id>.name` for a level the game does not have, or
  `controls.<action>` for no action, is a word nobody will ever read. `translationProblems` cannot see the actions
  (they are code); for levels it now says "This game has no level called ..." so a renamed level's word is not left
  behind.
- **M7. Option 2 changes three places.** See Q1.
- **M8. Nothing holds Release 1 to the native read.** The spec says the words are read before Release 1, and the
  count is printed and never fails. Task 11 now adds a "Before Release 1" line to plan L's row in the progress page:
  every framework and demo word has a read mark (`unreadWords` is empty), with the count left today. Finding the
  readers is the Owner's; nothing is defaulted.
- **M9. Plan D's fonts.** Fontsource splits each CJK font into about a hundred `unicode-range` files, so a player
  downloads only the letters a page uses, but `dist/` holds all of them. Plan D measures both (what a Korean page
  downloads, and `dist/`'s size), imports one weight of each (Jua and ZCOOL KuaiLe have only one; M PLUS Rounded 1c's
  regular), and checks the Site's "about 1.2 MB" sentence against what it measures.
- **M10. For the native reader** (not changed, written into the marks' report so the reader starts there). Korean
  ends two sentences in the formal "계속됩니다" among friendly "-어요" ones ("계속돼요" would match). Chinese
  `waiting.one` says "让他加入", which picks a sex ("让对方加入" does not). Japanese and Korean platformers often say
  "ステージ" and "스테이지" where the plan says "レベル" and "레벨".

## The journeys, added

- **J1** (I1). Task 9's "taps 日本語" test reads the three touch buttons' words as well, at every size.
- **J2.** The `online` job's journey gains one case: a second page whose device says Spanish sees the waiting
  sentence in Spanish, with the room's code in it.
- **J3.** A name "is drawn" is now measured: the page draws each language's name, and then the same number of
  U+0378 (a code point with no letter, which every font shows as the same empty box), on a canvas in the page's own
  font; the two pictures' pixels must differ. Empty boxes for every letter would be the same picture. The six
  pictures stay for a look.

## Checked and found right

- **The layer.** `locale` right above `host` fits `rules.ts`: it needs `saves` (settings, `StoreResult`) and `host`
  (the languages), both below; `story`, `ui`, `screens`, `web` and `game` are above. `input/touch.ts` and
  `net/words.ts` below it take words or answer with keys, so nothing imports upward.
- **Keys.** `MessageKey` allows `level.level-1.name` and every `automata.*` key in the library (dots and dashes); a
  64-character level id makes a 75-character key, under 96.
- **The English library** is word for word what `net/words.ts`, `game/players.ts` and `input/touch.ts` say on
  `main`, and its `ended.*` keys are exactly `ONLINE_PROBLEMS`.
- **Settings.** `settings.section` refuses a stored `"fr"` or `null` with the schema and starts at `auto` without
  writing, and only touched sections are written, so the stored value is left as Review Focus 2 says.
- **Labels.** A save label is 1 to 80 UTF-16 units (`envelope.ts`), as `fitLabel` counts.
- **Lists.** `Intl.ListFormat` with `en-GB` gives "1, 2 and 4", which is what `net/words.ts` says today. Words are
  not hashed, so an engine's own list words cannot break parity; the tests quote English only.
- **JSON in the package.** `vite build` bundles the six library files into the page entry, and Node's import
  attributes read them in the scripts; no `.d.ts` names one.
- **The check outside `loadGame`** (the author's call 1). Right: a missing Korean word should not stop an English
  player or lock a team out of an editor. Plan K's Step L and Examples' CI make it fail where it should.
- **One and many** (call 4) is enough for all six languages; Korean, Japanese and Chinese have no plural, and the
  framework never says "0 players" (a count shown is at least 1).
- **Traditional Chinese given Simplified** (call 5). Right, for the font reason above.

## For other plans, not fixed here

- **Plan S:** C1's hole is in its `simContent` too (its branch). Whichever lands second widens the filter to the
  `project.content` entries of every kind left out.
- **Plan T:** if Task 1 lands before `story.json` is recorded, it never moves. A character's `name` is already a
  message key on its branch, as the level name is here.
- **Plan U:** the refusal and settings-problem words are its own keys (M3); the language list shows `'auto'` as a
  choice of its own.
- **Plan D:** C1 is what makes its "no golden moves" true; M9 for the fonts; Examples' own controls gain
  `controls.<action>` words in six languages (I1).
- **Editors (M3):** an English line added in the Story editor turns Examples' CI red until the other five are
  written, because `translationProblems` is a CI check. The Writer should make all six lines at once, or say which
  wait.
