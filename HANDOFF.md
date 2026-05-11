# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-11

**proto-002-breakout shipped in one session.** Macro pass + juice pass both landed.

- Macro pass: paddle, ball, 8×14 brick wall, row scoring (7/5/3/1), three-stage speed ramp, paddle-position-based ball steering, AABB collision with minimum-penetration-depth side detection, 3 lives, persistent brick state across deaths. Validated on first playtest — tunneling moment emerged naturally as the fun.
- Juice pass: full Pong-style stack (audio voices, hit-stop on paddle hits, paddle flash, axis-aware ball squash, brick particles, ball trail, score pulse, lives flash, ball-lost shake, terminal-phase overlay delay).
- **Key design lesson from this session:** row-based brick pitch (Atari original scheme) plays an ASCENDING phrase when climbing the wall but a DESCENDING phrase when chain-clearing top-down — which is exactly the peak moment. Descending sequences register as "winding down" even when in-tune. Replaced with chain-index pentatonic that ratchets ascending regardless of physical row order, capping at the top, reset on paddle hit or `CHAIN_TIMEOUT` gap. New memory saved.
- Final retune: dialed top speed 580 → 500 after the honest-intensity audio made the level-3 ramp feel too leapy.
- Mount-sync gotcha reappeared on the big juice rewrite (file tools reported success, Linux showed truncated content). Recovered with bash heredoc; subsequent surgical patches done via python-in-bash with assertion-checked replacements.

## Active projects

(Empty — Breakout shipped, next prototype is John's call.)

## Open decisions / next session candidates

1. **Start proto-003** — keep building foundational understanding before commercial ideas. Candidates: Snake (single-entity, growth-state), small platformer (gravity, jump-feel, level data), Tetris (rotation, line-clear, gravity). Genre choice is John's. For novel-feeling mechanics the validation-first rule applies; for clones the macro-then-micro + peak-moment principle does.
2. **Something else** — John's call.

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
3. **Active project's 