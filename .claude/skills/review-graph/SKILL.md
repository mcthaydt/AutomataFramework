---
name: review-graph
description: Use when big or risky work needs reviewing (lane.mjs prints audit needed, or a mockup set), or a review's findings need fixing, code or visual. Runs independent find-only review lenses side by side, merges their findings with a script, then one scoped fix loop per finding (its files only, a capped number of tries, then report).
---

# The review graph

Small changes need no review sessions: the session that made one inspects it, fixes what it finds and rechecks, and
its checks are the gate. A review runs for big or risky work, when
`node .claude/tools/lane.mjs` prints `audit: needed` (wide or closed), and for every mockup set. A review is a small
graph. Each node is its own session with one job; only the arrows below carry anything.

```
            ┌─ lens A (find only) ─┐
split ──────┼─ lens B (find only) ─┼── merge (script) ── fix loop, one finding at a time ── gate (CI) ── Owner*
            └─ lens C (find only) ─┘          ▲                       │
                                              └──── back: that finding only, with its evidence
   * only for the finished result, or for the hard-to-undo lane (see docs/rules.md)
                      docs/constraints.md ◄── every accepted result's or repeated finding's cause (the learning edge)
```

## 1. Split (the coordinator)

Cut the work by what each lens can see that the others can't, never by folder. Lenses never wait for each other:
one node waits for another only if it reads that node's output, and the brief names what passes between them. Two or
three lenses, each with:

- one lens (the questions it asks), the files or screens in reach, the spec and plan sections it checks against;
- the lines of `docs/constraints.md` that apply, the rules earlier rounds learned;
- nothing from another lens. Lenses run at the same time, in their own threads, and never read each other's report.

Usual lenses. Code: **matches the spec and plan** (complete, nothing extra, every task's check exists) and
**correct and fits the codebase** (bugs, tests that can fail, patterns, the architecture rules). Visual: see the
`visual-review` skill. A plan: one audit lens, and only when the plan touches a format, the public surface, the sim
or a closed-lane file.

## 2. Lens (find only, Opus at medium effort)

Change nothing. Write one report to `docs/superpowers/audits/<date>-<cycle>-<lens>.md`, ending with the findings
table. One row per finding, in exactly this shape, because the merge step is a script:

```
| id | severity | file:line | finding | evidence | check |
| --- | --- | --- | --- | --- | --- |
| A1 | high | src/features/level/load.ts:88 | A door to a missing level loads | test `loads a missing door` returns ok | a failing test in tests/features/level/ |
```

- `severity` is `high`, `medium` or `low`. `file:line` is where the fix goes (a screen's file for a visual finding).
- `evidence` is what you saw: a test result, a line, a picture's name. No evidence, no finding.
- `check` is the program that will fail now and pass once fixed. "Looks right" is not a check; if no program can
  check it, write `owner look` and say why.
- A finding that needs an Owner choice says `owner choice` in `check`, with the options in the report above the table.

## 3. Merge (a script, never a model: merging, ranking and deduplicating have one right answer)

```
node .claude/tools/findings.mjs docs/superpowers/audits/<date>-<cycle>-*.md > docs/superpowers/audits/<date>-<cycle>-findings.md
```

It joins every lens's rows, drops repeats of the same `file:line` and finding, and sorts by severity. The fix session
reads only that file.

## 4. Fix loop (one session, Sonnet at high effort)

No findings means no fix round: the review is done. Fixes land on the same pull request as the work they fix, which
the lenses read as a branch; nothing merges in between.

One finding at a time, highest first. For each:

```
node .claude/tools/scope.mjs start A1 src/features/level/load.ts tests/features/level/load.test.ts
```

`start` names the finding's files and counts a try. While a finding is started, the guard hook refuses an edit to
any other file in the repo and the `pre-commit` hook refuses a commit of one. Then: write its `check` first (the
failing test), fix, commit with the finding's id in the message, and `node .claude/tools/scope.mjs done`.

- A fix that needs a file outside the scope is a new finding: stop, add a row, and give it its own scope.
- Push once all findings are done; CI is the gate. A red check sends back **only the finding it names**: `start` it
  again with the same id. The other findings stay as they are.
- `start` refuses a try past `fixTries` (`.claude/workflow.json`). Report that finding as stuck to the coordinator,
  in this shape, and go on with the next:

```
UNIT      A1
VERDICT   stuck after its tries
REASON    the check that still fails
EVIDENCE  expected / got, file:line
SCOPE     the files it was given
```

A stuck finding calls for reassessment, not another try: the coordinator looks again at the finding, the fix, the
plan and the spec. Repeated failure doesn't say which of them is wrong. An `owner choice` finding goes to the Owner with options while the rest are fixed.

## 5. Lessons become tests

When a fix confirms a cause, or the same finding comes back from a second round, turn the cause into a regression
test before closing the finding:

- first a program: a test, a rule in `tests/architecture/rules.ts`, a guard hook, a CI step;
- only if no program can see it, one line in `docs/constraints.md`: the date, the rule, and why. Keep the page short:
  a line a program now checks goes. A new rule in `docs/rules.md` is the last resort.

A verdict that does not change what runs next is only a report.
