# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom. Pull request numbers are AutomataFramework's
unless they say Examples (Ex), Editors (Ed) or Site.

## The rules

**We work on one slice at a time.** A slice is one thing someone can see or use when it is done. There is one
**Now** slice. Everything after it is marked **Later**, and nothing marked Later starts until the Now slice is done
and the owner says go.

1. **One slice at a time.** Nothing outside the Now slice is built, designed or planned.
2. **Slices go in order.** A slice starts only when the one before it is merged and green.
3. **New ideas wait.** A new idea goes in "Not yet placed" at the bottom. It moves up only when the owner says where it
   goes.
4. **Designs can wait in line.** An approved design sits under its slice until that slice comes up. Approved is not
   the same as building.
5. "Done" means merged to main and green there. Nothing else counts as done.
6. **A recorded play that changes is shown to the owner first,** before and after, before it goes in.

Under each slice: **Done for it** is work already merged. **Started** is work begun but not merged (open or closed).
**Not done** is what is left.

## Work done ahead of its turn

The Now slice is slice 8, the shell and World mockups. Every slice after it should have no work in it yet. These do:

| Slice | What was done early | State |
|---|---|---|
| 9. Starter game passes the checklist | Spec, plan, audit, parts 1, 2a and 2b (#137, #139, #140, #143, #144, #145, #148) | Merged. Paused before part 3 (#151 open) |
| 10. Demo: three levels and a door | Part 4, first half (Ex #41) | Open, waiting for the owner to see five recorded plays |
| 11. Demo: feel | Spec, plan, audit (#105, #111, #115); the build (#120) | Spec and plan merged. Build open, being merged |
| 12. Demo: story | Plan and audit (#58, #60); the build (#64) | Plan merged. Build open, being merged |
| 13. Demo: sound formats | Spec, plan, audit (#106, #112, #118); part of the build (#125) | Spec and plan merged. Build closed |
| 14. Demo: a button opens a door, a world map | Spec (#149) | Closed, paused |
| 16. Characters mockups | Drawn in the mockup rounds (Ed #34) | Open, with the shell and World |
| 17. Editor shell | Level drawn still, at a view (#95, #102); the editor's colours and words, levels in the game's art, every level change, the room and panels (Ed #21, #25, #27, #28, #45) | Merged. Ed #28 and #45 are being taken back (Ed #50 open) |
| 18. Figure builder | Spec (Ed #29), plan and audit (Ed #36, #43); rigged figures spec, plan, audit, part 0 (#104, #109, #117, #119); part 1 (#124) | Specs, plans and part 0 merged. Part 1 closed |
| 19. Environment builder | Spec (Ed #31), Scenes plan and audit (Ed #37, #42; #113, #116); Scenes parts A to D, audit and fixes (#128, #134, #138, #141, #146, #147) | Merged, all but fix I1 |
| 22. Feel editor | Spec (Ed #30), plan audit (Ed #40); live move numbers: plan, audit, build, audit (#107, #114, #122, #130) | Merged |
| 23. Sound editor | Spec (Ed #33), plan and audit (Ed #39, #44) | Merged |
| 24. Story editor | Spec (Ed #32), plan audit and fixes (Ed #41, #46, #48) | Merged |
| 26. Sales site | Spec (Site #23) | Merged |

## Done

1. **A small game plays in the browser, on phones, tablets and computers.** Done for it: the first layer's spec and
   plans, the framework, the demo game and the site, with tests on every change (#1 to #14; Ex #1 to #9; Site #1 to
   #6), the editors' first screen (Ed #1 to #9).
2. **A game is made from its files: levels, saves, gamepads and keys, online play, ropes and pins, pictures, sound,
   six languages.** Done for it: plans C, V, I, N, P, A, S, L with their audits and fixes (#30 to #88).
3. **An agent makes, checks and replays a game with the `automata` command.** Done for it: plan K (#67, #69, #71,
   #77, #79 to #87).
4. **The hero walks, jumps, double jumps, wall jumps and dashes, set in its file.** Done for it: plan H (#91, #93,
   #96, #101, #126, #127, #131 to #133).
5. **A first visit goes warnings, language, splash, menu, play, pause.** Done for it: no default language (#89, #90,
   #92, #94, #99, #100) and the game flow (#103, #108, #110, #123, #135, #136).
6. **The demo game speaks six languages and plays itself on the site.** Done for it: watch mode (#28, #29, #31, #49;
   Ex #23 to #30; Site #22, #24, #25, #30), the look (Ex #10 to #22; Site #7 to #19), demo parts 1 to 3 (Ex #35 to
   #40, #42).
7. **The editors' early design work.** Done for it: the mockups' design audit and the first harsh review of the shell
   and World, with LDtk and the Apple Pencil (Ed #49, #51, #52).

## Now

8. **Now: the shell and World editor mockups, approved by the owner.** Started: three rounds of mockups (Ed #34,
   open). Not done: the fixes from the harsh review, the plain-words audit, two design checks, a second harsh review,
   then the owner looks. Again until the owner is satisfied.

*Why this one:* it is the owner's hard stop, it is half done, and every editor after it uses the same shell.

---

# Later

## The demo game

9. **Later: a new game made with `automata create` passes the whole game checklist.** Done for it: see the table
   above. Not done: part 3 (the starter game on the new game flow; changes its recorded play), parts 4 and 5, the
   audit and its fixes.
10. **Later: the demo plays three levels with a door, and two players finish them together.** Started: Ex #41. Not
    done: the owner sees five recorded plays; Ex #41 merges; the page half.
11. **Later: the demo has its feel: dust when the hero lands, a shake, a short freeze.** Started: #120. Not done: its
    merge, audit and fixes, then the demo part.
12. **Later: in the demo, the keeper talks to you and a cutscene plays.** Started: #64. Not done: its merge, audit and
    fixes, then the demo part.
13. **Later: the demo has music and sound, with recorded sounds and loops.** Started: #125 (closed). Not done: the
    build from main, audit, fixes, then the demo part.
14. **Later: in the demo, a button opens a door, and two levels join through a door on a world map.** Started: #149
    (closed). Not done: the 8 questions, the spec, plan, build, audit, then the demo part.
15. **Later: the demo's screens, its saves and "What's inside".** Not done: all of it.

## The builders and the demo's art

16. **Later: the Characters mockups, approved.** Started: drawn in Ed #34. Not done: the same review steps as slice 8.
17. **Later: the editor shell, built from the approved design.** Done for it: see the table above. Not done: Ed #50
    takes back the two early builds; the editor plans redone from the approved design; the build.
18. **Later: the demo's hero is made in the figure builder.** Done for it: see the table above. Not done: rigged
    figures parts 1 to 5, the builder itself.
19. **Later: the demo's scenes are made in the environment builder.** Done for it: see the table above. Not done:
    Scenes fix I1 (changes the scene pictures' record), the builder itself.
20. **Later: the demo wears its real art, and the owner plays it end to end and says it is fine.** Not done: all of it.
    Release 1 goes out after this, when the owner starts it.

## The rest of the editors

21. **Later: World: open a level, change it on an iPad, and save it into the game.** Done for it: the first
    editors' screen (slice 1). Not done: the rest.
22. **Later: Feel, with Tuner: change how the hero moves and feel it at once.** Done for it: see the table above. Not
    done: its mockups, its plan redone, the build.
23. **Later: Sound.** Done for it: see the table above. Not done: its mockups, the build.
24. **Later: Story.** Done for it: see the table above. Not done: its mockups, the build.
25. **Later: the editors as an app for iPad, Android and computers.** Not done: all of it.

## The website, shipping, 3D

26. **Later: the sales site, live, with the finished demo on it.** Done for it: see the table above. Not done: plan,
    build, going live.
27. **Later: a game ships to itch.io, then to Wavedash (if its rules fit) and computers.** Not done: all of it.
28. **Later: the editor app ships.** Not done: all of it.
29. **Later: 3D, as its own layer on top, then the same order again for 3D.** Not done: all of it.

## Not yet placed: needs the owner

Later. Nothing here moves until the owner says.

1. This page: is the shell and World mockups the right Now, and is this the order?
2. The work done ahead of its turn: leave the merged work where it is, and pause everything open (#120, #64, #151,
   Ex #41) until its slice comes up? Or let the two builds being merged (#120, #64) finish?
3. The closed work (#124, #125, #149): restart each from main when its slice comes up?
