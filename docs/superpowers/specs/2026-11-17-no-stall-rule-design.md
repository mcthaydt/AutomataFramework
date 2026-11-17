# No stalls: watch CI in the foreground, and nudge a silent session

The build session commits this file as `docs/superpowers/specs/2026-11-17-no-stall-rule-design.md` in AutomataFramework.

## Outcome

Work no longer sits for hours. A session waiting on CI watches the run itself and acts the moment it ends, and whoever
leads the work checks on running sessions every 20 minutes, nudges a silent one and reports one that stays silent. The
words are the same in all five repos and in the website's two CLAUDE.md kits (games and apps).

## Why

On 2026-11-16 and 2026-11-17 sessions ended their turn to wait for CI, the wake that says "CI is done" did not arrive,
and nobody noticed the silence. One pull request sat green and unmerged for over two hours. Two sentences in today's
rules can be read as "end your turn and wait", so they are replaced, not only added to.

## Owner approval

- 2026-11-17 00:42 UTC, project thread: "Add the nudging too, let mcthaydt-website add it to Claude.md apps and games".
- 2026-11-17 00:47 UTC, decision card, as the coordinator passed it on: "Approve, with the extra". It covers the exact
  text in `proposals/2026-11-17-no-stall-rule-proposal.md` (project files): the `release` skill's line changes too, the
  sentence for a session that stays silent after a nudge is added, and the check-in interval is 20 minutes.

Both cover this change only. The implementation pull requests are lane 3 and wait for the Owner's approval of the
finished result before they merge.

## Lane and path

Lane 3 (`CLAUDE.md` and a skill), staged path: this spec and its plan audit, then one implementation pull request per
repo with one implementation audit across all six, then the Owner's approval, then a merge commit.

## Boundaries

- Repos: AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples, AutomataFrameworkSite, AutomataPrivate
  and `mcthaydt-website`.
- Files, in each of the five repos: `CLAUDE.md`, `.claude/skills/release/SKILL.md`, `docs/superpowers/history.md`, and
  the session's own live-state file while it works. Nothing else, apart from this spec and its audits in
  AutomataFramework.
- Files, in `mcthaydt-website`: `content/prompts/claude-md-games/body.md`, `content/prompts/claude-md-apps/body.md` and
  `tests/unit/kit-content.test.ts`. Nothing else.
- Not changed: the compaction hook's files, the kits' two hook blocks and "Project instructions", either kit's
  `meta.json`, and `skills/` and `template/` in AutomataFramework (they ship to games, a product choice nobody asked
  for).
- No new tools, dependencies, environments or spend. Expected duration: about two hours, most of it waiting on audits
  and CI, watched in the foreground.

## The change

Every edited paragraph is wrapped to 120 columns. The text is one text, used seven times: five repos and two kits. In a
kit, "`CLAUDE.md`" below means its "CLAUDE.md" block and "the `release` skill" means its "Skill: release" block.

### 1. `CLAUDE.md`, "How work goes"

One new bullet after **Fresh session per big job.** It goes here, not under "The staged path", because short-path work
waits for CI too.

```
- **No stalls.** A session never ends its turn only to wait for CI: the wake that says CI is done can fail to arrive,
  and the work then sits. It watches the run in the foreground (`gh pr checks <number> --watch` or `gh run watch`, with
  a long timeout) and acts the moment it ends: on green it takes its next step, on red it fixes. While work is running,
  the coordinator, or any session that leads others, schedules its own check-in at the check-in interval in Settings,
  and nudges any session that has been silent that long. A session that does not answer a nudge by the next check-in is
  reported to the owner, and its work is handed to a fresh session.
```

### 2. `CLAUDE.md`, "The staged path", the last bullet

```diff
- - Each session's prompt names the files to read; sessions wait for CI results instead of repeatedly watching logs.
-   Waiting does not suspend the owner update interval.
+ - Each session's prompt names the files to read. A session watching CI reads a log only when a check fails, and
+   waiting does not suspend the owner update interval.
```

### 3. `CLAUDE.md`, "Settings"

One new bullet after "Owner update interval" and its blank line, before "Tries per problem":

```
- Check-in interval: 20 minutes while work is running. The coordinator, or any session that leads others, checks on
  every running session that often; one silent that long is nudged.
```

### 4. The `release` skill, "Fast CI (public repos on GitHub's runners)", the last bullet

```diff
- - Wait for the result instead of watching logs. Read a log only when a check fails.
+ - Watch the run in the foreground until it ends (`gh pr checks <number> --watch` or `gh run watch`, with a long
+   timeout), and never end the turn to wait for it. Act the moment it ends. Read a log only when a check fails.
```

### 5. The record (the five repos only)

`docs/superpowers/history.md`, under "Rule changes", after the compaction-hook entry:

```
- 2026-11-17, the Owner: no stalls. A session never ends its turn only to wait for CI, and the coordinator or lead
  checks on running sessions every 20 minutes, nudges a silent one, and reports one that stays silent. Asked for in the
  project thread at 00:42 UTC ("Add the nudging too") and approved on a card at 00:47 UTC ("Approve, with the extra").
  Scope: this change only, made the same in all five repos, as AutomataFramework
  `docs/superpowers/specs/2026-11-17-no-stall-rule-design.md` describes. Later rule changes are lane 3 as usual.
```

### 6. The website's test (`tests/unit/kit-content.test.ts`)

Written first and seen to fail before the kits change. One new test, run for both kits:

- The "CLAUDE.md" block has "**No stalls.**", "never ends its turn only to wait for CI",
  "`gh pr checks <number> --watch`", "nudges any session" and "is reported to the owner".
- Its Settings part has "Check-in interval: 20 minutes", and the text before Settings has no "20 minutes".
- The "Skill: release" block has "never end the turn to wait for it".
- No block has "sessions wait for CI results" or "Wait for the result instead of watching logs".

The existing tests stay as they are and must still pass: the block stays under 380 lines (364 becomes 372 in the games
kit, 340 becomes 348 in the apps kit, counted at #68's head `c32d313`), both kits share the workflow word for word, and
every number stays in Settings.

## Acceptance criteria

1. In each of the five repos, `grep` finds neither "sessions wait for CI results" nor "Wait for the result instead of
   watching logs" in `CLAUDE.md` or `.claude/skills/`.
2. Across the five repos, `md5sum` gives one hash for the "No stalls" bullet, one for the last bullet of "The staged
   path", one for the "Check-in interval" bullet, one for the "Fast CI" section of `release/SKILL.md`, and one for the
   new history entry.
3. Each repo's `CLAUDE.md` and `release/SKILL.md` diff against `main` holds only the edits in 1 to 4, and no edited
   line is over 120 columns.
4. In `mcthaydt-website`, the new test fails on `main` plus the test alone and passes with the change, and the whole
   `kit-content` suite passes. The "CLAUDE.md" block is under 380 lines in both kits, by the test.
5. The four bullets in the two kits are the same as in the five repos, apart from line wrapping if a kit wraps
   differently (compared with whitespace flattened).
6. Each pull request's diff touches only the files in Boundaries.
7. Every commit is authored and committed by McThayDT with no Claude credit; each pull request body ends with
   `Requested by **McThayDT**`; each merges with a merge commit after the Owner approves.
8. CI is green on each pull request that has CI (AutomataPrivate has none: `git diff --check` is clean and the change
   was read). The build session watches each run in the foreground, as this rule says. Nothing runs on the Owner's
   computer.

## Plan

1. Wait for the six compaction-hook pull requests to merge (AutomataFramework #208, Editors #104, Examples #70, Site
   #53, Private #15, website #68). They edit the same files. This spec was written against their heads `0a6361e`,
   `bd394e0`, `2ebdf1d`, `08f2a3c`, `1715521` and `c32d313`; if any changed before merging, re-read the four
   paragraphs above on `main` first and report a difference instead of guessing.
2. The build session opens one pull request in AutomataFramework that adds this spec at
   `docs/superpowers/specs/2026-11-17-no-stall-rule-design.md` and the plan audit (made by a fresh session, never by
   the session that wrote this spec) at `docs/superpowers/audits/2026-11-17-1-no-stall-plan-audit.md`, together with
   `2026-11-17-2-no-stall-plan-audit.md` and any later rounds, the last with no reds, and merges it on green before
   step 3.
3. In the website repo, on a branch from `main`: write the new test, see it fail, then edit both kits.
4. In each of the five repos, on its own branch from `main`: make edits 1 to 5. The commit that adds the
   history entry says in its message that the build session wrote it for the coordinator, as CLAUDE.md requires.
   One pull request each, six in all, a draft until the last push.
5. Check the acceptance criteria with `grep`, `md5sum`, `awk` (line length) and the website's test, and watch CI in
   the foreground to green.
6. One implementation audit across the six pull requests by a fresh session; fixes on the same branches.
7. The Owner's approval through the coordinator, then each merges with a merge commit. The website's pull requests are
   merged from the Owner's local session, where the Owner types the approval.

## Open product decisions

None. The three choices in the proposal were answered on the card at 00:47 UTC.

## Notes, not part of this change

- AutomataPrivate has no CI, so the CI half of the rule never fires there. It takes the same words so the five repos
  stay the same; the nudging half applies there as everywhere.
- The project's own memory already tells the coordinator to do both halves. Once this merges, the repos' copies are the
  rule and the memory entry can point at them.
