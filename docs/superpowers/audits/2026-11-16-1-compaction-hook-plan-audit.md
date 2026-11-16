# Plan audit, cycle 1: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #204 at `c48a1ec`, `docs/superpowers/specs/2026-11-16-compaction-hook-design.md`.
- Against: the Owner's two messages of 2026-11-16 20:28 and 20:29 UTC, `CLAUDE.md` and the `review` skill, and `main`
  of all five repos as fetched at 2026-11-16 20:35 UTC.
- Verdict: **not ready, 3 red, 8 notes.** Each red has a bounded fix in this spec alone.

## What was checked

- **The ask.** The spec delivers the three things asked: a hook after compaction saying the rules file beats the
  summary, live state kept in a committed file, and a fresh session per big job, the same in all five repos. The
  "games and apps" prompts are not in any of the six repos (`git grep` over every `main`, and the handoff file), so
  sending them to the `mcthaydt-website` follow-up (Plan 7) matches the Owner's "add the repo when we get there".
- **The hook.** A `SessionStart` hook with matcher `compact` is the right Claude Code mechanism: it fires after an
  automatic compaction and after `/compact`, not on `startup`, `resume` or `clear`, and a `SessionStart` command's
  standard output is added to the session's context. `$CLAUDE_PROJECT_DIR` is set for project hooks. If the file were
  missing, `cat` exits non-zero, which is non-blocking; check 4.2 and 4.4 cover that.
- **The quoted text.** Every phrase the spec rewrites in `CLAUDE.md` (the Acceptance-criteria bullet, the Lane 3
  wording, table row 1, the Writing bullet, the coordinator bullet, Session refresh) is present once in each repo's
  `CLAUDE.md` on `main`, and Editors #99 (the one slice-retro pull request still open) touches none of them.
- **CI reach.** In AutomataFramework's `ci.yml` the docs-only filter is
  `^(CLAUDE\.md|docs/.+\.md|\.claude/skills/.+\.md)$`, so `.claude/settings.json`, `.claude/after-compaction.md` and
  the new test take the code path, and `vitest.config.ts` includes `tests/**/*.test.ts`. The other three CI repos
  already have `tests/workflows/`.
- **Ordering.** The layout-sketch spec (#203 at `claude/project-thread-s78w3i`) edits other `CLAUDE.md` bullets ("Show
  work early", the advisor, after "Slices.") and adds its own "Rule changes" entry after the slice-retro one. The two
  changes overlap only in `history.md`, which this spec orders correctly.

## Red

### R1. The hook's `settings.json` fails `pnpm lint` in the four repos with CI

UNIT: "The change", 1, the `.claude/settings.json` block.
VERDICT: red.
REQUIREMENT: Acceptance criteria 1 and 9 (one hash, CI green); the spec says the file is used as written.
REASON: Biome checks `.claude/` and would reformat the inner `hooks` array, so `biome check .` (`pnpm lint`) fails.
EVIDENCE: the block copied byte for byte into AutomataFramework's `.claude/settings.json` and checked with
`npx @biomejs/biome@2.5.15 check .claude/settings.json` (the version in `biome.json`): "Formatter would have printed
the following content", collapsing lines 7 to 9 into
`"hooks": [{ "type": "command", "command": "cat \"$CLAUDE_PROJECT_DIR/.claude/after-compaction.md\"" }]`. All four
CI repos run `biome check .` with `lineWidth` 110 and include `**`.
EXPECTED: the spec's block is already in Biome's format, so the five files are identical and lint passes.
FIX: in the spec only, replace the three `"hooks": [ ... ]` lines with the single line Biome prints above.

### R2. The "Live state" heading breaks `progress.md`'s outline

UNIT: "The change", 3.
VERDICT: red.
REQUIREMENT: `CLAUDE.md`, "Keep a visible record" (`progress.md` holds the active milestone with its decisions).
REASON: a `## Live state` placed between `### Previews` and `### Material decisions` ends the `## Active milestone`
section, so "Material decisions" (and Editors' "Open items") would sit under "Live state".
EVIDENCE: on every `main`, `progress.md` has `## Active milestone: ...` and below it `### Previews` then
`### Material decisions` (Framework lines 38/42, Editors 71/76 plus `### Open items` at 98, Examples 30/34, Site 28/32,
Private 26/30).
EXPECTED: "Live state" sits in the outline without moving other sections.
FIX: in the spec only, either put `## Live state` after the whole active-milestone section (end of file) or make it
`### Live state` with `####` per-branch blocks; update 3, the reminder text if it names the place, and criterion 6.

### R3. Live-state blocks on parallel branches collide in one shared file and land on `main`

UNIT: "The change", 2 (the **Live state in a file.** bullet) and 3.
VERDICT: red.
REQUIREMENT: the Owner's "live state in a file", which must work with up to three writing sessions at once
(Settings), and `CLAUDE.md` "Writing" (one writer per branch, the coordinator the only writer of `progress.md`).
REASON: each writing session adds its `### <branch>` block at the same spot in `progress.md` on its own branch, and
the rule says the block "is removed when its pull request merges" without saying who removes it or on which branch.
EVIDENCE: `progress.md` changes reach `main` through pull requests (for example Editors #100, "record #98 merged").
Two branches inserting at the same lines conflict when the second merges, and the coordinator edits the neighbouring
"Previews" and "Material decisions" lines often. A block still in the file at merge time lands on `main` and is stale
at once; removing it afterwards needs another commit to `main`.
EXPECTED: a session's live state never conflicts with another session's and never reaches `main`.
FIX: in the spec only, keep each session's live state in its own file, `docs/superpowers/live/<branch>.md`, deleted
in the pull request's last commit before merge (or, keeping `progress.md`, say the block is deleted in that last
commit and accept the conflicts). Update 2, 3, the reminder text (item 3), Boundaries, criteria 6 and 7 and check 4.3
to match.

## Notes

1. **Ordering list is stale.** Plan 2 lists Framework #202 and Examples #67 as open; both merged at 20:30 UTC. Still
   open: Editors #99 (slice retro), and for the layout sketch spec #203, Private #14 and its four pull requests to
   come. The order itself is right.
2. **No pull-request slot in AutomataFramework.** It has three open pull requests now (#203, #204, #205), the limit in
   Settings, and the layout-sketch build adds one before this build starts. Plan 2 should say the Framework build
   waits for a slot.
3. **Criterion 9 cannot hold for AutomataPrivate.** It has no `.github/workflows/`, so no CI runs on its pull request.
   Say that criterion 4 stands in for it there.
4. **The test file must be self-contained.** Criterion 1 wants one hash for the four test files, so the test may import
   nothing repo-specific (Site has its own `tests/workflows/read.ts`) and must pass each repo's Biome and knip.
5. **Who writes the spec is an agent-selected reading.** Moving spec writing from the coordinator to a spec session
   (table row 1 and the coordinator bullet) follows from "fresh session per big job", but it changes the Owner's own
   rules text beyond the three named rules. Report it to the Owner as a material decision, per "Expose decisions".
6. **Open product decision 1 needs a decision card.** The game template question is the Owner's; ask it now with the
   recommendation, instead of leaving it in the spec until someone asks.
7. **History placement fallback contradicts Plan 2.** "The change", 5 allows placing the entry after the slice-retro
   one if the layout sketch has not merged, but Plan 2 does not start until it has. Harmless; drop one of the two.
8. **The audit file name.** The coordinator asked for `<date>-1-compaction-hook-plan-audit.md`; the stage table in
   `CLAUDE.md` gives `<date>-<cycle>-plan-audit.md` and earlier audits here use
   `<date>-<topic>-plan-audit[-cycle-N].md`. This file follows the coordinator's name.
