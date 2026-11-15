# Plan M (the sound formats): plan audit

Stage 3 of the workflow, for [`plans/2026-11-15-sound-formats.md`](../plans/2026-11-15-sound-formats.md) as written in
`d14d87e` (PR 112), against its spec, [`specs/2026-11-15-sound-formats-design.md`](../specs/2026-11-15-sound-formats-design.md)
(PR 106), the Sound editor's spec and plan in AutomataFrameworkEditors (PRs 33 and 39, audited beside this one in
`docs/superpowers/audits/2026-11-15-sound-editor-plan-audit.md` there), the plans that overlap it (plan G, PR 107;
plan F, PR 111; the scenes slice 1, PR 113; plan R and its audit, PRs 109 and 117; the Feel, Story and Scenes editor
plans, Editors PRs 35, 38 and 37), plan H's build as it stands on its branch (PR 101, not merged), and the code on
`main` at `4f8ad64`. Written 2026-11-15.

**Verdict:** sound, and ready for stage 4 once the fixes below are in, which they are. The formats, the music
theory, the pitch rule (a table and doubling, no `Math.pow`), the tick arithmetic, the library, the MIDI reader and
writer and the commands all stand on what is on `main`: `ProjectSchema`, `loadGame`, `wrongKind`, `simContent` and
its `LEFT_OUT`, `isGamePath`, `variants`, `unique`, `noSuch`, the content table's cross-file `check`,
`createAudio`, `cueTable`, `MAX_SAME`, `scoreOf` and `hertzOf`, `playVoice`, `CommandInput`'s `folder` and `rest`,
`artFiles` in `ContentApi`, `scripts/write-schemas.ts`, and the way `locale/library/*.json` is bundled are each
where and as the plan says. No critical fault was found. Seven important ones were; all are fixed in the plan. Six
minor ones are fixed.

How it was checked: the spec and the plan were read whole, and the Sound editor's spec and plan beside them. On
`main`: `content/project.ts`, `shared.ts`, `load.ts` (the first 120 lines, `wrongKind`, the slots), `sound.ts`,
`music.ts`, `cues.ts`'s table, `type-info.ts`, `level/sim-content.ts`, `level/touch.ts` (the touch events' names),
`audio/notes.ts`, `speaker.ts`, `score.ts`, the audio feature's exports, `web/voices.ts`, `cli/args.ts`,
`game-folder.ts`, `check-files.ts`, `play.ts`, `ports.ts`, `template/` (`automata.toml`, `vite.config.ts`,
`package.template.json`, `page.ts`, the content folders). On plan H's branch: `level/moves.ts` (`MOVE_EVENTS` and
`hero.<name>`). In AutomataFrameworkSite: `facts/project.ts` and `parse.ts`. In AutomataFrameworkExamples:
`automata.toml` and `scripts/copy-game.ts`. Nothing was run (the Owner, 2026-11-14: GitHub CI only).

## The coordinator's checks

- **Folders for every kind, listed once.** Yes: Tasks 1 and 2 know nothing about sound, and `withFolders` adds any
  kind's block. Two writers of `automata.toml` were planned beside it, which I5 settles.
- **Recordings: 10 s and 1 MB each, 20 MB a game.** Word for word in Global Constraints and Task 3, one judge
  (`recordingProblems`), checked by `automata check` and the loader. One rounding edge is fixed (M3).
- **MIDI both ways.** Tasks 13 to 16. The round trip as tested would have failed (I2, I3), and what the editors must
  show of it could not be put in their words (I4). Fixed.
- **"MIDI" never on a screen.** That is the editor's rule; the framework's part is to give the editor codes as well as
  English sentences (I4).
- **The planner's calls** (`automata.folders.json`, four beats to a bar, chords as numerals with `7` and `sus4`,
  steps of the chord's own scale, `automata sound new`, first values for the Owner's ears). Each holds. The folder
  manifest is the only way a static page can know a folder's files and is made and read by one pair of functions;
  `automata sound new` is what makes the editor spec's "an agent's command and the editor make the same sounds"
  true. The library's sounds are a listening review, which the Handoffs already say.

## Important

**I1. A game that lists a folder breaks everything built before this plan.** `ProjectSchema` is a `strictObject`,
so a framework pinned before plan M refuses `folder`; plan M's own `loadGame` refuses a game with a folder when no
`list` is given, and the editors' `game/open.ts` and `service/whole.ts` call `loadGame(read)`; and the Site reads
`automata.toml` with its own reader (`facts/project.ts`), which throws "A [[content]] table … has no path" on a
folder block. The Handoffs told the demo's cycle to move to folders with no order, so the demo (the one game a
visitor may open in the editors, and the game the Site shows) could have stopped opening in both. **Fixed:** the
Handoffs now give the order (plan M, then the Editors' pin and their folder listing, then the Site's reader, then the
demo) and add the Site's handoff.

**I2. The MIDI round trip cut every note held over a bar line.** `midiToMusic` made each bar its own loop and block,
and `notesOf` never carries a hold past a block's end, so a note sounding across bar 1 into bar 2 came back cut at
bar 1: Task 15's round-trip test (`notesOf` lengths equal, `dropped` empty) fails on any style with a held note, and
so does the editors' "Save for other music apps, read it back" journey. **Fixed:** a lane is cut into pieces only at
bar lines no note sounds across; a piece is one loop (its `=` holds the note inside it), at most 8 bars, a note past
that cut and said (`cut`). Tested.

**I3. A 12-step loop cannot come back from MIDI unmoved.** MIDI is read at 16 steps a bar (call 18), so a triplet
loop's notes move to the nearest sixteenth and `dropped` is not empty, and a style that used one would fail the round
trip. **Fixed:** the four styles use only 4-, 8- and 16-step loops; a 12-step loop stays in the library.

**I4. What `midiToMusic` says could only be shown in English, with the word "MIDI".** `dropped` was a list of English
sentences and a refusal one sentence ("This is not a MIDI file…"); the Sound editor must say these in nine languages
and its spec bans "MIDI" on a screen. **Fixed:** each `dropped` entry is a `MidiDropped` (`what`, a count or tempo
where it counts, and the `sentence` the command line prints), and a refusal carries `why: 'not-midi' | 'no-notes'`.
The editors' plan words each.

**I5. Three plans each made their own writer of `automata.toml`.** This plan's `withFolders`, the scenes plan's
`listContent` (PR 113, a path block, which throws), and plan R's Part 0 `listContent` (PR 109, `Parsed<string>`),
each in a new `content/project-write.ts`; and the Story editor plan writes its own folder line in the editors with
other bytes. Two writers means an editor and an agent can make different bytes for the same change. **Fixed (with
the figure audit's ruling, PR 117, relayed by the coordinator):** call 26: `project-write.ts` is the one writer;
plan R's Part 0 builds it first with `listContent`, plan M adds `withFolders` beside it (or creates the file with only
`withFolders` if it lands first), both append after one blank line, and `listContent` counts a path inside a listed
folder of its kind as listed. The scenes plan and the Story editor plan are told through the coordinator.

**I6. Task 17 would have moved the template's golden.** It said the template's feel block "becomes `feel`,
`content/feel`" when there is one. `feel` is not in `LEFT_OUT` on `main` and plan F does not add it, so a feel folder
block puts `folders` into the hashed project and `template/replays/level-1.json` moves, which Task 17 itself forbids.
**Fixed:** Task 17 does not touch feel; the cycle that decides whether feel stays in the sim moves it. The Examples
handoff now says which kinds can move to a folder without moving the demo's goldens (`sound`, `music`, `loop`,
`motif`, `cues`) and which cannot.

**I7. A long song brought in from MIDI made one loop for each bar.** A 128-bar song in six lanes that never repeats
was over 700 loop files: too many for an agent to read, and far over any one save the editors make. **Fixed:** after
the repeats are found, the pieces used once that sit side by side are joined into loops of up to 8 bars, so such a
song gives about one loop for each eight bars of a lane. Tested (64 bars that never repeat: at most 8 loops).

## Minor

- **M1.** `simContent`'s early "same object" return checks each left-out map by name; it must also check
  `project.folders`, `loops` and `motifs`, or a game whose only new thing is a sounds folder hands the sim a project
  with `folders`. Fixed in Task 2 (the plan U audit's M7 is the same trap).
- **M2.** The kinds table gave no loudness for `coin`, `door`, `explosion`'s tone and `power-up`, and no sound
  `volume`. Fixed: values given; the sound's own volume is 0.8.
- **M3.** `writeRecording` of exactly ten seconds at 48 kHz could resample to 441 001 samples and throw. Fixed: the
  length is rounded down.
- **M4.** A motif voice with no `mode` had none to inherit (a sound has no song). Fixed: `major`.
- **M5.** `SoundSchema`'s end check reads `v.length`, which a motif voice lacks (it passes today only as `NaN`).
  Fixed: the check skips a motif by its `kind`.
- **M6.** The tracker: plan F (PR 111) also called itself "Cycle 8", as plan M did. Fixed when this merged main:
  plan M is Cycle 10 (rigged figures took 8, the feel runtime 9).

## Left as written

- The verb of `automata music` and `automata sound` is read from `CommandInput.folder`. It is odd, but it keeps
  `args.ts`'s shape and the plan says so; the tests pin it.
- Turning a format 1 track into loops through MIDI loses its waves (every part becomes `keys` or `bass`, a drum hit a
  snare). That is the editors' call (their ruling 12), and their panel now says so before it is kept.
- The library's names in nine languages put French, Russian and German words in the framework, which ships six for
  games. They are for the editors and named only by `libraryName`; nothing a game shows uses them.
