# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-14

**proto-003-snake macro pass shipped.** Juice pass deferred to a future session.

- Faithful Nokia Snake (1997): 40×28 grid, 20px cells, Nokia LCD palette, +1-per-food scoring, walls kill, tick-based simulation.
- Three-stage speed ramp at 8 / 12 / 16 ticks/sec. Initial thresholds were 8/16 length; retuned to 10/22 after first playtest revealed transitions came too early.
- **Key design lesson from this session:** single-slot input queue (validated against committed direction) silently drops the second press of any tight-corner sequence at typical tick rates (60–125ms apart). Player feels it as "my key didn't register" and hits walls. Replaced with a capacity-2 chain-validated FIFO — each new press validates against the *last queued* direction, 180°-reject preserved at every link. New memory saved (`tick_input_buffering_principle`).
- Mount-sync gotcha bit again on a two-Edit sequence (Linux saw a 304-line truncated view of a 312-line file). Recovered via bash heredoc; subsequent patch done with python-in-bash + assertion. The defensive shrink guard in `cowork-push.py` was not triggered — the truncation was caught by `node --check` first.

## Active projects

- **proto-003-snake** — macro pass complete and playable. Juice pass deferred. See `projects/proto-003-snake/README.md` for next-session paths (juice pass on Snake vs. skip to proto-004 Tetris).

## Open decisions / next session candidates

1. **Juice pass on proto-003-snake** — port the same restrained stack we built for Pong/Breakout (Web Audio voices, chain-index ascending pitch on rapid consecutive food, game-over sweep, brief death flash). Ascending-audio principle from Breakout applies directly to chain-eat audio.
2. **Skip to proto-004 (Tetris)** — Snake's macro is the concept-learning piece; juice is taste polish. Tetris is the next rung on the learning ladder: builds on tick-based foundation, adds rotation/wall-kicks, line-clear cascades, lock delay.
3. **Something else** — John's call.

## Recently retired

- **proto-002-breakout** — shipped 2026-05-11. Faithful 1976 Breakout with full juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-002-breakout/. Reference for chain-index ascending audio design and restraint-principle juice stacking on a clone.
- **proto-001-pong** — shipped 2026-05-10. Faithful Atari Pong with three difficulty presets and a restrained juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-001-pong/. Reference for "what restrained juice feels like."

## Pending tooling work

- `studio/cowork-push.py` aborts if any tracked file shrinks >50% since the last commit (defends against the Cowork mount sync bug). If a legitimate large deletion is needed, run with `--allow-shrink`.
- Mount sync gotcha confirmed (again) this session on the juice-pass rewrite. Reliable mitigations: (a) bash heredoc for full-file writes over a few hundred lines, (b) python-in-bash with assertion-checked `replace()` for surgical patches, (c) `sed -i` for single-line tweaks. The file tools (Write/Edit) can silently land on a stale view of the mount for files past ~350 lines. Always verify with `wc -l` and `node --check` after a write.

## Notion (workspace)

Game Dev page: https://www.notion.so/35bbb4f99a078018af1ae83c7d193a64

| Database | Data source ID |
|---|---|
| Projects | `776fd093-2300-4478-aaf3-c0eba8b25867` |
| Ideas | `a9be00d6-b3d0-4e9b-9231-c9953058410c` |
| Play Journal | `89c74f05-3b0b-4076-a42a-1573decc103d` |
| Design Log | `8a42bb6f-b88d-46b3-be63-671aa736caf9` |

Claude maintains these. John doesn't update Notion manually.

## Reading order at session start

1. **This file (HANDOFF.md)** — fastest context restore.
2. **studio/COWORK_INSTRUCTIONS.md** — how we work.
3. **Active project's DESIGN.md and README.md** — deeper state for whatever we work on this session.

## Retiring rules

When a game ships or is abandoned: move it from "Active projects" to "Recently retired" with a one-line summary (date + outcome). Once "Recently retired" grows past ~5 entries, the oldest drop off. Those games still exist in `projects/` and Notion's Projects database; they don't need to clutter this short-context file.

For "Pending tooling work": items get removed once resolved. If something lingers more than a session or two, it belongs in a real backlog (Notion Ideas database or GitHub Issues), not 