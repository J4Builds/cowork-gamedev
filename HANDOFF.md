# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-16

**Two things landed this session.**

1. **Mount-sync rule, locked.** Reproduced the Cowork mount-sync bug under controlled conditions — three sequential host-side Edits on a 500-line file silently truncated bash's view by 4 lines while host view stayed correct. The 50% shrink guard is too coarse to catch realistic damage. New rule: all writes to tracked source files go through bash (heredoc / python-in-bash with assertion-checked replace / sed -i). Host file tools remain fine for markdown docs and memory files. Full diagnosis in `studio/COWORK_INSTRUCTIONS.md`.
2. **proto-004-tetris macro pass shipped.** 10×20 board, 7 tetrominoes, 7-bag randomizer, simple rotation with 1/2-cell wall kicks (no SRS, no T-spins), ghost piece, next-piece preview, hard drop, soft drop, 0.5s lock delay with rotation reset, line clear + cascade, standard 1/3/5/8 hundred scoring × level, NES-curve gravity ramp, top-out, restart, title/pause, localStorage BEST. Neutral dark palette with the standard tetromino colors. ~580 lines, written entirely via bash heredoc per the new rule. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-004-tetris/.

## Active projects

- **proto-004-tetris** — macro pass shipped. Juice pass is the obvious next session: line-clear animation (a 4-line clear in particular deserves a flourish), lock-flash on settle, hard-drop trail, audio (lock thump, line-clear sound scaling with clear count, level-up sting), game-over fill-up animation. Sparse-event rules apply (per Snake's lesson) — Tetris is sparse, not dense, so each event probably wants its own self-contained sound rather than chain-escalating pitch. DAS tuning if 150ms/50ms feels sluggish.

## Open decisions / next session candidates

1. **Juice pass on proto-004-tetris.** Default next step.
2. **proto-005 — small platformer.** Genre everyone underestimates. Introduces continuous-physics, tile-grid collisions resolved per-axis, and jump-feel (variable height, coyote time, jump buffer, apex float). Genuinely harder than Tetris despite seeming simpler.
3. **Something else** — John's call.

## Recently retired

- **proto-003-snake** — shipped 2026-05-14. Nokia Snake clone, full juice pass, modernized palette. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-003-snake/. Reference for tick-based input buffering, sparse-chain audio nuance, and the synthesis-vs-Foley decision.
- **proto-002-breakout** — shipped 2026-05-11. Faithful 1976 Breakout with full juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-002-breakout/. Reference for chain-index ascending audio design and restraint-principle juice stacking on a clone.
- **proto-001-pong** — shipped 2026-05-10. Faithful Atari Pong with three difficulty presets and a restrained juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-001-pong/. Reference for "what restrained juice feels like."

## Pending tooling work

- **Rule (verified 2026-05-16): writes to tracked source files go through bash, not host file tools.** Heredoc for full writes, python-in-bash with assertion-checked `.replace()` for surgical patches, `sed -i` for single-line tweaks. Host-side Write/Edit are fine for markdown docs and memory files. After any non-trivial write, verify with `wc -l` and (for `.js`) `node --check`. Full diagnosis in `studio/COWORK_INSTRUCTIONS.md` — the bug reproduced reliably at 500 lines and produced a sub-1% truncation that the push-time guard would not have caught.
- `studio/cowork-push.py` aborts on >50% file shrink. Useful for catastrophic truncation; too coarse for the realistic mount-bug damage. Run with `--allow-shrink` for legitimate large deletions.

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

For "Pending tooling work": items get removed once resolved. If something lingers more than a session or two, it belongs in a real backlog (Notion Ideas database or GitHub Issues), not here.
