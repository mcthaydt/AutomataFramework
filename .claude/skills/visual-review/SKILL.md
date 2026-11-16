---
name: visual-review
description: Use when mockups or any UI round need reviewing before the Owner's approval: the board, the two lenses that run side by side, the one fix session, the screenshot sizes and the harsh last look.
---

# Visual review

A mockup or UI round is one pull request and one pass through the `review-graph` skill, with these lenses. The Owner
reviews all design work on the board, the Editor Mockups artifact
(https://claude.ai/artifact/W5REbCVDUkABgoPY5Hxy2X). Every mockup change publishes a new version of that same
artifact before it is reported done.

1. **The Owner glances first.** Rough mockups go on the board and the Owner looks at them (about five minutes) before
   any review or polish starts.
2. **Only what changed.** The board shows only the round's new or changed screens; screens already reviewed are
   skipped, and a second round looks only at screens that changed again.
3. **Two lenses, side by side** (Opus, medium effort, find only, each in its own thread):
   - **Words and design.** Every word passes the drunk-grandma test; every screen, device and orientation is checked
     for layout, touch size (44 px, primary actions 48 px) and polish. Pictures at every device and orientation.
   - **End to end.** Walk every real journey from first open to playing the result. Every action has its opposite and
     a visible way back (open and close, hide and show, undo and redo, cancel, leave and return); nothing missing, no
     dead ends. The drunk-grandma test on every journey: find each action, understand what it did, recover from a
     wrong tap, with no hidden gestures, guessing or docs. Pictures at three views: a small phone, an iPad and a
     computer.
4. **One fix session** (Sonnet, high effort) fixes every finding from both, as the review graph says.
5. **One harsh last look** (Opus, high effort, every device), once per mockup set, at the very end, over everything
   changed since the last approval. Its findings go through the same fix loop.
6. **The Owner approves the finished set.** The Owner's tweaks are targeted fixes on Sonnet at high effort, with no new
   cycle.

Checks a program can make come before any lens: touch sizes, contrast and the palette are tests in each repo
(`tests/styles/`, the browser layout tests). A lens reports only what a program can't see.
