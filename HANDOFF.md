# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-11

Built the **proto-002-breakout macro pass** end-to-end in one session. Faithful 1976 clone: paddle, ball, 8×14 brick wall, classic palette, row-based scoring (7/5/3/1), three-stage speed ramp (hit 4 / hit 12 / first red-row hit), 3 lives, persistent brick state across deaths, paddle-position-based ball steering, AABB collision with minimum-penetration-depth side detection. ~355 lines, all tunables hoisted to a constants block.

- First playtest validated the fun test: the tunneling moment (ball escapes into a side channel, slips above the wall, chain-clears rows from underneath the ceiling) emerged naturally — John's verdict: "the most satisfying part."
- No juice this session — explicitly deferred. Same playbook as Pong: macro first, micro second.
- New gamedev concepts introduced cleanly: many-entity AABB collision, side detection by minimum penetration depth, latched level-based speed ramps.
- Reference-build observation worth carrying into the juice pass: the brick-hit audio in the itch.io build (Rin Est) sounded harsh / "like an error." Atari used row-pitched square waves — the *pitch-per-row* idea is load-bearing for feedback and worth keeping, but soft waveforms (sine/triangle, layered like Pong's paddle voice) are the answer for not sounding abrasive.

## Active projects

- **proto-002-breakout** — macro complete, juice pending. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-002-breakout/. DESIGN.md, README.md, CUT.md present.

## Open decisions / next session candidates

1. **Juice pass on proto-002-breakout** — pre-committed direction. Port Pong's discipline (impact stack, audio voices, restrained dials). Specific focuses captured in the project README. Restraint principle applies (memory file documents it).
2. **Something else** — John's call.

## Recently retired

- **proto-001-pong** — shipped 2026-05-10. Faithful Atari Pong with three difficulty presets and a restrained juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-001-pong/. Reference point for "what restrained juice feels like."

## Pending tooling work

- `studio/cowork-push.py` aborts if any tracked file shrinks >50% since the last commit (defends against the Cowork mount sync bug). If a legitimate large deletion is needed, run with `--allow-shrink`.
- Mount sync gotcha: when `Read` returns truncated content or the script aborts on shrinkage, the workaround is to rewrite via bash heredoc to both `/tmp/cowork-mirror/<path>` and the working tree path, verify with `wc -c`, then push. Documented in COWORK_INSTRUCTIONS.md.

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
