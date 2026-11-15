# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom.

## The rules

**Slices are editor-driven, one editor at a time** (the owner, 2026-11-15). Each editor is one slice, and every editor
slice runs the same five steps in order:

1. **Build in Automata.** The runtime and formats the editor needs, in AutomataFramework.
2. **Editor mockup.** Drawn, then put through the visual review process, until the owner says it is fine.
3. **Build the editor.** From the approved mockup, in the editors' repo.
4. **Test the editor.** In real browsers on iPad sizes, with the journeys, until it is green on main.
5. **Update the website demo.** The demo on the site uses what the editor makes, so after every slice there is
   something new to try there. The demo grows with every slice; there is no separate demo slice at the end.

Then the next editor starts. The editors go in this order: **World** (levels), **Characters**, **Feel** (with Tuner inside it),
**Sound**, **Story**, **Screens**: levels first, then who is in them, then how they move, then sound, then the story that
ties them together (the owner, 2026-11-15), then the screens and the game's flow, added as the sixth editor
(the owner, 2026-11-15). The shell is built with the first editor and every later editor reuses it, so
each later mockup also follows the design language (see the rule below).

1. **One thing at a time.** There is one **Now**. Nothing else is built until it is done.
2. **Slices go in order.** A slice starts only when the one before it is merged and green.
3. **New ideas wait.** A new idea goes in "Not yet placed" at the bottom. It moves up only when the owner says where it
   goes.
4. **Designs can wait in line.** An approved design sits under its slice until that slice comes up. Approved is not
   the same as building.
5. "Done" means merged to main and green there. Nothing else counts as done.
6. **Work after the current slice stays off main.** Everything after the current slice is tagged and taken off main
   until its turn (AutomataFramework #153, Editors #54; the tag `archive/before-slice-cut` keeps it). Docs stay.
7. **The design language comes after the mockups are approved.** The owner asked (2026-11-15) for one document that
   defines the editors' design language and patterns, so later editors do not redo the work. It is written once the
   shell and World mockups are approved, in its own pull request, and every later mockup reads it first.

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
2. **Now: the editor mockup, the shell and World's levels, until the owner says they are fine** (Editors #64, which
   replaced #57, with the owner reviewing).
3. Next: build in Automata what the levels editor needs. Level pictures on save, so an agent can see a level; a public
   list of format changes; what a placed thing may hold (values and links); the world map of levels, which needs the
   owner's 8 answers first (the closed #149, last commit `c449fca`, has them), and now lets levels join edge to edge
   (the owner, 2026-11-15; `specs/2026-11-15-rooms-and-storylets-amendment.md`).
4. Next: build the editor: the shell (top bar, tools, panels, Help, Settings, tour, sign-in, Share) and World's
   Levels part, open a level, change it on an iPad, save it into the game.
5. Next: test the editor, in real browsers at iPad, phone and computer sizes, with the journeys from the end-to-end
   check; green on main.
6. Next: the website demo uses World: three levels with a door, for one or two players, and two levels joined on a
   world map (Examples #41, closed on 2026-11-15, last commit `1defa49`; it changes five recorded plays, so the owner
   sees them first). A new game passes the game checklist, parts 1 to 5 (#137, #139, #140, #151 are its spec, plan,
   audit and pause note; the built parts #143, #145, #148 were taken off main by #153). Part 3 changes the starter
   game's recorded play, so the owner sees it before and after.

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
3. Later: the Characters mockups (drawn in Editors #34), reviewed the same way as slice 3.
4. Later: build the Characters editor: the figure builder, clips and entity kinds, Schematic. The environment builder
   is part of World, and is built when World's mockups cover it.
5. Later: test the Characters editor.
6. Later: the website demo gets its real art: an agent draws every figure and scene in the builders, the owner
   finishes them, and the owner plays the demo end to end and says it is fine.

## Slice 5: Feel, with Tuner inside it

1. Done: the Feel editor's spec and plan audit (Editors #30, #40); the feel spec, plan and audit (#105, #111, #115);
   live move numbers' plan and audits (#107, #114, #130).
2. Later: build in Automata: the feel build and live move numbers. Pull request #120 was closed on 2026-11-15 (last
   commit `2f82722`) and #122 was taken off main by #153; they are rebuilt from their plans.
3. Later: the Feel mockups, through the visual review process.
4. Later: build the Feel editor, with Tuner.
5. Later: test the Feel editor.
6. Later: the website demo feels better: dust when the hero lands, a shake and a short freeze.

## Slice 6: Sound

1. Done: the sound formats spec, plan and audit (#106, #112, #118); the Sound editor's spec, plan and audit
   (Editors #33, #39, #44).
2. Later: build in Automata: the sound formats. Pull request #125 was closed on 2026-11-15 (last commit `59d3ffe`);
   it is rebuilt from its plan, `plans/2026-11-15-sound-formats.md`.
3. Later: the Sound mockups, through the visual review process.
4. Later: build the Sound editor.
5. Later: test the Sound editor.
6. Later: the website demo gets its music and sounds.

## Slice 7: Story

1. Done: the story plan and audit (#58, #60); the Story editor's spec, plan audit and fixes (Editors #32, #41, #46,
   #48).
2. Later: build in Automata: the story build. Pull request #64 was closed on 2026-11-15 (last commit `fc909a2`); it is
   rebuilt from its plan, changed first by the amendment (all story is facts and conditions, as storylets; the owner,
   2026-11-15): `specs/2026-11-15-rooms-and-storylets-amendment.md`.
3. Later: the Story mockups, through the visual review process.
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
2. Later: the Screens mockups, through the visual review process.
3. Later: build the Screens editor.
4. Later: test the Screens editor.
5. Later: the website demo's screens come from the editor.

## Before launch

Later. Each is built after the slices above, in this order.

1. Release 1: 2D finished, the framework and the 2D test game (the owner, 2026-11-15). The owner starts it by hand.
2. Release 2: the 2D editors, in the browser and as an app for iPad, Android and computers.
3. The sales site, live, with the finished demo on it. Its spec is done (Site #23).
4. Shipping a game to itch.io, Wavedash (if its rules fit) and computers, and the editor app.

## Launch

The date is not set. Launch is when the owner starts the releases above.

## After launch

Later.

1. Phase 2: a real 2D demo game, made with the finished 2D editors, after Release 2 (the owner, 2026-11-15).
2. Phase 3: 3D, as its own layer on top of 2D, with a 3D test game, then the same order again for 3D: each editor's 3D
   version runs the same five steps.
3. Phase 4: a real 3D demo game, made with the finished 3D editors.

## Not yet placed: needs the owner

Later. Nothing here is built until the owner says where it goes.

1. Nothing yet.
