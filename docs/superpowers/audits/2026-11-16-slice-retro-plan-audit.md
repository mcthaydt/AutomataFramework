# Slice retro: plan audit

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

- Spec: `docs/superpowers/specs/2026-11-16-slice-retro-design.md` and the first retro
  `docs/superpowers/audits/2026-11-16-slice-3-retro.md`, at `6ef9c7c` (branch `claude/project-thread-aunp0i`, draft
  pull request #201, on `main` at `dc75be0`).
- The ask, read in the project chat: the coordinator's daily-retro proposal (19:17:42 UTC), the Owner's "yes" (19:17:54),
  "lets do self improving after every slice actually" (19:18:47), and "Addition ... Let's instead do this after the end
  of every slice." (19:20:37). The retro turns each lesson into a test where it can (the footer check, for example) and
  proposes the rest as one rule-change pull request for the Owner to approve.
- Read against: `CLAUDE.md`, `review/SKILL.md` and `history.md` on `main` in all five repos; the removed
  `commit-authors` files at each removal's parent; `/mnt/project-files/setup/owner-commands.sh`; and the blind-judge
  pull requests (Framework #200, Editors #97, Examples #66, Site #50, Private #12).
- Audited 2026-11-16 19:26 UTC.

## Verdict

Not ready to implement: 5 red, 6 notes. The direction matches the ask. The retro runs per slice, not daily, with tests
first and the rest as rule edits for the Owner. The reds are about how it fits the standing rules.

## What checks out

- The approval quotes and times in "Owner approval" match the project chat.
- Every text the spec replaces exists in all five `CLAUDE.md` files: the Slices bullet, "Rule edits: batched into one
  session a day." and the Graphify sentence in "Limits". The `review/SKILL.md` files are identical on `main` (md5
  `7ee0d978...` in all five), and line 71 holds "The next rule-edit session moves each into".
- The four removed `commit-authors` files exist at each named parent (`d3923ea^`, `1d2662d^`, `4fe1e3c^`,
  `30d6c6e^`), and each removal commit deleted them. The workflow, script and workflow test are identical in all four
  (md5 `329a4544`, `7d07131d`, `69a0abad`). Site's script test differs (`80bbe5e3`), which "each repo's own copy"
  allows for. No `knip.json`, `biome.json`, `package.json` or config change came with the removals, so a restore needs
  none.
- The old workflow already runs on `edited`, so acceptance criterion 6 (it passes once the footer is stripped) works
  without a manual rerun. The old script already fails on the footer as "a credit". The new last-line rule adds the
  positive check.
- `.vitest/` is ignored in Framework and Editors and missing in Examples, as the retro says.
- AutomataPrivate has no `.github/`, so leaving the check out there matches the repo.
- The spec leaves `visual-check/SKILL.md` alone, so it does not collide with the blind-judge change there.

## Findings

### 1

UNIT: spec, "The change" 1, the new "Slice retro" section in `review/SKILL.md` ("a fresh session (Opus, medium)").
VERDICT: red
REQUIREMENT: `CLAUDE.md` Settings: "Change a number or a model here and nowhere else."
REASON: The retro session's model is written into a skill, not into Settings.
EVIDENCE: the quoted section, first paragraph. Settings' "Models and effort" line names every other session's model.
EXPECTED: Settings gains "Slice retro: Opus, medium." The skill says "a fresh session" with no model.
FIX: add this as a fourth `CLAUDE.md` edit, drop "(Opus, medium)" from the section, and update acceptance criteria 2
("the four edits") and 3. Spec only.

### 2

UNIT: spec, "The change" 1, the Settings edit ("Rule edits: batched into one session a day; a slice retro's rule edits
are that day's batch.").
VERDICT: red
REQUIREMENT: the Owner's ask ("Let's instead do this after the end of every slice"); consistency with today's work.
REASON: The edit keeps the daily cap the Owner replaced and ties the retro to it. It breaks as soon as a slice closes on
a day that already had a rule change, which is today: the blind-judge change (#199/#200) and this retro are two
rule-edit batches on 2026-11-16.
EVIDENCE: Settings on `main`: "Rule edits: batched into one session a day." The blind-judge pull requests and this
spec both change rules today.
EXPECTED: "Rule edits: batched; each slice retro's rule edits are one batch, and a rule change the Owner asks for runs
on its own."
FIX: reword the Settings edit in the spec. Spec only.

### 3

UNIT: spec, "Slice retro" section (the record "in AutomataFramework"), and the first retro's evidence.
VERDICT: red
REQUIREMENT: the Owner's standing rule that the World handoff stays private: only AutomataPrivate may hold it, and the
real demo games are never named in a public repo. AutomataFramework is public; AutomataPrivate is private (`gh api`
`visibility`).
REASON: The retro reads AutomataPrivate's audits, `progress.md` and pull requests, and writes what it finds into a
public repo, with nothing that keeps private content out.
EVIDENCE: the section's first and fifth bullets. This first record cites Private only by pull request number (#10), so
nothing leaked this time, but the rule allows it.
EXPECTED: The section says that evidence from AutomataPrivate is cited in the public record by repo and pull request
number only. Anything more goes in a retro note in AutomataPrivate.
FIX: one bullet in the "Slice retro" section, and a matching clause in acceptance criterion 3. Spec only.

### 4

UNIT: spec, "Owner-only step, after the merges", the Editors line.
VERDICT: red
REQUIREMENT: `CLAUDE.md` "CLI first": give the Owner commands. The Owner's local session runs this block as given.
REASON: Editors gets a comment ("add the same context to the "required-checks" ruleset its setup created"), not a
command, so the block can't be run as written.
EVIDENCE: `setup/owner-commands.sh` created Editors' ruleset with `POST .../rulesets`, so its id isn't in any file.
EXPECTED: a command that looks the id up by name, for example `id=$(gh api repos/mcthaydt/AutomataFrameworkEditors/rulesets
--jq '.[] | select(.name=="required-checks") | .id')`, then the same GET, jq and PUT as Framework.
FIX: replace the comment with those commands in the spec. Spec only.

### 5

UNIT: spec, "The change" 2, the font lesson for Editors' and Site's `history.md`; retro problem 4.
VERDICT: red
REQUIREMENT: `review` skill, "Lessons": "A lesson is written down only when no test can catch it"; `CLAUDE.md`
"Lessons become tests first".
REASON: The retro's own evidence says both font failures were fixed "each with a test that delays the fonts", so a
test already catches it, and the lesson isn't allowed.
EVIDENCE: retro, problem 4: "fixed, each with a test that delays the fonts".
EXPECTED: No lesson. Either nothing is added, or, if new journeys could still skip the wait, a check makes them wait,
for example a shared journey helper that waits for `document.fonts.ready`, or a test that fails when a journey moves
on first.
FIX: drop the lesson and acceptance criterion 7's font clause, or replace them with a named check. Spec only.

### 6

UNIT: spec, "Outcome" and "Slice retro" ("one rule-change pull request per repo").
VERDICT: note
REQUIREMENT: the ask ("propose the rest as one rule-change PR for you to approve").
REASON: The Owner gets five pull requests, not one. It's unavoidable across five repos, but the spec doesn't say so.
EXPECTED: One line saying the edits are the same change in each repo, approved once for all five, as the blind-judge
change did.
FIX: wording. Spec only.

### 7

UNIT: spec, `history.md` "Rule changes" entry; overlap with the blind-judge pull requests.
VERDICT: note
REQUIREMENT: consistency with #200, #97, #66, #50 and #12, which add the same "## Rule changes" section after "Setup"
and add "rule changes" to `history.md` line 3.
REASON: "Whichever merges second adds its entry beside the other" covers the section, but not line 3. If this merges
first, line 3 is left stale. If both branch from today's `main`, they conflict on the same lines.
EVIDENCE: the blind-judge pull requests at `09f25d7`, `a0b7db0`, `c9a1b91`, `1505eed` and `7767891` (implementation
audit: 0 red, waiting on CI).
EXPECTED: The implementation branches start from `main` after the five blind-judge pull requests merge, and add one
entry under the existing "Rule changes" section. Line 3 already lists it.
FIX: one sentence in "Plan" step 2. Spec only.

### 8

UNIT: spec, "Slice retro" section ("after its design review loop in `visual-check`").
VERDICT: note
REQUIREMENT: the coordinator's confirmation to the Owner (19:18:59, 19:20:44): "right after the design review and
blind-judge round".
REASON: Once #200 merges, the loop includes step 4. The wording is right, but it doesn't say the blind judge runs first.
EXPECTED: "after its design review loop in `visual-check`, the blind judge included".
FIX: wording. Spec only.

### 9

UNIT: spec, "The change" 3 (the new last-line rule).
VERDICT: note
REQUIREMENT: the restored script's own rule: "Only the Owner's own commits are held to the name: everyone else keeps
theirs."
REASON: As written, the last-line rule applies to every pull request, including one from another account or a bot.
EXPECTED: The rule applies when the pull request was opened by `mcthaydt`. Acceptance criterion 4 adds a case where
another author's pull request passes without the line.
FIX: one clause in "The change" 3 and one case in acceptance criterion 4. Spec only.

### 10

UNIT: spec, "The change" 3; implementation pull request bodies.
VERDICT: note
REQUIREMENT: acceptance criterion 6.
REASON: The restored credit pattern matches any line that starts, after punctuation, with "Generated by Claude". A body
that describes this change with a bullet such as `- "Generated by Claude Code" footer` fails its own check.
EVIDENCE: `scripts/check-commit-authors.ts` at `d3923ea^`: `/^[^\p{L}\p{N}]*(generated|created|made|written|authored)
(with|by) \[?claude\b/iu`.
EXPECTED: The implementation bodies name the footer mid-sentence (for example "the Claude Code footer").
FIX: none in the spec. A note for the implementer's pull request bodies.

### 11

UNIT: AutomataPrivate.
VERDICT: note
REQUIREMENT: retro problem 1, which lists Private #10 among the pull requests that merged with the footer.
REASON: Private has no CI, so the restored check never runs there, and nothing will catch the footer in that repo.
EXPECTED: The retro record lists this under "Left as they are", with the reason (no CI in Private).
FIX: one line in the retro record. Docs only.
