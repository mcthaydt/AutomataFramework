# Plan W (no default language): plan audit

Stage 3 of Cycle 5. Audited: [`plans/2026-11-14-no-default-language.md`](../plans/2026-11-14-no-default-language.md)
as merged in PR 90 (`452172c`), against [`specs/2026-11-14-no-default-language-design.md`](../specs/2026-11-14-no-default-language-design.md)
and the code on `main`. Nothing was run: every fact below is read from the files on `main`, the other repos' `main`,
or is said to be unchecked.

**Verdict: ready for execution once the fixes below are in the plan; they are, in this pull request.** No critical
finding, five important, three minor. No golden moves under the plan as fixed. No new dependency. No Owner question
is opened: every finding is the builder's or the coordinator's to settle, and the one that touches the Owner's rule
(the README's `--source en`) is judged inside the rule's own scope below.

## The four questions the coordinator asked

1. **`startGame` now needs a `locale`: a breaking change for plan D and the Editors' pin.** It is right to make it:
   it is the one place the anti-goal "a player without a match is put into the team's language" can be held by the
   code rather than by every page remembering. It reaches less than the plan said. Examples calls `startGame` (and
   types its `start` option as `typeof startGame`) in `src/features/play/play.ts`, so plan D takes it with its pin.
   The Editors import only `loadGame`, `parseProject`, `parseContent`, `writeContent`, `formatDiagnostic` and the
   level helpers from `headless`, none of which changes shape; their pin is reached only by the new rule that a game
   with words and no `source` does not load, and their fixture game lists no words (M3). The guard itself had a hole
   (I1).
2. **The README's first command uses `--source en`: is that a default?** No, by the Owner's own scope. Q1 puts the
   README among developer text, which stays in English on purpose; the command writes a stated, visible fact into the
   new game's `automata.toml` that the sentence right under it explains, with the six codes, and that one line
   changes. Nothing in the code chooses English: without `--source` and without a device language `create` stops and
   asks. Leaving the flag out of the README would make the first command fail on a machine that says no language
   (GitHub's Linux runners say `C.UTF-8`), which breaks the onboarding rule. No change.
3. **The speakers' counts were written from memory.** Not verified: this machine is refused Ethnologue and Wikipedia
   (the proxy answers 403 to both), and nothing in the repos holds them. The order the spec fixed (zh, es, en, pt, ru,
   ja, ko, de, fr) is the same in every recent edition I know of; the one close pair is German and French, both in the
   mid-70 millions with German ahead. The plan now writes **no number into the code**, only the order and the edition
   it follows (I4). If the Owner wants the counts on record, they belong in the spec with a link, checked by someone
   who can open the edition.
4. **`compileWords` left unwired for plan K.** The spec allows it ("where plan K Part 2 puts it on the command line
   is plan K's call"), so plan W is right not to wire it. But no plan K step names it (Part 2's left steps are S, T and
   U), and the tracker's plan L log says `automata words` moves the inlang packages back to `dependencies`, which plan
   W's `automata words` does not. Left so, the work has no owner (I5).

## Important

**I1. The `startGame` guard let a watching locale through.** The plan threw when `locale.language() === undefined`.
A locale made with `watching: true` has a language (the device's, else the game's `source`) that the player never
chose, and `asked()` false. A page that keeps the watch's locale after a take-over, which is the natural thing to
write, would pass the guard and start the game in the suggested or the team's language without the picker: exactly
the spec's anti-goal, and plan D's watch mode is the page that would do it. **Fixed in the plan:** call 2, Task 5
Step 3 and Task 7 Step 3 test `!locale.asked()`; Task 5 adds a test that a watching locale with a language is refused
by `startGame` and `startOnlineGame`; plan D's handoff says to show the picker on `!locale.asked()`.

**I2. The flags could not be imported where the spec put them.** `tests/architecture/rules.ts` reports
`through-the-entry` for any relative import into another feature that is not its entry; `importsOf` reads
`../locale/library/flags/zh.svg?raw` as such an import. Task 6 would have gone red on the architecture test. Making
`locale.ts` export the drawings would put `?raw` imports into a headless feature the command loads in Node.
**Fixed in the plan, as a recorded deviation from the spec:** the six files are in
`src/features/web/library/flags/`, beside the two icons, and `flags.test.ts` is under `tests/features/web/`. The
picker's rules, words and order stay in `locale`.

**I3. The rule that holds "no English fallback" exempted two whole files.** Task 10 skipped
`content/messages.ts` and `content/read-marks.ts` entirely. `messages.ts` is where three of today's English fallbacks
live (`englishLacks`, `englishMissing`, the `file.id === 'en'` skip); after the plan it holds `sourceLacks` and
`checkAgainstSource`, so an `'en'` written back there later would pass unseen. **Fixed in the plan:** the exceptions
are two declarations (the `LANGUAGES` line and the `FORMAT_1_SOURCE` line), taken out of the text before the match,
and `rules.test.ts` expects an English fallback in each of those two files to break the rule.

**I4. Unverified numbers were bound for a code comment.** Call 9 asked this audit to check the counts first; it could
not (question 3). **Fixed in the plan:** the comment on `LANGUAGES` names the order and Ethnologue's 28th edition
(2025), with no numbers.

**I5. `automata words --compile` had no owner.** See question 4. **Fixed in the plan:** the plan K handoff gives it a
home (plan K Step U, since plan U is the first to show a game's words through Paraglide on a page; the coordinator may
move it), and Task 10 Step 5 corrects the tracker's plan L log line and states the new "Before Release 1" count
(29 words in each of six, so 145 to read).

## Minor

**M1. `create` would have found the template's `source = "en"` line by naming English.** Task 10's rule fails
`"en"` in `src/features/cli/create.ts`. **Fixed:** the line is found by `/^source = "[a-z]+"$/m`.

**M2. Task 2 did not name the API report.** `Project.source` and the renamed `sourceLacks`, `sourceMissing` and
`checkAgainstSource` change `docs/api/framework.api.md`. **Fixed:** listed in Task 2's files, from the `package`
job's log. No file in `schemas/` holds `automata.toml`, so no schema moves in that task.

**M3. Two handoffs said more or less than is true.** Plan D's said to write `source = "en"` in the demo, which today
lists no words file, and a `source` with no words is a load problem; it now says to write it with the first messages
file. The Editors' said "the pin moves with this plan" as if a call changed; it now names what does and does not
reach them.

## Checked and right

- **Spec coverage.** Every row of the spec's "What changes, by place" table has a task, and every Node and end-to-end
  test the spec lists has a test in a task, except the Examples journey (7), which is plan D's by the spec's own
  handoff.
- **No golden moves.** `contentHash` is taken over `simContent`, which drops `project.source` (Task 2) and already
  drops every `messages` entry, so neither the order of `LANGUAGES` (Task 1) nor US spelling moves a hash. The
  replay's `schemaHash` is the sim's ECS layout, not a Zod schema, so a new `automata.toml` field cannot reach it.
  Task 2's six-source parity test is the proof the spec asks for.
- **The library's count.** Each library file has 27 words on `main`; with the picker's two, 29, so 145 wait across the
  five languages that are not the library's `source`.
- **US spelling.** Neither `src/features/locale/library/en.json` nor `template/content/messages/en.json` holds a
  British spelling today, so Task 1's test lands green on those files; it guards what comes later.
- **The existing pieces the plan builds on exist:** `createPads` with `mask`, `createMenu` and `MenuPress`, `PadLike`,
  `SCREENS`, `tests/features/csp/`, `testHost`'s `language` and `deviceLanguages`, the web host's `language()`
  answering `undefined` (so no browser skips the picker by the host route).
- **The two leftover fallbacks** call 4 names (`soundNotice`'s `frameworkWords('en')` and `bindings.ts`'s English
  `message`) are on `main` as described.
