# proto-001-pong

## One-sentence pitch

Atari Pong, faithfully — first to 7, you vs. a naive AI.

## Core loop

Read the ball, move your paddle, return the ball at an angle that the AI can't reach.

## Win/lose condition

First side to 7 points wins.

## Fun test

- Hitting the ball at the edge of the paddle should produce a *visibly sharper* outgoing angle than hitting it dead center. That's the whole skill ceiling — angle control.
- Long rallies should feel tense because the ball speeds up after every paddle hit.
- The AI should be beatable but punish lazy returns. If you can win without thinking, AI is too easy. If you can never put the ball where the AI isn't, AI is too fast.

## Inspirations

- **Atari Pong (1972)** — silhouette, scoring rules, paddle-position-driven angle control.
- **NES Tennis** — speed-up over a rally as an implicit difficulty curve.

## Out of scope

- Sound and music (micro pass at earliest)
- Juice: screen shake, ball trail, score flash, particles
- Multiple difficulty levels
- 2-player local mode (could revisit if 1P feels limiting)
- Power-ups, modifiers, paddle resizing, anything not in the original cabinet
- Mouse / touch input

## Current state

Macro pass complete. Awaiting playtest before any tuning or polish.
