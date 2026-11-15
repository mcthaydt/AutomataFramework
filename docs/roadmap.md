# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom.

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

How to read each list: **Done** is merged and green. **Now** is the one slice being worked on. **Later** is in line,
in order: not worked on now.

## Done

1. Done: the four repos, their rules, and the tests that run on every change.
2. Done: a small game plays in the browser, on phones, tablets and computers.
3. Done: a game has levels, saves, gamepads and new keys, playing together online, ropes and pins, pictures, sound and
   six languages, all from its files.
4. Done: an agent makes, checks and replays a game with the `automata` command.
5. Done: the hero walks, jumps, double jumps, wall jumps and dashes, set in its file.
6. Done: a first visit goes warnings, language, splash, menu, play, pause.
7. Done: the demo game speaks six languages and plays itself on the site.
8. Done: ground painted with photo materials, for scenes (all but one fix, slice 17).
9. Done: every game has Try again, How to play, a goal line, a score and best score, and Delete all my saves (game
   checklist parts 1 to 2b).
10. Finishing: the feel runtime (dust, shake, freeze) and the story (talking and cutscenes) are built and being merged
    (#120, #64). No new work goes into them.

## Now

11. **Now: the shell and World editor mockups, approved by the owner.** Next step: the fixes from the harsh review,
    then the plain-words audit, two design checks and a second harsh review, then the owner looks. Again until the
    owner is satisfied.

*Why this one:* it is the owner's hard stop, it is half done, and every editor after it uses the same shell.

---

# Later

## The demo game

12. Later: a new game made with `automata create` passes the whole game checklist (game checklist parts 3 to 5, then
    the audit). It changes the starter game's recorded play.
13. Later: the demo plays three levels with a door, and two players can finish them together (Examples #41, then its
    page). It changes five recorded plays.
14. Later: the demo has its feel: dust when the hero lands, a shake, a short freeze.
15. Later: in the demo, the keeper talks to you and a cutscene plays.
16. Later: the demo has music and sound, with recorded sounds and loops (the sound formats, restarted from main).
17. Later: the scene pictures look right (Scenes fix I1). It changes the scene pictures' record.
18. Later: in the demo, a button opens a door, and two levels are joined through a door on a world map (the spec's 8
    questions first).
19. Later: the demo's screens, its saves and "What's inside".

## The builders and the demo's art

20. Later: the Characters mockups, approved.
21. Later: the editor shell, built from the approved design (Editors #50 first takes back the two early builds).
22. Later: the demo's hero is made in the figure builder (rigged figures, restarted from main).
23. Later: the demo's scenes are made in the environment builder.
24. Later: the demo wears its real art, and the owner plays it end to end and says it is fine. Release 1 goes out
    after this, when the owner starts it.

## The rest of the editors

25. Later: World: open a level, change it on an iPad, and save it into the game.
26. Later: Feel, with Tuner: change how the hero moves and feel it at once (its mockups first).
27. Later: Sound (its mockups first).
28. Later: Story (its mockups first).
29. Later: the editors as an app for iPad, Android and computers.

## The website, shipping, 3D

30. Later: the sales site, live, with the finished demo on it.
31. Later: a game ships to itch.io; then to Wavedash (if its rules fit) and computers.
32. Later: the editor app ships.
33. Later: 3D, as its own layer on top, then the same order again for 3D.

## Not yet placed: needs the owner

Later. Nothing here moves until the owner says.

1. This page: is the shell and World mockups the right Now, and is this the order?
2. The closed unfinished work: the sound formats (#125) and rigged figures (#124). Keep them closed and restart each
   from main at slices 16 and 22? The same for the editors' old look (Editors #12), which can be closed.
3. The world map's 8 questions, asked again at slice 18.
