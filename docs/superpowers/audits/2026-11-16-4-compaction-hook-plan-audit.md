# Plan audit, cycle 4: a reminder after compaction, live state in a file, a fresh session per big job

- Examined: AutomataFramework #204 at `ba1b61e`, `docs/superpowers/specs/2026-11-16-compaction-hook-design.md`, and
  its diff from `92ac328` (cycle 3 passed the spec at `90f8888`; `92ac328` only corrects that audit).
- Against: the Owner's decision-card answers of 2026-11-16 20:46 UTC as the coordinator relayed them (the website change
  as proposed, the games prompt's limit raised to 380, a setup-check line in the kits' `release` skill, spec writing in
  its own session, `mcthaydt-website` #67 first); the proposal
  `/mnt/project-files/proposals/2026-11-16-website-compaction-hook-proposal.md`; `CLAUDE.md` and the `review` skill;
  and `mcthaydt-website` `main` at `fcdcc0b` and #67 at `17db1c9`, fetched at 2026-11-16 20:49 UTC.
- Verdict: **not ready, 2 red, 5 notes.** The diff matches the Owner's answers and the proposal; the two reds are a
  history entry that leaves out the 20:46 approval, and a criterion that cannot pass as written.

## What was checked and holds

- **The answers are all in.** "Owner approval" records the 20:41 message and the 20:46 answers (a), (b) and (c);
  open decision 1 is marked decided; section 5 E raises the games limit to 380; 5 D adds the setup-check line, in the
  proposal's words; Plan step 2 and section 5 put #67 first.
- **Section 5 matches the proposal.** A is the proposal's A1 to A6 by reference to section 2; B is B1 and B2 with the
  same notes and the games-only skills list; C is C; E is D plus the 380 limit and the setup-check test.
- **The text section 5 replaces is in both kits at #67.** In each kit's `body.md` at `17db1c9`: "Acceptance criteria
  come first" (once), the Lane 3 phrase "the owner (CLAUDE.md and the skills, even though they are `.md` files)",
  table row 1 "The coordinator, with the owner (superpowers brainstorming)", "only writer of `progress.md`", "writes the
  spec, creates" and "specs/, audits/, progress.md and history.md" all match (games lines 189, 267, 277, 282, 234;
  apps 175, 247, 257, 262, 215).
- **#67 does not overlap.** Its hunks in the games kit are at old lines 46, 155, 167, 287 (the Delegation bullet and
  Retro), 351 (Settings), 682 and 690; none touches a line section 5 edits.
- **The line counts.** The `CLAUDE.md` block (between the four-backtick fences) is 342 lines in games and 319 in apps
  at #67, so about 365 and 342 with the change: under 380 and under 360.
- **The skills lists.** The apps kit's skills are review, release and visual-check, as the shared reminder says; the
  games kit adds vertical-slice and scene-polish, as 5 B says. Each kit's `release` skill has a "Setup check" list for
  5 D's line (games line 455, apps line 432).
- **The meta words.** Both `meta.json` summaries hold "plus five skills" and "plus three skills", which C extends.
- **No CI in `mcthaydt-website`.** It has no `.github/workflows/` and has `netlify.toml`; `content:check` is a script
  in `package.json`. Criterion 10's reading holds.
- **Numbering.** Old criterion 9 is now 10; nothing else in the spec cites a criterion by number except 3, 4 and 9,
  which are right.

## Red

- **R5**
  - UNIT: the spec, "4. The history record".
  - VERDICT: red.
  - REQUIREMENT: `CLAUDE.md`, "Three different yeses": "Each approval is recorded with its scope: what it covers, and
    the document or commit."
  - REASON: the entry the five `history.md` files will carry still says "Approved in the project thread at 20:28 and
    20:29 UTC" and names three changes, but the change now also moves spec writing off the coordinator, which was the
    agent's reading until the Owner said yes at 20:46 (open decision 1).
  - EVIDENCE: section 4, unchanged by `ba1b61e`, against "Owner approval" (a) and open decision 1 at `ba1b61e`.
  - EXPECTED: the record names every approval the change rests on.
  - FIX: in section 4's quoted entry, add "and spec writing in its own session" to the list and make the times "20:28
    and 20:29 UTC, and on decision cards at 20:46 UTC". Only the spec.

- **R6**
  - UNIT: the spec, acceptance criterion 9.
  - VERDICT: red.
  - REQUIREMENT: `CLAUDE.md`, "Acceptance criteria come first": criteria a program or a person can observe.
  - REASON: "the two kits' shared text matches the five repos' word for word" fails if read literally, because the
    games kit's reminder line 2 differs from the five repos by design (5 B), and "shared text" names no set of pieces.
  - EVIDENCE: criterion 9 against 5 B, "In the games kit, the reminder's line 2 ends '(review, release, visual-check,
    vertical-slice or scene-polish)'".
  - EXPECTED: a criterion that passes when the plan is followed and fails otherwise.
  - FIX: name the pieces: the three bullets and the five replacements in 2 match the five repos word for word; the
    settings block matches `.claude/settings.json`; the reminder matches `.claude/after-compaction.md` except the games
    kit's line 2. Only the spec.

## Notes (recorded, not blocking)

1. **"Five" left over.** "Outcome" still says "the same in all five repos", and Plan step 5 says "across the five pull
   requests" while "Lane and path" says "across all six". Step 7's "as in 5" means the build in step 3; "as in 3 to 5"
   reads right.
2. **Expected duration.** "About two hours" was written for five pull requests; the sixth waits on #67 as well.
3. **The repo's name.** "`McThayDT-Website` #67" in "Owner approval", Plan step 2 and section 5, and
   `mcthaydt-website` everywhere else. GitHub's name is `mcthaydt/mcthaydt-website`; one spelling throughout.
4. **The test's name.** The limit lives in a test called `..._first_under_360_lines` (`kit-content.test.ts` line 16);
   5 E should say the name moves with the number.
5. **Boundaries and the skills.** "Not the three skills" is about the five repos, and 5 D edits the kits' `release`
   skill; the file list holds (the skill is inside `body.md`), but the website bullet could say "including the setup-
   check line in 5 D" so the two do not read as a contradiction.
