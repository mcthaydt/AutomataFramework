# Implementation audit, cycle 1: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #208 at `41b8d9c`, AutomataFrameworkEditors #104 at `bd394e0`,
  AutomataFrameworkExamples #70 at `2ebdf1d`, AutomataFrameworkSite #53 at `08f2a3c`, AutomataPrivate #15 at
  `1715521` and `mcthaydt-website` #68 at `6e35765` (branch `claude/project-thread-i7a1iw-kits`). Each head is one
  commit on its repo's current `main` (`9a9b625`, `5a519c8`, `ed0a5c6`, `865b46e`, `acddcd3`, `29cdf22`).
- Against: the spec `docs/superpowers/specs/2026-11-16-compaction-hook-design.md` as merged in #204 (`c4e1e22`), its
  five plan audits, and the approved proposal `proposals/2026-11-16-website-compaction-hook-proposal.md` in the
  project's files. Audited at 2026-11-16T23:28Z.
- Verdict: **1 red, 5 notes.** The hook, the reminder, the test and every rule edit match the spec byte for byte or
  word for word; the one red is that two edits fall outside criterion 2 as it is written. CI was still running when
  this was written (see "CI").

## How it was checked

- **One hash (criterion 1).** `git show <head>:<file> | md5sum` in each repo. `.claude/settings.json` is
  `8015be8f4ed629efea7ec2744cea51aa` in all five and equals the spec's JSON block extracted from `c4e1e22`;
  `.claude/after-compaction.md` is `89cf60879fa01f47f24b4b1fb66dd8f3` in all five and equals the spec's reminder block;
  `tests/workflows/compaction-hook.test.ts` is `baeaa86f0d946ed7f796515daa0a4aff` in the four repos with CI.
- **The rule edits (criteria 2 and 6).** A script took each repo's `CLAUDE.md` on `main`, applied the spec's section 2
  edits (the three bullets after "Acceptance criteria come first.", the Lane 3, table row 1, Writing and coordinator
  replacements) plus `live/` in the folder picture, and compared the result with the pull request's file, whitespace
  folded. All five are equal, and each replaced phrase occurred exactly once on `main` (the folder line twice in
  Framework, Examples and Site, once in Editors and Private). So nothing else in any `CLAUDE.md` moved. The
  `history.md` entry is the spec's section 4 text, identical in all five, placed after the layout-sketch entry under
  "Rule changes". No pull request touches `progress.md`.
- **The kits (criterion 9).** The same script, on each kit's `body.md` from `main`, applied the five replacements, the
  three bullets, the `release` skill's setup-check line (after the superpowers line, inside the setup check) and the two
  hook blocks before "Project instructions" with the spec's notes. Both kits are equal to the pull request. The settings
  block equals `.claude/settings.json`; the apps reminder equals `.claude/after-compaction.md`; the games reminder
  equals it with only line 2's list changed to "(review, release, visual-check, vertical-slice or scene-polish)". Both
  `meta.json` summaries read as the proposal's C. The games `CLAUDE.md` block is 363 lines (limit 380), apps 340.
- **Boundaries (criterion 7).** `git diff --name-only`: each repo touches only `CLAUDE.md`, `.claude/settings.json`,
  `.claude/after-compaction.md`, `docs/superpowers/history.md` and (four repos) the test; the website touches only the
  two `body.md`, two `meta.json` and `tests/unit/kit-content.test.ts`. `git diff --check` is clean in all six.
- **The hook is valid.** `SessionStart` with the matcher `compact` is the event Claude Code fires after an automatic
  or `/compact` compaction (the other matchers are `startup`, `resume` and `clear`), and a `SessionStart` command
  hook's standard output is added to the session's context. `jq` on AutomataPrivate's file prints one `SessionStart`
  entry, matcher `compact`, one hook of type `command`; running that command with `CLAUDE_PROJECT_DIR` set to the
  repo's root printed the reminder and `diff` against `.claude/after-compaction.md` found nothing. It also works with a
  space in the project path (the variable is quoted). `.claude/settings.json` and the test pass `biome check` with
  Biome 2.5.15 and each repo's own `biome.json` (none ignores `.claude/`).
- **The tests can fail (criteria 3 and 9).** The five-repo test, run with Vitest against `main`'s files plus the test
  alone, fails at load with `ENOENT` on `.claude/settings.json`; against the pull request's files, 4 of 4 pass. Each
  of these mutations turned exactly one test red: matcher `startup`; a second `SessionStart` entry; hook type `prompt`;
  the command pointing at another file; "beats the summary" removed from the reminder; `progress.md` deleted;
  `.claude/skills/` deleted. Each repo's Vitest `node` project includes `tests/**/*.test.ts`, and the CI logs of the
  `check` (Framework, Editors, Site) and `quick check` (Examples) jobs at these heads list
  `tests/workflows/compaction-hook.test.ts` with 4 tests passed.
- **The website.** In a fresh clone at `6e35765` (`npm ci`, `svelte-kit sync`, Node 22): `vitest run` 27 files, 309
  tests passed; `content:check` 0 errors, 0 warnings. With `main`'s `content/prompts` and the new test, 5 tests fail
  (the three-rules and two-hook-blocks tests in each kit, and the same-hook test), 86 pass. Mutations: matcher
  `startup` in the apps kit fails 2 tests; one changed sentence in the games reminder fails the same-hook test; one
  changed word in the apps "Fresh session" bullet fails `both_kits_share_one_workflow_word_for_word`.
- **Authors (criterion 8).** Each pull request is one commit, authored and committed by McThayDT
  <107786093+mcthaydt@users.noreply.github.com>, with no Co-Authored-By, session trailer or "Generated" line. Each
  body's last line is `Requested by **McThayDT**` at the time of this audit.

## CI

At 2026-11-16T23:28Z, at the heads above. The `commit-authors` check failed at about 23:20Z and passed on its re-run at
about 23:24Z in all four repos, after the bodies were reset. Every other completed check had passed; none had failed.
Read again at 2026-11-16T23:29Z: Site #53 is green on every check. Still running: Framework `create (windows-latest)`
and `create-play`; Editors nine `browsers` shards and `mockups`; Examples three `browsers` shards (with the `engines`
checks that wait on them). AutomataPrivate has no CI (criterion 4
stands in, above). `mcthaydt-website` has Netlify only: deploy preview success, the two header and pages checks
neutral. Criterion 10 is **not yet met**: it must be read again on the final heads before any merge.

## Red

**R1.**
UNIT: `CLAUDE.md` in all five pull requests and the `CLAUDE.md` block of both kits; the fix is in the spec, on #208.
VERDICT: red.
REQUIREMENT: criterion 2, "Each repo's `CLAUDE.md` diff against `main` holds only the edits in 2, and no edited line
is over 120 columns."
REASON: two edits are outside criterion 2 as written: `live/` is added to the folder picture, which section 2 does not
list, and table row 1 is an edited line of 237 columns.
EVIDENCE: `docs/superpowers/          specs/, audits/, live/, progress.md and history.md` is a changed line twice in
Framework, Examples and Site and once in Editors and Private; the pull request bodies call it "beyond section 2's
list, as the cycle-5 plan audit asked". That audit's note 1 offered two fixes, "add the same `live/` edit to section 2
(and criterion 2's 'only the edits in 2' then allows it), or drop it from 5 A"; the spec merged without either. Table
row 1: `awk 'length > 120'` over the added lines finds only it, at 237 columns, in all five and both kits; the spec
itself dictates that row, and a Markdown table row cannot wrap.
EXPECTED: the brief and the build agree. The build's choice is the one that keeps the five repos and the kits the
same, so the brief should say it.
FIX: on #208's branch, in `docs/superpowers/specs/2026-11-16-compaction-hook-design.md` only (inside the spec's
Boundaries, "apart from this spec and its audits"): add to section 2 "How code is written (and, where it has one, the
Structure picture): the `docs/superpowers/` line gains `live/`"; and in criterion 2 write "no edited line is over 120
columns, except table row 1, which is one table row". No other file changes; the five `CLAUDE.md` and both kits stay
as they are. Checked by re-reading criterion 2 against the diffs, as above.

## Notes (recorded, not blocking)

1. **`/compact` was not tried in a real session (criterion 5).** Each body says the container cannot run `/compact`
   interactively, and criterion 3 stands in, as the spec allows. The test proves the command prints the reminder; it
   cannot prove Claude Code fires the hook. One look after the merge, in any real session (asking it what it was told
   after `/compact`), would close that. It is not a test suite, so it may run wherever a session runs.
2. **The website test checks marker phrases, not the five repos' text.** It holds the kits to each other word for word
   and to key phrases, but a later edit made to only the repos or only the kits will not fail it. This audit compared
   them by script. A follow-up, not this change.
3. **AutomataPrivate's body (criterion 4) reports the `jq` and `diff` results in words, not as pasted output.** This
   audit ran both and got the same result, so nothing is missing.
4. **The website test suite needs `svelte-kit sync` before `vitest run` in a fresh clone** (`tsconfig.json` extends
   `$app/tsconfig`; without it 10 files fail to load). Outside this change.
5. **`mcthaydt-website` keeps a stale branch,** `claude/project-thread-i7a1iw`, with an unused earlier fix for #67,
   which is why #68's branch ends `-kits`. Deleting it is the Owner's. Outside this change.

## Follow-ups outside this change

- Notes 2, 4 and 5.
- The spec's open decision 2 (the game template's `AGENTS.md`) is still the Owner's.
