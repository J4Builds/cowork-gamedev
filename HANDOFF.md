# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-14

**proto-003-snake shipped.** Macro pass + juice pass both landed.

- Macro pass: 40×28 grid, tick-based sim (8/12/16 t/s with length thresholds 10/22), walls-kill, double-buffered capacity-2 chain-validated direction queue (fixed the original single-slot lost-input bug on tight corners).
- Juice pass: modernized to a neutral zinc palette (dropped the Nokia LCD greens after they didn't read at speed and John wanted modern). Snake-II-style rounded body via selective `roundRect` corner radii. Direction-aware eyes on the head. Score-pulse on eat. Death-phase head-flash + screen shake. Game-over overlay-delay. BEST persisted to `localStorage`. Pause/resume on SPACE.
- **Audio went from pure synth to mixed.** The non-eat voices (speed-ramp up-sweep, death sweep, game-over arpeggio) are synthesized. The eat sound is a Foley sample (`sfx_munch.wav`) loaded via `HTMLAudioElement` — Web Audio's `fetch + decodeAudioData` is blocked under `file://` due to CORS, so the HTML audio element is the way to keep local playability.
- **Two design lessons from this session:**
  1. Sparse-chain audio: the ascending-audio principle from Breakout assumes DENSE chains. In Snake, eats are sparse, so the chain *reset* is more frequent than the climb and feels descending. Removed chain pitch entirely. Memory updated with the new sub-rule.
  2. Synthesis vs Foley: three rounds of Web Audio iteration on a "munch" never landed it. Real mouth sounds are recorded Foley; filtered noise can't fake the organic character. New memory saved (`synthesis_vs_foley_principle`).
- File ended up at ~500 lines. Edits done via python-in-bash with assertion-checked replacements throughout; no mount-sync issue this session.

## Active projects

(Empty — proto-003-snake shipped, next prototype is John's call.)

## Open decisions / next session candidates

1. **proto-004 — Tetris.** Next rung on the learning ladder. Builds on Snake's tick-based foundation; adds piece rotation with wall-kicks, line-clear detection + cascade, lock delay, bag randomization. Same macro-then-micro discipline applies (it's a known genre).
2. **proto-004 — small platformer.** Genre everyone underestimates. Introduces continuous-physics, tile-grid collisions resolved per-axis, and jump-feel (variable height, coyote time, jump buffer, apex float). Genuinely harder than Tetris despite seeming simpler.
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
