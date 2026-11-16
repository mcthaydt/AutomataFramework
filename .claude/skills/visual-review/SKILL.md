---
name: visual-review
description: Use when mockups or any UI round need reviewing before the Owner's approval, or a slice's built screens need their closing design review loop: the board, the two lenses that run side by side, the fixes, the screenshot sizes and the harsh last look.
---

# Visual review

A mockup set or a big UI round is one pull request and one pass through the `review-graph` skill, with these lenses;
a small visual change needs only step 4. The Owner
reviews all design work on the board, the Editor Mockups artifact
(https://claude.ai/artifact/W5REbCVDUkABgoPY5Hxy2X). Every mockup change publishes a new version of that same
artifact before it is reported done.

1. **The Owner may glance, and nothing waits for it** (the Owner, 2026-11-16). Rough mockups go on the board first and
   the coordinator tells the Owner they are there; the lenses start at once. A steer from the glance is a finding for
   the fix session.
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
4. **Fixes.** For a small visual change, the session that made it inspects, fixes and rechecks it itself, with no
   separate lenses. For a mockup set or a slice's closing loop, one fix session (Sonnet, high effort) fixes every
   finding from both lenses, as the review graph says. No findings means no fix round.
5. **One harsh last look** (Opus, high effort, every device), once per mockup set, at the very end, over everything
   changed since the last approval. Its findings go through the same fix loop.
6. **The Owner approves the finished set.** The Owner's tweaks are targeted fixes on Sonnet at high effort, with no new
   cycle.

## The design review loop that ends a slice

A slice does not close, and the next slice does not start, until every screen built in it has been through one loop:
**review** (the two lenses above, over the built screens in real browsers, not the mockups), **fix** (one fix
session, every finding), **recheck** (the lenses again, only on what the fixes touched). Repeat fix and recheck until
the recheck finds nothing. Record it in `docs/superpowers/audits/<date>-slice-<n>-design-review.md`: the screens
covered, each round's findings and fixes, and last the line `Recheck: passed`. Only then may `docs/roadmap.md` mark
the slice's last step done or a later slice's step `Now:`; the `agent-rules` check fails the pull request otherwise
(the Owner, 2026-11-16).

Checks a program can make come before any lens: touch sizes, contrast and the palette are tests in each repo
(`tests/styles/`, the browser layout tests). A lens reports only what a program can't see.
