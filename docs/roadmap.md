# Roadmap

**Draft for the Owner's review.** One ordered list of everything in flight across the four public repos, so work
happens one thing at a time. Written 2026-11-15 from each repo's `docs/superpowers/progress.md`, the open pull
requests and the Owner's decisions so far. Where this page and a tracker disagree, the tracker has the detail and this
page has the order.

## How the queue works

1. **One item is worked at a time:** the top one. The next starts only when the top one is done, or is parked waiting
   on the Owner.
2. **Waiting on the Owner parks an item; it does not open a second one.** While an item waits for the Owner's answer,
   the next item may start, but no more than one item is ever waiting at once.
3. **Anything new goes to the bottom,** unless the Owner moves it up. A new idea found along the way is written under
   "Later", never started.
4. **"Done" is merged to `main` and green there,** plus the Owner's word where the item says so.
5. **Branches stay at five or fewer** per repo (the rule in `CLAUDE.md`). A paused item keeps no open pull request.
6. **Framework and demo come before the editors,** except the mockups, which the Owner put first (2026-11-15). No
   editor code is written until the Owner approves the mockups.

## The queue

| # | Item | Repo | Stage now | Done means | Who decides |
|---|---|---|---|---|---|
| 0 | **Clear the desk** | all | — | AF 147 (Scenes fixes I2 to I4 and nine minors, green, no golden) merged; Editors 50 (the revert of Editors 28 and 45) merged; AF 142 (the input's hint counts, from plan U's audit) green and merged; the stale drafts decided (see "Waiting on the Owner", 3) | merge session; Owner for 3 |
| 1 | **Shell and World mockups** | Editors (PR 34) | Grill round 1 written (33 findings, 12 High; Pencil 13 more); fixes next | Round 1 fixes in, then the review gate: an Opus plain-words audit and two Fable design loops with fixes after each, then a re-grill, then the Owner. Repeat until the Owner says the shell and World are **satisfied** | Owner |
| 2 | **Plan Q: the game checklist in every game** | AF | Stage 4 at 52%; PRs 1, 2a, 2b merged | Resume at Task 14 (PR 3, the template on `startFlow`), then PRs 4 and 5, then the implementation audit and its fixes. PR 3 moves `template/replays/level-1.json`: held until the Owner sees before and after | Owner (the golden) |
| 3 | **Demo Part 4: three levels, the door, playing together** | Examples (PR 41) | PR A up; re-records five replays | Owner says yes to the moved replays, PR A merges, then PR B (the page: level changes, teaching steps, journeys) after its short plan addendum | Owner (the goldens) |
| 4 | **Scenes fix I1: photo materials** | AF | Not started; diagnosis in the tracker's stage 6 handoff | One PR from `main`; moves `tests/golden/scene-art.json`, so the Owner sees before and after first | Owner (the golden) |
| 5 | **Links on things and the world map** | AF (PR 149, draft) | Spec written, paused, 8 questions withdrawn | The 8 questions answered, the spec merged, then plan, plan audit, build, audit, fixes. The demo then uses it (a button opens a door; two levels joined by a door) | Owner (the 8 answers) |
| 6 | **Finish the framework's paused builds**, one at a time: story (plan T, AF 64), sound formats (plan M, AF 125), feel runtime (plan F, AF 120), rigged figures (plan R, AF 124) | AF | Each in stage 4, part built, paused | Each restarted from `main`, built, audited, fixed and merged in that order; each one's demo part (below) follows it before the next starts | coordinator |
| 7 | **Demo Parts 5 to 8**, each right after the framework work it uses: sound (5), feel (6), story (7), screens, saves and "What's inside" (8) | Examples | Not started | Each part merged with its goldens seen by the Owner | Owner (the goldens) |
| 8 | **Mockups for Characters, Feel, Sound and Story**, one editor per round, the same gate as item 1 | Editors | Waiting for item 1 | Owner satisfied with each, in that order. Characters and World's Scenes come first because the demo's real art needs the builders | Owner |
| 9 | **The 2D figure and environment builders** (the first editor code, after the mockups) | Editors, AF | Specs written; build stopped by the hard stop | Editor specs and plans updated from the approved mockups, audited, then the shell first, then the builders | Owner |
| 10 | **Demo Part 9 (real art) and Part 10 (the close)** | Examples | Waits for item 9 | An agent drafts every figure and scene in the builders; the Owner finishes them; the M2 "Done means" list is true on `main`; the Owner plays the demo and says it is fine | Owner |
| 11 | **Release 1: 2D finished** (the framework in full and the demo game) | AF, Examples | — | The Owner starts `release.yml` by hand | Owner |
| 12 | **Release 2: the 2D editors** | Editors | — | The rest of the five editors, in the Owner's order (World's Levels, then Feel with Tuner, then the rest), each through every stage | Owner |
| 13 | **Release 3: the website** | Site | The sales site's spec is done (Site cycle 4) | Planned and built once the demo has landed; live on Cloudflare Pages | Owner |
| 14 | **Release 4: distribution** | all | — | Games ship to web, itch.io, Wavedash (if its rules fit) and desktop; the editor app ships as a Tauri app | Owner |
| 15 | **Release 5: 3D** | new repos | — | 3D as its own layer on top, then the loop repeats | Owner |

## Waiting on the Owner

1. **Mockups:** the shell and World are next to show you, once item 1's gate has run. Nothing to answer tonight.
2. **Goldens to see before they merge:** demo Part 4's five replays (Examples 41); plan Q's template recording (PR 3,
   not built yet); Scenes I1's `scene-art.json` (not built yet).
3. **The old drafts:** AF 64 (story), 120 (feel runtime), 124 (rigged figures), 125 (sound formats) and Editors 12 (the old Blueprint build). Suggested: tag each branch so nothing is lost, close the
   pull requests, and restart each from `main` when its turn in the queue comes. That brings AutomataFramework back
   under five branches.
4. **The world map spec's 8 questions** (AF 149), asked again when item 5 starts: value labels stay untranslated; a
   plate and a button are one `switch` part; levels join only through doors; a door takes every player; level
   pictures are never committed; the template stays one level; moving platforms come later; `one-per-level`.
5. **Owner reviews still owed** (stage 7 of finished cycles): the built-in hero, no default language, live move
   numbers, the default game flow, and the Site and Examples cycles near 90%. Suggested: one review sitting after
   item 3, from one screenshot page.
6. **This page:** is this the order you want? Move anything, and it becomes the order.

## Later

New ideas land here and wait until the Owner moves one into the queue.
