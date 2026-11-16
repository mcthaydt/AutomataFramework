# The Owner's product decisions

What the Owner has decided about the product (2026-11-13 onwards), moved word for word from the shared rules page
(`rules.md`) so that page stays short. Read this when a spec, plan or design needs it. A decision here is not
reopened; if new facts make one look wrong, say so once, with the facts. Change it only on the Owner's words.

- **Strategy and research stay private.** Positioning, competitors, pricing and market research never go in the
  public repos; the Owner keeps them in the project's private files. A public doc may point at a private decision but
  never repeats its reasoning.
- **The first layer** is a thin slice through the whole offering: the framework, a demo game, the editors, the site and
  deployment, built as a thin thread through all four public repos first and then widened.
- **Repos:** AutomataFramework (the 2D runtime), AutomataFrameworkExamples (the test game, later the 3D game and the
  site's examples), AutomataFrameworkEditors, AutomataFrameworkSite. PixiJS is the biggest inspiration.
- **Determinism means physics.** Rapier's deterministic 2D build. Physics and networking (Colyseus) are in the core,
  like the ECS (Koota).
- **Multiplayer:** every game is built as if it were multiplayer; turning it on is a per-game choice. Networking is
  built and proven in CI, not deployed. Fly.io hosts the room server once the 3D game uses it.
- **The test games prove the editors.** The current games are test games; real demo games come later and are planned
  only in the private notes. The demo game is a small original physics platformer, single-player, with every
  built-in: saves; title, pause and settings screens; keyboard, touch and gamepad with remapping; music and sound with
  volume; phone, tablet and desktop layouts; languages.
- **Editors:** all nine old 2D editors plus the figure and environment builders, which make 2D art only, combined into
  six: World (Levels, Tiles, the environment builder), Characters (the figure builder, clips and entity kinds,
  Schematic), Feel (Feel, Tuner), Sound (Audio), Story (Writer, Sequence) and Screens (the UI and the game's flow: every
  screen a player sees and how one leads to the next; added by the Owner, 2026-11-15). World and Characters have a 2D
  and a 3D version; the 2D ones work the way the old 3D builders did. In the browser, and as a Tauri app for iPad,
  Android and desktop.
- **Agents working on the code are the primary way a game is made.** The editors change authorable content only: the
  JSON files the coding agents produce.
- **Edits live in the game's GitHub repo.** Save makes a commit; edits that collide merge the way GitHub does. Sign-in
  is a GitHub App, run through Cloudflare Pages Functions, which also do the editors' GitHub work as the App; the site
  is on Cloudflare Pages.
- **The editors are for teams,** technical people and not, working on their own games. People get levels of what they
  may do (Look, Suggest, Approve, Edit, Owner), kept in `automata.access.toml` in the game's repo and set from a Share
  screen. People need GitHub only to sign in. Anyone can try the editors on the demo game without signing in and keep
  a copy; saving into a game and working with others need a sign-in.
- **Formats:** game content is JSON; everything else is TOML.
- **Releases are big and few.** Release 1 is when 2D is finished (the framework in full and the 2D test game), Release 2
  the 2D editors, Release 3 the website, Release 4 distribution (shipping games and the editor app), Release 5 3D, and
  the loop repeats for 3D. Milestones are not releases: nothing is published per milestone, and `release.yml` runs only
  when the Owner starts it by hand.
- **Publish targets:** web, itch.io, Wavedash (if its rules fit the host port) and desktop.
- **Languages:** games ship English, Spanish, Korean, Japanese, Chinese and Portuguese. Editors add French, Russian and
  German. The list follows the most popular languages for Godot.
- **`main` is protected** in every repo: pull requests only, no force pushes or deletion, checks required once CI exists,
  no required approving review. Every new repo gets the same protection, and its own short `CLAUDE.md` pointing at
  `rules.md`, when it is created.
