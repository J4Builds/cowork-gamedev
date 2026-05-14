# Snake (proto-003)

## One-sentence pitch

A faithful clone of Nokia Snake (1997) — guide a growing snake around a walled arena, eat food to grow longer, die if you hit a wall or your own body.

## Core loop

See the food → plan a path that doesn't cross your own body → eat → repeat with one more segment in the way. Each meal makes the next one harder to reach.

## Win/lose condition

- **Lose:** snake head hits a wall, or snake head hits any segment of its own body.
- **Win:** no win state. Endless score-chase. (Filling the entire grid is a theoretical win; in practice nobody gets there.)

## Fun test

Late-game threading: the snake is long enough that the arena is packed with body segments, and you're navigating through narrow gaps with one cell to spare. The peak moment is the "I can't believe I made it" weave — a sequence of tight turns through your own coils where any single mistimed input ends the run.

If a player at length 30+ holds their breath through a thread, the game works.

## Inspirations

- **Nokia Snake (1997)** — everything: walled arena (no wrap), speed ramps with length, +1-per-food scoring, monochrome LCD aesthetic, tick-based grid movement, default starting length of 3.
- **proto-002-breakout (us, 2026-05)** — three-stage speed ramp pattern, macro-then-micro discipline, restraint principle for the eventual juice pass.

## Out of scope

- Wrap-around walls (Snake II) — explicit cut. Walls killing is the canonical experience and is structurally different from self-collision, which is the concept we're here to learn.
- Powerups, special foods, bonus food with timers — Snake II territory, v2 if ever.
- Obstacles inside the arena, level select.
- Two-player mode.
- Touch / swipe input (keyboard only for prototype).
- Juice — deferred to a possible micro pass next session, same playbook as Pong and Breakout.

## What this prototype is for (concepts to internalize)

This is the first tick-based game in the studio. Concepts that matter here, that didn't matter in Pong or Breakout:

1. **Discrete-tick update loop.** Rendering still runs at 60fps via `requestAnimationFrame`, but the simulation advances only N times per second — every "tick" the snake moves one whole cell. The render loop interpolates nothing; you just draw whatever the last tick produced. This is a fundamentally different shape from the continuous-physics loops we wrote before.
2. **Self-modifying data structure.** The snake is an array of `{x, y}` cells. Moving = push a new head, pop the tail. Growing = push a new head, *don't* pop the tail. That asymmetry is the entire growth mechanic.
3. **Self-collision.** Different from object-vs-environment. Each tick: is the new head's cell occupied by any existing body segment?
4. **Input queue with constraint.** You can't 180° into yourself. Naive "set direction on keypress" fails if the player presses two directions inside one tick. Solution: buffer the next direction, only apply it at tick boundaries, and reject moves that reverse the current heading.

## Current state

Not started.
