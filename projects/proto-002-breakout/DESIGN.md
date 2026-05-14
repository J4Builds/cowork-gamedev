# Breakout (proto-002)

## One-sentence pitch

A faithful clone of Atari's 1976 Breakout — knock down a wall of bricks with a ball you steer using a horizontal paddle, with the classic three-stage speed ramp.

## Core loop

Aim → hit → reposition → repeat. The skill is steering the ball with where it lands on the paddle, so the *next* hit clears the brick you want.

## Win/lose condition

- **Win:** clear all 112 bricks (8 rows × 14 columns).
- **Lose:** miss the ball 3 times.

Brick state persists across lost balls. You don't get a fresh wall when you die — that's the whole difficulty curve.

## Fun test

The *plink* of breaking a brick, and the chain of plinks when the ball gets above the wall and clears a column on its own. If a player describes that moment with a smile, the game works.

## Inspirations

- **Atari Breakout (1976)** — everything: layout, color palette, scoring by row (7/5/3/1), speed ramps at hit 4 / hit 12 / first red-row hit, paddle-position-based ball angle.
- **proto-001-pong (us, 2026-05)** — paddle hit feel, Web Audio voice design, restraint principle for the eventual juice pass.

## Out of scope

- Powerups (multi-ball, expand paddle, laser, sticky) — Arkanoid territory, v2 after the core feels right.
- Multiple levels — one wall is enough to validate the loop.
- Brick state machines (multi-hit bricks, indestructibles) — same reason.
- Juice — explicitly deferred to the next session, same playbook as Pong (macro first, micro second).

## Current state

**Shipped 2026-05-11.** Macro pass and juice pass both landed in one session.

- Macro pass: faithful 1976 mechanics. Fun test validated on first playtest — the tunneling moment emerged naturally without coaching.
- Juice pass: ported Pong's discipline (audio voices, hit-stop on paddle hits, paddle flash, axis-aware ball squash, ball trail, brick particles, score pulse, lives flash, ball-lost shake, terminal-phase overlay delay).
- Mid-juice retune: dropped row-based brick audio in favor of chain-index pentatonic ascending after playtest revealed that descending pitch phrases during tunnel chain-clears registered as disruptive. Also dialed top speed 580 → 500 after the honest-intensity audio made the level-3 ramp feel too leapy.

Reference for future projects: how restrained juice layers compound to a polished feel without betraying the Atari silhouette, and how ascending-only chain audio supports peak moments.
