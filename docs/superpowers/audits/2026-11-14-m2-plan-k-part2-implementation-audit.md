# M2 plan K, Part 2 steps P, L and A: implementation audit

Stage 5 of the workflow, for three of the template's steps in [`plans/2026-11-14-m2-cli.md`](../plans/2026-11-14-m2-cli.md)
("Part 2: the template's steps"), as merged after Part 1's own audit ([PR 80](2026-11-14-m2-plan-k-implementation-audit.md)):
Step P in PR 79 (`54c6d9d`, the spark), Step L in PR 81 (`9fa2d3e`, the words) and Step A in PR 84 (`17a86d6`,
`automata art`). Checked against plan K, its [plan audit](2026-11-14-m2-cli-plan-audit.md), the Part 1 implementation
audit, the handoffs of [plan L](../plans/2026-11-14-m2-languages.md) and [plan A](../plans/2026-11-14-m2-art.md) to plan
K, the [M2 spec](../specs/2026-11-14-m2-design.md) and `progress.md`. Written 2026-11-14. Steps S, T and U are not built
and are out of scope.

**Verdict:** the three steps are sound and do what their rows say. Each merged `main`, added its built-in to
`template/`, extended `tests/template/`, one assertion of `create-smoke.mjs` and one of the create journey; the
recording moved exactly twice, each time in a commit that names it (`ce40209`: `caf2ae13ae5ba7d4` to
`0d474ece7607bc15`; `bb25aa8`: to `d0da8dfb33f7afc5`), and Step L, whose words are not in the sim's hash, did not move
it. No other golden moved. CI on `main` is green on every merge since (`9fa2d3e`, `17a86d6`, `e204137`). There is
nothing critical. Three findings are important: the agent notes still send a change to a word to the page, which Step
L moved into `content/messages/`; the page's "a picture is missing" screen, Step A's, is English whatever the player
speaks, tells them to fix a file they must not hand-edit, and has no test; and the command that marks a language as
read, which plan L handed to plan K's Step L, was not built. The first two are fixed here, tests first. The third is a
new command; the Owner chose to build it (Q1), after a game can name its own source language. Six minor findings follow; one is fixed.

**How it was checked.** The three merges' diffs were read in full (`git diff <merge>^1 <merge>`), with every file of
`src/features/cli/` they touch read whole as it is on `main` (`art.ts`, `check-files.ts`, `game-folder.ts`,
`check.ts`, `create.ts`, `play.ts`, `help.ts`, `mcp-tools.ts`, `report.ts`, `template.ts`), the framework's
`artFiles`, `artProblems` and `ArtError` (`src/features/content/art.ts`, `src/features/render/art.ts`) and
`translationProblems`, the template as it is now (`automata.toml`, every content file, `page.ts`, `controls.ts`,
`AGENTS.md`, `README.md`, `gitignore`), the four skills, the root README's command sections, and each step's tests
against its row. The recording's history was read with `git log -- template/replays/level-1.json`; `main`'s checks with
`gh run list`. Nothing was run locally.

## Critical

None.

## Important

**I1. The agent notes still say the words on the screen are in `src/features/page/`.** Step L moved every word the
template shows into `content/messages/`, in six languages, and added a row for it to the template's `AGENTS.md`. But
two places an agent reads first still point the other way:

- skill `automata` (read first, by its own words): the table says "The page: loading, controls, words on the screen |
  `src/features/page/`", and "Where a change goes" says "How the game looks on the page, or the words on it:
  `src/features/page/` and `src/style.css`";
- the template's `AGENTS.md`: "The page: loading, controls, words on screen | `src/features/page/`", one row below the
  new messages row.

An agent asked to change "Jump" on a button follows the skill to `page.ts` or `controls.ts`, finds no word to change,
or worse writes one there in English, and the five other languages never get it. Principle 1 (agent-first) asks that
the documented route be the real one. **Fixed:** the skill's table and "Where a change goes" send a word to
`content/messages/` (every language, and `check` names what is missing); both page rows say loading and controls, not
words. Tests: `tests/skills/skills.test.ts` and `tests/template/art.test.ts` (beside the other `AGENTS.md` assertion)
fail on the old lines.

**I2. A picture that is missing is shown in English only, says to "fix the file named above", and is never tested.**
Step A added `if (error instanceof ArtError) return problem(WORDS.problemTitle, [reason], WORDS.problemFix)` to the
template's page. By then the page has made its locale, so the player's words exist, yet the title and the fix are the
English constants; Step L's own comment above `WORDS` says "Everything else it says is in `content/messages/`". The fix
line, "Fix the file named above, then load this page again", names `content/figures/hero.png`, a painted file nobody
should edit by hand; the way out is to paint again. No test opens the page with a missing picture, so neither the branch
nor its words were ever run. **Fixed:** two words join all six messages files, `page.problem-title` (the same title)
and `page.paint-again` ("Run npm run art in the game's folder to paint the pictures, then load this page again."), and
the `ArtError` branch says them in the player's language. The title for a game whose files do not load stays the
English constant, since no words have loaded then. Test: `tests/template/page.browser.test.ts`, "a picture that was
never painted is said in the player's language, with the command that paints it" (a Spanish device and a reader that
has no `hero.png`). The five new translations are first drafts and are counted unread in `check`'s note like the rest.

**I3. No command marks a language as read.** Plan L's handoff, on `main`, gives plan K's Step L three things: the
`files` step adds `translationProblems`, it prints `unreadWords` as a note, and "a command that marks a language as read
(`markRead`, `writeReadMarks`) is its to name" (plan L, "What the other plans rely on", and its "Not here" table). Plan
K's own Step L row was written before plan L and names only the first two; Part 2 says "what is on `main` wins". The
build did the first two and wrote in `progress.md` that the command was left for the Owner. Today `npm run check` tells
a person how many words wait for a native speaker's read (65 in a new game) and gives them no way to record that read but writing code
against `markRead`; an agent has the same gap, which principle 1 does not allow. It is a new command (a seventh row in
`cli.ts`, its help, its words, an MCP tool), so it is the Owner's to say; see Q1. Not built here.

## Minor

**M1. The template's word test did not see `say?.(...)`.** `tests/template/messages.test.ts` finds the keys the
template asks for with `words('…')`, so a key said through the page's `say?.('…')` was never held to the English file.
**Fixed:** the pattern takes both.

**M2. "Not a game" names `automata check` for every command.** `readGame`'s sentence ends "or name it: automata check
<folder>." for `art`, `replay` and `play` too. It is the contract's sentence from Part 1 and tests quote it; left as it
is, noted for the next change to that sentence.

**M3. One run paints the pictures more than once.** `check` paints every figure in memory for the files step
(`paintedPaths`) and again for the art step (`artProblems`); `play` paints for the files step and again in `paintArt`.
With two small figures the cost is a few milliseconds; a game with many may want one painting per run. Not changed.

**M4. The spark is the one thing in the template with no figure.** Step P's spark came before Step A, whose row names
only the hero and the crate, so the spark is still a flat square beside two painted figures. Giving it a figure moves
the recording (a `Sprite` joins), which needs the Owner to see it; left for the step that next moves the recording
(S, T or U), and named here so that step takes it.

**M5. The create journey's spark check counts things, not the spark.** It checks that the level lists a spark and that
at least as many things as the level lists are in the game, which a missing spark plus an extra thing would pass. The
smoke's MCP assertion does name the spark (`state.things` has `character === 'spark'`), so the gap is covered there.
Not changed.

**M6. A game whose framework has no painter is told its pictures are "already painted".** `automata art` on a game
installed with a framework older than plan A finds nothing to paint and says "Every picture is already painted and up
to date." No such game exists before Release 1, when the framework and the command ship together. Not changed.

## What was checked and is sound

- **Step P.** The spark is a `"touch": "take"` character; `countSparks` runs in `gameplay` and counts
  `touchEvent('spark', 'taken')` into `hero.score`; `heroPlugin` depends on `level` and `touch`. The template's own test
  counts one spark once, the parity test counts it in the recorded play, and `automata-rules`' new section is held to
  the template's files and the framework's exports.
- **Step L.** Six messages files with the same thirteen keys, the page's locale from `createLocale` and `followLanguage`,
  the hint redrawn on a language change, the touch buttons' words, `translationProblems` and an `unreadWords` note in
  `files`, a marks file that does not read failing the step, and a game with no words saying nothing. The journey checks
  Japanese on a Japanese device at every size.
- **Step A.** `automata art` (with `--check` and `--json`), the `art` step after `files` (skipped when the files do not
  load), `play` and `create` painting first, the painted atlases not called unlisted (pictures are not `.json`, so they
  never were), the MCP `art` tool (twelve tools, as the smoke counts), `scripts/art.ts` and its `package.json` script
  gone with every assertion of its test kept, the repository's `.gitignore` keeping pictures out of `template/`, and the
  template's `gitignore` and `AGENTS.md` following the Owner's answer (a), pictures committed in a game.
- **Every reported deviation** (Step L's command, Step A's recording) is accounted for above or in the log.

## For the Owner

**Q1. A command that marks a language's words as read** (I3). Today `check` says how many words wait for a native
speaker's read, and nothing records that read but code.

- (a) **`automata words`** (recommended): with no option it lists each language's unread words, English beside them;
  `automata words --read <language>` marks every word of that language read, as it is now, in
  `automata.translations.toml`. An MCP tool `words` does the same, and `check`'s note ends "After a native speaker reads
  them, run npm run words -- --read <language>." A word changed later is unread again, as the marks already work.
- (b) **No command:** the README and skill `automata` show the two library calls (`markRead`, `writeReadMarks`) in a
  short script an agent writes. Fewer commands, but a person who reads Spanish needs an agent or code to say so.
- (c) **Wait for the editors:** Story's Writer (M3) shows the marks and could write them. Until then nothing records a
  read.

Nothing else waits on the answer.

**The Owner's answer (2026-11-14): (a), and English must not be the default language.** Any language can be the one a
game is written in and the one the others are read against. That is more than this audit: English is the source in the
content format and the locale today (`translationProblems` and `unreadWords` compare with `en`; the marks file has a
mark for every language but `en`, of the English text and the translation; `pick.ts` and `words.ts` fall back to English;
`automata.toml` names no source; the check's sentences say "English says"; the README, the skills, the template's notes
and plan L say so too), and plan L's Task 12 (Paraglide, PR 82, in flight) has a base language of its own. So
`automata words` is built after a change to plan L that gives a game its source language, and on top of it, not here;
building it now would tie it to English as well. The change and where it lands were sent to the coordinator.

## Fixes in this pull request

Tests first (pushed red), then the fixes: I1 (skill `automata`, template `AGENTS.md`), I2 (two new words in six
languages, the page's `ArtError` branch), M1 (the word test's pattern). No golden moves: words are not in the sim's
hash, and no rule or content of the play changes.
