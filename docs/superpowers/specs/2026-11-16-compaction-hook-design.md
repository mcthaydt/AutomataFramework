# A reminder after compaction, live state in a file, a fresh session per big job

## Outcome

When a session's context is compacted, the session is told at once that the rules file beats the summary, and where to
find its place again. Every session keeps its live state in a committed file instead of only in its context. Each big
job runs in its own fresh session. The three changes are the same in all five repos, so a session behaves the same
wherever it works.

## Owner approval

- 2026-11-16 20:28 UTC, project thread: "Add a new hook: after compaction saying 'the rules file beats the summary'.
  Live state in a file. Fresh session per big job."
- 2026-11-16 20:29 UTC, project thread: "add the repo when we get there, we have a claude.md for games and claude.md for
  apps prompts, it needs to be in both". "The repo" is `mcthaydt-website`, which is not in the project yet; see Plan.

Both cover this change only. The implementation pull requests are lane 3 and wait for the Owner's approval of the
finished result before they merge.

## Lane and path

Lane 3 (`CLAUDE.md`, and a hook in `.claude/settings.json`, which runs a command at the start of every session),
staged path: this spec and its plan audit, then one implementation pull request per repo with one implementation audit
across all five, then the Owner's approval, then a merge commit.

## Boundaries

- Repos: AutomataFramework, AutomataFrameworkEditors, AutomataFrameworkExamples, AutomataFrameworkSite and
  AutomataPrivate.
- Files, in each repo: `CLAUDE.md`, `.claude/settings.json`, `.claude/after-compaction.md` and
  `docs/superpowers/history.md`. In the four repos with CI also `tests/workflows/compaction-hook.test.ts`. Nothing
  else, apart from this spec and its audits. `progress.md` is not edited: live state goes in files under
  `docs/superpowers/live/` that sessions create and delete on their own branches.
- Not the three skills: the reviewer's live state is a rule in `CLAUDE.md`, so `review/SKILL.md` stays as the
  slice-retro change leaves it. Not `template/` in AutomataFramework: see "Open product decisions".
- No new tools, dependencies, environments or spend. The hook runs `cat` on a committed file and nothing else; it
  reads no network and writes nothing. Expected duration: about two hours, most of it waiting on audits and CI.

## Where the two prompts live

The Owner named a CLAUDE.md prompt for games and one for apps. Looked for in all six repos in the project
(AutomataFramework, Editors, Examples, Site, Private and the archive AutomataFrameworkFailed), by file name and by text:

- The only game-facing one is AutomataFramework's `template/AGENTS.md`, with `template/CLAUDE.md` containing only
  `@AGENTS.md`. `automata create` writes both into every new game. It is for a person's game, not a rule for these
  repos.
- No CLAUDE.md or prompt for apps exists in any of the six repos. The Owner's own rules text, saved as
  `handoff/2026-11-16-owner-message.md` in the project files, is the one generic CLAUDE.md template, and each repo's
  `CLAUDE.md` came from it.

So the pair is most likely in `mcthaydt-website`, the repo the Owner said to add. This change covers it as a follow-up
(Plan, step 7). The game template here is an open decision below.

## The change

Every edited paragraph is rewrapped to 120 columns. The new text is the same in all five repos.

### 1. The hook (all five repos)

`.claude/settings.json`, new, already in Biome's format (checked with `biome check`, the version in `biome.json`):

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [{ "type": "command", "command": "cat \"$CLAUDE_PROJECT_DIR/.claude/after-compaction.md\"" }]
      }
    ]
  }
}
```

A `SessionStart` hook with the matcher `compact` runs after a compaction, whether automatic or by `/compact`, and what
it prints goes into the session's context. It does not run at a normal start, a resume or a clear.

`.claude/after-compaction.md`, new, the text the hook prints:

```
Your context was just compacted. Read this before you do anything else.

1. The rules file beats the summary. Where CLAUDE.md or a skill in .claude/skills/ says one thing and the summary says
   another, CLAUDE.md and the skill win. The summary is someone's note about the rules, not the rules.
2. Re-read CLAUDE.md and docs/superpowers/progress.md now, before your next step. Open the skill for the work you are
   in (review, release or visual-check).
3. Your live state is in docs/superpowers/live/<your branch>.md, with "/" in the branch name written as "-" (the
   branch is `git branch --show-current`): your task, your last commit, your next step and your open decisions. An
   audit session keeps it at the top of its audit file. Where the summary and that file differ, the file wins. If it
   is behind what you did, update it and commit it first. The coordinator's live state is progress.md.
4. Do not carry this session into the next big job. A spec, a plan, a pull request's build and an audit each run in a
   fresh session. When your job is done, commit, report and stop.
```

### 2. The rules in `CLAUDE.md` (all five repos)

"How work goes", after the **Acceptance criteria come first.** bullet, three new bullets:

> - **Live state in a file.** A session keeps its live state in a committed file, never only in its context: its current
>   task, its last commit, its next step and its open decisions. A session that writes keeps it in its own file,
>   `docs/superpowers/live/<branch>.md` (the branch name with "/" written as "-"), so two sessions never touch the same
>   file; it updates and commits that file at each milestone, reading the commit from `git rev-parse --short HEAD` and
>   the time from `date`, never typing them. The session deletes the file in its last commit before it hands the branch
>   to the audit (or, with no audit, before the merge), so the commit the audit and the owner's approval name is the one
>   that merges and the file never reaches `main`; a fix session writes it again and deletes it the same way. The
>   outcome goes to the coordinator's report and `progress.md`, as before. A reviewer, which
>   changes nothing but its audit file, keeps the same four lines at the top of that file and removes them when the
>   audit is done. The coordinator keeps `progress.md` and needs no such file.
> - **The rules file beats the summary.** A compaction summary is a note about the rules, not the rules. Where it and
>   `CLAUDE.md` or a skill differ, `CLAUDE.md` and the skill win, and where it and the live state differ, the live state
>   wins. A hook in `.claude/settings.json` says so after every compaction and sends the session back to `CLAUDE.md`
>   and `progress.md`; a session that has been compacted without it does the same on its own.
> - **Fresh session per big job.** A big job (a spec, a plan, the build of one pull request with its fixes, an audit)
>   runs in its own fresh session, started from the committed files its prompt names. A session never goes on into the
>   next big job: when its job is done it commits, reports and ends. The coordinator is long-lived because it starts,
>   tracks and reports on jobs and does none of them. A job that outgrows its context is refreshed under Session
>   refresh in Settings, with a handoff, and that is the only reason a job spans two sessions.

"Risk", Lane 3, "and a change to the rules that decide what needs the owner (CLAUDE.md and the skills, even though they
are `.md` files)" becomes "and a change to the rules that decide what needs the owner, or to the hooks sessions run
(CLAUDE.md and the skills, even though they are `.md` files, and `.claude/settings.json`)".

"The staged path", the table row 1 "Who" "The coordinator, with the owner (superpowers brainstorming); a plan session
adds the plan when the approach is uncertain (superpowers writing-plans)" becomes "A spec session the coordinator
starts, with the owner (superpowers brainstorming); a plan session adds the plan when the approach is uncertain
(superpowers writing-plans)".

The **Writing.** bullet: the sentence "The coordinator is the only writer of `progress.md` and `history.md` while
active, including for delegated short-path work." becomes "The coordinator is the only writer of `progress.md` and
`history.md` while active, including for delegated short-path work; each session's own live-state file in
`docs/superpowers/live/` is the exception, written only by that session."

The **coordinator** bullet: "It talks with the owner, writes the spec, creates" becomes "It talks with the owner,
creates", since "starts each stage's session" already covers the spec session.

### 3. The check (Framework, Editors, Examples, Site)

`tests/workflows/compaction-hook.test.ts`, written first and seen to fail before the files exist, the same text in each
repo. It imports only `vitest` and Node's own modules, nothing from the repo, so the four copies are identical, and it
passes that repo's Biome and knip. It checks that:

1. `.claude/settings.json` parses, has exactly one `SessionStart` entry, its matcher is `compact`, and it holds one
   command hook.
2. Run with `CLAUDE_PROJECT_DIR` set to the repo's root, that command exits 0 and prints exactly
   `.claude/after-compaction.md`.
3. The reminder says "beats the summary" and names `CLAUDE.md`, `docs/superpowers/progress.md` and "fresh session".
4. Each path the reminder names exists in the repo: `CLAUDE.md`, `docs/superpowers/progress.md`, `.claude/skills/`
   (`docs/superpowers/live/` is made by the sessions, so it is not required to exist).

AutomataPrivate has no code, no tests and no CI, so it has no test file; its pull request shows the same four checks
run by hand and the output (see the acceptance criteria).

### 4. The history record (all five repos)

`docs/superpowers/history.md`, under "Rule changes", after the layout-sketch entry, add:

> - 2026-11-16, the Owner: a reminder after compaction that the rules file beats the summary (a `SessionStart` hook
>   with the matcher `compact`), live state in a file, and a fresh session per big job. Approved in the project thread
>   at 20:28 and 20:29 UTC. Scope: this change only, made the same in all five repos, as AutomataFramework
>   `docs/superpowers/specs/2026-11-16-compaction-hook-design.md` describes. Later rule changes are lane 3 as usual.

## Acceptance criteria

1. `md5sum` over the five `.claude/settings.json` files gives one hash, and likewise over the five
   `.claude/after-compaction.md` files and the four `tests/workflows/compaction-hook.test.ts` files.
2. Each repo's `CLAUDE.md` diff against `main` holds only the edits in 2, and no edited line is over 120 columns.
   `.claude/settings.json` passes `biome check` in the four repos that run it.
3. In each of the four repos with CI, the new test fails on `main` plus the test alone, and passes with the change.
4. In AutomataPrivate, the pull request body shows `jq` on `.claude/settings.json` printing matcher `compact` and one
   command hook, and the command, run from the repo's root with `CLAUDE_PROJECT_DIR` set, printing the reminder
   byte for byte (`diff` finds nothing).
5. In a real Claude Code session in this repo, `/compact` makes the reminder appear in the context (checked once, by
   asking the session what it was told after compaction), and a normal start and a resume print nothing from it. If the
   runtime cannot run a hook, the pull request says so and criterion 3 stands in for it.
6. The "Live state in a file" bullet names `docs/superpowers/live/<branch>.md`, the reminder names the same path, and
   no pull request edits `progress.md`.
7. Each pull request's diff touches only the files in Boundaries.
8. Every commit is authored and committed by McThayDT with no Claude credit; each pull request body ends with
   `Requested by **McThayDT**`; each merges with a merge commit after the Owner approves.
9. CI is green on each pull request in the four repos with CI; AutomataPrivate has no CI, so criterion 4 stands in
   for it there. Nothing runs on the Owner's computer.

## Plan

1. Merge this spec with its plan audit on green. The audit is made by a fresh session the coordinator starts, never by
   the session that wrote this spec.
2. Order. The edits touch `CLAUDE.md` and `history.md`, which the layout-sketch change (spec #203, its Private pull
   request #14 and the four to come) and, in Editors only, the slice-retro pull request #99 also edit (the other four
   slice-retro pull requests have merged). Start each repo's implementation only after those have merged, branching
   from that `main`, and put the `history.md` entry after theirs. AutomataFramework is at its three-pull-request limit
   (#203, #204 and #205), so its build also waits for a free slot. The five repos need not start together.
3. In each repo, on its own branch from `main`: write the test first and see it fail (four repos), then the hook, the
   reminder, the rules and the history entry. One pull request each, a draft until the last push, bodies
   naming the footer mid-sentence if at all.
4. Check the acceptance criteria with `md5sum`, `jq`, `awk` (line length) and the new test, and wait for green on
   GitHub's runners.
5. One implementation audit across the five pull requests by a fresh session, through the coordinator; fixes on the
   same branches by this session's successor build session.
6. The Owner's approval through the coordinator, then each merges with a merge commit.
7. Follow-up, when `mcthaydt-website` is added to the project: find its CLAUDE.md prompts for games and for apps, and
   give each the three rules in 2 (not the hook, which is a settings file, unless those prompts ship one). A new spec
   amendment names what was found, and that pull request goes through the same stages.

## Open product decisions

1. **Who writes the spec.** "Fresh session per big job" moves spec writing from the coordinator to a spec session the
   coordinator starts (table row 1 and the coordinator bullet in 2). It follows from the Owner's rule but is the
   agent's reading, beyond the three rules named; the coordinator reports it to the Owner as a material decision.

2. **Does the framework's game template get the same three rules?** `template/AGENTS.md` (what `automata create` writes
   into every game, with `CLAUDE.md` importing it) is the only game-facing prompt in these repos. It would need its own
   reminder text, since a game has no `docs/superpowers/` (`AGENTS.md` and a `PROGRESS.md` at the game's root), and it
   changes what `create` writes, so the create tests and the tarball file list move: lane 2 by `template/`. Not
   included above because the Owner's prompts are most likely in `mcthaydt-website`, and a game-facing change is a
   product choice. Recommendation: yes, as its own pull request after this one, once the Owner says the template is one
   of the two prompts. Until then nothing changes there. The coordinator is asking the Owner.
