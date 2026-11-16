# Progress

Last updated: 2026-11-16 17:27 UTC (from `date`).

## Active milestone: the World slice (roadmap slice 3)

The framework's part of World (Plan W: levels joined by doors and edges, values on things, the world map) and the game
checklist (Plan Q) are merged. The World editor (AutomataFrameworkEditors) needs four more framework tasks before its
plan pull request 17. Their full text is in the World editor plan, read from AutomataFrameworkEditors at `8109888`:
`docs/superpowers/plans/2026-11-16-world-editor.md`, "The framework's part".

### Current work

- Installing the new workflow and its CI gate (this repo's setup pull request).
- Next: F1 and F2.

### Completed outcomes

- Plan W: #171, #172, #173, #177, #180, #181. Plan Q: #143, #145, #148, #189, #190, #191. F3, `readGame`: #194.

### Remaining

- **F1, one step and a slower speed.** `Game.step()` and `Game.setSpeed(rate)` (1, 0.5 or 0.25; anything else throws);
  `createLoop` gains `rate`.
- **F2, going back through what was just played.** `game/kept.ts` keeps snapshots; `backTo` goes back up to 30
  seconds; the recorder gains `cutTo`. F1 and F2 are partly built on the branch `claude/f1-f2-step-back` (one commit,
  `6643c2b`, "work in progress, browser tests not yet run"): merge `main` in first, run the browser tests in CI, take
  the API report, open a draft pull request.
- **F4, a character's weight is the thing's Rapier mass**, with a parity test that a game naming no weight hashes as
  before. No new dependency.
- **F5, drawn behind, with the hero, or in front:** a thing's `draw` field; drawing only, so no hash moves.
- Plan Q's open items: a native speaker's read of the new words in ES, KO, JA, ZH and PT (nothing read yet).

### Blockers

None.

### Previews

- None yet: the framework's browser tests keep their pictures as each CI run's artifacts.

### Material decisions

- The Owner's: "How heavy" is the thing's Rapier mass (F4); draw order is kept in the level and used in play (F5).
