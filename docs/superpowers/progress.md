# Progress

Last updated: 2026-11-21 09:18 UTC (from `date`).

The record before the 2026-11-21 restart is in git: `git show 76d2ac4^:docs/superpowers/progress.md`. The World slice's
state at the restart is the handoff the Owner gave (2026-11-20 15:40 UTC), summed up under "Next" below.

## Owner instructions

- 2026-11-21 09:13 UTC (project thread): "Finish Automata Framework". Run the work by the fresh kit; run the setup check
  in `release` first and list the Owner's steps as one batch of CLI commands; then keep going, asking only the Owner's
  choices as decision cards with a recommendation.
- 2026-11-21 09:17 UTC (decision card): "Finish" means **the 2D product, shipped**: close the World slice, build the
  Characters, Feel, Sound, Story and Screens editors, then Releases 1 to 4. Not the real demo games or 3D. This lifts
  the 2026-11-19 pause ("halted until the Owner finishes Ruken") for this scope (agent-selected reading, reported to
  the Owner on 2026-11-21).

## Active milestone: setup, then the World slice (roadmap slice 3)

### Current work

- Setup check in all four repos (AutomataFramework, Editors, Examples, Site): restore the CI and records removed on
  2026-11-20, install the fresh kit and its rule hooks. One setup pull request per repo, first-time setup, lane 2.
- The Owner's batch of commands (branch protection requiring `gate`, secrets check, old branches): given in the
  project thread on 2026-11-21, to run after the setup pull requests merge.

### Next

1. Close the World slice, from the handoff: fix design review round 1's reds (37, 34 distinct; the paused branch
   Editors `claude/project-thread-c709zh` at `4f0384d3` holds group 1), round 2, the blind judge, the screens page for
   the Owner's first look, one round on the Owner's notes, the drift check against board v17, the retrospective.
2. Characters, Feel, Sound, Story, Screens (roadmap slices 4 to 8).
3. Releases 1 to 4 (`docs/roadmap.md`).

### Material decisions (agent-selected)

- 2026-11-21: the old CI is restored from git and adapted to the kit, rather than written again.

### Blockers

None.
