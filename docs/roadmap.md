# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom.

**This is the only roadmap** (the owner, 2026-11-15). Every other copy (the project's files, the "needs you" board)
is copied from this file. Change this file first, then copy it everywhere else; a copy that differs is wrong.

## The rules

**Slices are editor-driven, one editor at a time** (the owner, 2026-11-15). Each editor is one slice, and every editor
slice runs the same six steps in order:

1. **Build in Automata.** The runtime and formats the editor needs, in AutomataFramework.
2. **Layout sketch.** In the editor's spec, a quick sketch of each screen that shows what goes where; no pixel
   mockups.
3. **Build the editor.** From its spec and sketches, in the editors' repo; the look is settled by the design review
   loop in step 6.
4. **Test the editor.** In real browsers on iPad sizes, with the journeys, until it is green on main.
5. **Update the website demo.** The demo on the site uses what the editor makes, so after every slice there is
   something new to try there. The demo grows with every slice; there is no separate demo slice at the end.
6. **Design review loop.** Every screen built in the slice goes through review, fix and recheck (the `visual-review`
   skill) until the recheck passes, recorded in `docs/superpowers/audits/<date>-slice-<n>-design-review.md` with a
   `Scope:` line (what it covered) and the line `Recheck: passed`. The slice does not close, and the next slice does not start, before that (the owner,
   2026-11-16).

Then the next editor starts. The editors go in this order: **World** (levels), **Characters**, **Feel** (with Tuner inside it),
**Sound**, **Story**, **Screens**: levels first, then who is in them, then how they move, then sound, then the story that
ties them together (the owner, 2026-11-15), then the screens and the game's flow, added as the sixth editor
(the owner, 2026-11-15). The shell is built with the first editor and every later editor reuses it, so
each later editor also follows the design language (see the rule below).

1. **One thing at a time.** There is one **Now**. Nothing else is built until it is done.
2. **Slices go in order.** A slice starts only when the one before it is merged and green.
3. **New ideas wait.** A new idea goes in "Not yet placed" at the bottom. It moves up only when the owner says where it
   goes.
4. **Designs can wait in line.** An approved design sits under its slice until that slice comes up. Approved is not
   the same as building.
5. "Done" means merged to main and green there. Nothing else counts as done.
6. **Work after the current slice stays off main.** Everything after the current slice is tagged and taken off main
   until its turn (AutomataFramework #153, Editors #54; the tag `archive/before-slice-cut` keeps it). Docs stay.
7. **The design language comes after the shell and World mockups were approved.** The owner asked (2026-11-15) for one
   document that defines the editors' design language and patterns, so later editors do not redo the work. It is written
   once the shell and World mockups are approved, in its own pull request, and every later sketch and build reads it
   first.
8. **One roadmap.** `docs/roadmap.md` in AutomataFramework is the only roadmap; update it first, and copy it
   everywhere else (the owner, 2026-11-15). Every repo's `CLAUDE.md` says so.
9. **Nothing private here.** This repo is public, so the roadmap uses plain, general words. Prices, the market and
   the real demo games' names are kept in the owner's private notes, and this page does not link to them.

**Who does what.** "Agents" means the project's sessions, each stage in its own: spec, plan, plan audit, build,
implementation audit, fixes, then the owner's review (the workflow in `CLAUDE.md`). The merge session merges each green
pull request. "The owner" means only the owner can do it: approve, decide, start a release, or give an account or a key.

How to read each list: **Done** is merged and green. **Now** is the one thing being built. **Next** is in line, in
order. **Waiting** is approved, but its turn has not come. **Later** is after the current slice: not worked on now.

## The four phases

The whole road, in four phases (the owner, 2026-11-15). The slices below are phase 1.

1. **The 2D editors, with a 2D test game.** The game in AutomataFrameworkExamples, and the one on the website, is a
   test game. It is not the real demo. Its job is to prove each editor and to find out what the editors must do to
   support a real game. The website keeps playing it until the real 2D demo game exists.
2. **A real 2D demo game,** made with the finished 2D editors. It starts only when phase 1 is done, and lives in
   AutomataFrameworkExamples under `demos/`.
3. **The 3D layer, with a 3D test game,** which proves the 3D editors the same way.
4. **A real 3D demo game,** made with the finished 3D editors.

The real demo games are named and planned elsewhere; nothing about them is worked on until their phase comes.

**Spikes, kept apart from the test game** (the owner, 2026-11-15). Each slice may try one small piece a real demo game
will need (a room put together from a seed, a chaser, a fact the story remembers) as a **spike**: its own small example,
never wired into the test game. The test game stays pure: it shows only how the framework's code and the editors
relate.

## The whole road at a glance

In order. Each line says who does it and where it stands today (2026-11-15).

| # | Step | Who | Where it stands |
|---|---|---|---|
| 1 | Slices 0 to 2: a game plays in the browser, made from its files | Agents | Done |
| 2 | Slice 3: World, the levels editor | Agents; the owner approves the mockups | **Now:** the mockups are approved (board v17, Editors #70); the design language, the framework's part (plan W) and the World editor's spec (Editors #74) |
| 3 | Slices 4 to 8: Characters, Feel, Sound, Story, Screens | Agents; the owner approves each finished editor | Later; specs and plans for 4 to 7 are done |
| 4 | Release 1: the framework in full and the 2D test game, on npm | Agents get it ready; the owner gives the npm key and starts the release | Later |
| 5 | Release 2: the 2D editors, in the browser on the site | Agents; the owner gives the Cloudflare and GitHub App settings and starts it | Later; the editors' first screen and sign-in exist from slice 1 |
| 6 | Release 3: the sales site in full (its first page goes up with Release 1) | Agents; the owner gives the domain | Later; its spec is done (Site #23) |
| 7 | Release 4: shipping games to the web, itch.io, Wavedash and computers, and the editor app for iPad, Android and computers | Agents; the owner gives the store, signing, itch.io and Wavedash accounts | Later; in the first layer's spec (M4), not planned yet |
| 8 | Phase 2: a real 2D demo game, made with the finished 2D editors | Agents and the owner | Later; parked in the owner's private notes |
| 9 | Phase 3: the 3D layer, with a 3D test game (Release 5) | Agents | Later |
| 10 | Phase 4: a real 3D demo game | Agents and the owner | Later |

The order of steps 4 to 8 is the owner's release list (2026-11-13), confirmed by the owner on 2026-11-15: Release 1
to 4 in order, then the real 2D demo, then 3D.

## Slice 0: Start

1. Done: the design, the workflow, the four repos, the tests that run on every change, the check on who wrote each
   commit.

## Slice 1: A game plays in the browser

1. Done: the framework, the demo game (one level, the hero and a crate), the editors' first screen and the site, on
   phones, tablets and computers (pull requests #1 to #14; Examples #1 to #9; Editors #1 to #9; Site #1 to #6).
2. Done: the look of the demo's screens and the site (Examples #10 to #22; Site #7 to #19).
3. Done: the demo plays itself on the site (#28, #29, #31, #49; Examples #23 to #30; Site #22, #24, #25, #30).

## Slice 2: A game made from its files

1. Done: levels, saves, gamepads and new keys, playing together online, ropes and pins, pictures, sound and six
   languages, each from a file (plans C, V, I, N, P, A, S and L, #30 to #88).
2. Done: the `automata` command, so an agent makes, checks and replays a game (plan K).
3. Done: the hero walks, jumps, double jumps, wall jumps and dashes, set in its file (plan H, #91 to #133).
4. Done: a first visit goes warnings, language, splash, menu, play, pause (#89 to #136).
5. Done: the demo speaks six languages, has a room server and the built-in hero (Examples #35 to #42).

## Slice 3: World, the levels editor

Mockups of all five editors were drawn in three rounds; the shell and World ones are the first to go through the
whole gate.

1. Done: the first rounds of mockups, the check against professional tools, the harsh reviews of the shell and World,
   what World takes from LDtk, the Apple Pencil review, the plain-words audit, the design pass, the end-to-end check
   and the second visual look (Editors #49, #51, #52, #57, closed and carried on in #64).
2. Done: the editor mockup, the shell and World's levels, approved by the owner on 2026-11-16 (board v17, Editors #70,
   which replaced #64).
3. Now: write down the editors' design language and patterns, so every editor after World reuses it (rule 7).
4. Now: build in Automata what the levels editor needs. Level pictures on save, so an agent can see a level; a public
   list of format changes; what a placed thing may hold (values and links); the world map of levels, with levels joined
   by doors and edge to edge as one seamless place (the spec's second version, #165, with the owner's answers of
   2026-11-15; it replaces part 1 of `specs/2026-11-15-rooms-and-storylets-amendment.md`).
5. Now: build the editor: the shell (top bar, tools, panels, Help, Settings, tour, sign-in, Share), World's Levels
   part and the world map, open a level, change it on an iPad, save it into the game. Its spec is Editors #74; World's
   Tiles and Scenes parts come after, each once its framework part is built (the owner, 2026-11-16).
6. Next: test the editor, in real browsers at iPad, phone and computer sizes, with the journeys from the end-to-end
   check; green on main.
7. Next: the website demo uses World: three levels with a door, for one or two players, and two levels joined on a
   world map (Examples #41, closed on 2026-11-15, last commit `1defa49`; it changes five recorded plays, so the owner
   sees them first). A new game passes the game checklist, parts 1 to 5 (#137, #139, #140, #151 are its spec, plan,
   audit and pause note; the built parts #143, #145, #148 were taken off main by #153). Part 3 changes the starter
   game's recorded play, so the owner sees it before and after.
8. Next: the design review loop on every screen built in this slice, as a drift check against the approved mockups:
   fix any drift and recheck, not a review from scratch (the owner, 2026-11-16). Its record says
   `Scope: drift check against approved mockups` and ends `Recheck: passed`.

---

# Later: the next editors, one at a time

## Slice 4: Characters

1. Done: the figure builder's spec, plan and audit (Editors #29, #36, #43); the rigged figures spec, plan and audit
   (#104, #109, #117); the environment builder's spec (Editors #31); the Scenes plans, audit and implementation audit
   (Editors #37, #42; #113, #116, #146).
2. Later: build in Automata: rigged figures part 0, `automata add` (#119), and Scenes, parts A to D and the audit's
   fixes (#128, #134, #138, #141, #147). Built, then taken off main by #153; the tag keeps them. Rigged figures part 1
   (#124 was closed on 2026-11-15, last commit `150260a`) is rebuilt from its plan,
   `plans/2026-11-15-rigged-figures.md`, then parts 2 to 5. Scenes fix I1 changes the scene pictures' record, so the
   owner sees it first.
3. Later: the Characters layout sketches, in its spec (the mockups drawn in Editors #34 are reference only).
4. Later: build the Characters editor: the figure builder, clips and entity kinds, Schematic. The environment builder
   is part of World, and is built when World's spec sketches it.
5. Later: test the Characters editor.
6. Later: the website demo gets its real art: an agent draws every figure and scene in the builders, the owner
   finishes them, and the owner plays the demo end to end and says it is fine.

## Slice 5: Feel, with Tuner inside it

1. Done: the Feel editor's spec and plan audit (Editors #30, #40); the feel spec, plan and audit (#105, #111, #115);
   live move numbers' plan and audits (#107, #114, #130).
2. Later: build in Automata: the feel build and live move numbers. Pull request #120 was closed on 2026-11-15 (last
   commit `2f82722`) and #122 was taken off main by #153; they are rebuilt from their plans.
3. Later: the Feel layout sketches, in its spec.
4. Later: build the Feel editor, with Tuner.
5. Later: test the Feel editor.
6. Later: the website demo feels better: dust when the hero lands, a shake and a short freeze.

## Slice 6: Sound

1. Done: the sound formats spec, plan and audit (#106, #112, #118); the Sound editor's spec, plan and audit
   (Editors #33, #39, #44).
2. Later: build in Automata: the sound formats. Pull request #125 was closed on 2026-11-15 (last commit `59d3ffe`);
   it is rebuilt from its plan, `plans/2026-11-15-sound-formats.md`.
3. Later: the Sound layout sketches, in its spec.
4. Later: build the Sound editor.
5. Later: test the Sound editor.
6. Later: the website demo gets its music and sounds.

## Slice 7: Story

1. Done: the story plan and audit (#58, #60); the Story editor's spec, plan audit and fixes (Editors #32, #41, #46,
   #48).
2. Later: build in Automata: the story build. Pull request #64 was closed on 2026-11-15 (last commit `fc909a2`); it is
   rebuilt from its plan, changed first by the amendment (all story is facts and conditions, as storylets; the owner,
   2026-11-15): `specs/2026-11-15-rooms-and-storylets-amendment.md`.
3. Later: the Story layout sketches, in its spec.
4. Later: build the Story editor.
5. Later: test the Story editor.
6. Later: the website demo's keeper talks and a cutscene plays, and the demo's screens, its saves and "What's inside"
   come together: the thumbs remember what a player has learned (#142, closed on 2026-11-15, last commit `6b0a79d`).

## Slice 8: Screens

The sixth editor (the owner, 2026-11-15): the UI and the game's flow. The UI is every screen a player sees, such as
the menus, pause, settings and what is shown while playing; the flow is how one leads to the next (the menu, then
play, then pause, and back). Today both are the framework's own, in code (the `screens` feature draws the screens and
the `flow` feature walks the steps), and Story edits only their words.

1. Later: build in Automata: a screens format and a flow format, so a screen and the way screens lead to each other
   are content files an agent can write too.
2. Later: the Screens layout sketches, in its spec.
3. Later: build the Screens editor.
4. Later: test the Screens editor.
5. Later: the website demo's screens come from the editor.

# After the editors: releases, the sales site, shipping and the app

Releases are big and few (the owner, 2026-11-13): nothing is published when a slice is done, and every release is
started by the owner, by hand. Each step below starts only when the one before it is done, and each runs the normal
workflow (spec, plan, audit, build, audit, fixes, the owner's review).

## Release 1: the framework and the 2D test game

The framework in full, with the test game in AutomataFrameworkExamples (the owner, 2026-11-15). It comes after the
six slices, because each slice builds part of the framework.

1. Later: agents get the release ready: the API report, the agent skills, the README's first steps, the release notes
   (`release.yml`). Who: agents.
2. Later: the npm key for the `@automataframework` name. Who: the owner.
3. Later: the test game moves from a pinned framework commit to the npm version. Who: agents, in its own pull request.
4. Later: the sales site's first page goes up with the release: home, "Make a game", the app's sign-up, with the
   editors and shipping marked "Being built" (the sales site spec, Site #23). Who: agents, from the spec; the owner
   checks the prices and the sign-up.
5. Later: the owner starts the release.

## Release 2: the 2D editors, in the browser

All six editors (World, Characters, Feel, Sound, Story, Screens), free in the browser on the site, saving into a
team's own game (the owner, 2026-11-13).

1. Later: the editors run on the site for anyone, on their own address, with sign-in through the editors' GitHub App
   (the Editors' `docs/deploy.md`). Who: agents; the owner makes the Cloudflare project and the GitHub App.
2. Later: every editor's journeys green on main in three browsers, at iPad, phone and computer sizes. Who: agents.
3. Later: the owner tries every editor on an iPad and starts the release.

## Release 3: the sales site, in full

The site that turns a visitor into someone making a game. Its spec is done (Site #23, `2026-11-14-sales-site-design.md`
in AutomataFrameworkSite); its plan starts once Release 2 is out.

1. Done: the spec, with the owner's four answers (Site #23).
2. Later: the plan, its audit, the build, then the visual review process (plain words, design pass, end to end,
   second look). Who: agents.
3. Later: the pages of a full framework site: guides, examples, the API reference, the free editors, pricing,
   `llms.txt`. Who: agents.
4. Later: the domain, bought and pointed at the site. Who: the owner. Until then it stays at
   `automataframework.pages.dev`.
5. Later: the owner reviews it on the live site and starts the release.

## Release 4: shipping games, and the editor app

Distribution (the owner, 2026-11-13): a game made with the framework goes out with one command, and the editors come
as an app.

1. Later: `automata ship` sends a game to the web, itch.io, Wavedash (if its rules fit; the plan reads its docs first
   and stops if they don't) and a computer download (macOS, Windows, Linux). The test game is shipped to each as the
   proof. Who: agents; the owner gives the itch.io and Wavedash accounts and keys.
2. Later: the editor app: the browser editors wrapped as an app for iPad, Android and computers, signed and sent to
   the App Store and Google Play. Who: agents build and test it; the owner gives the Apple and Google developer
   accounts and the signing keys, and sends it for review.
3. Later: the owner checks the test game on each store page and the app on an iPad and an Android phone, then starts
   the release.

## Launch

The date is not set. Launch is when the owner starts the releases above.

# After launch

## Phase 2: a real 2D demo game

Later. Made with the finished 2D editors, in AutomataFrameworkExamples under `demos/`, by agents and the owner. Its
needs are tried as spikes first (see "The four phases"). When it exists, the website plays it instead of the test
game, and it is shipped the same way as the test game.

## Phase 3: the 3D layer (Release 5)

Later. 3D as its own layer on top of 2D, with a 3D test game, then the same order again: each editor's 3D version
runs the same five steps, then 3D's site and shipping.

## Phase 4: a real 3D demo game

Later. Made with the finished 3D editors.

## Not yet placed: needs the owner

Nothing here is built until the owner says where it goes.

1. Nothing yet.
