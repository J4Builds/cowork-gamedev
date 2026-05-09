# proto-001-pong

## One-sentence pitch

Atari Pong, faithfully — first to 7, you vs. AI, three difficulty presets.

## Core loop

Read the ball, move your paddle, return the ball at an angle that the AI can't reach.

## Win/lose condition

First side to 7 points wins.

## Fun test

- Hitting the ball at the edge of the paddle should produce a *visibly sharper* outgoing angle than hitting it dead center. That's the whole skill ceiling — angle control.
- Long rallies should feel tense because the ball speeds up after every paddle hit.
- The AI should be beatable on Normal with deliberate sharp shots, trivial on Easy, and punishing on Hard.

## Inspirations

- **Atari Pong (1972)** — silhouette, scoring rules, paddle-position-driven angle control.
- **NES Tennis** — speed-up over a rally as an implicit difficulty curve.

## Out of scope

- Sound and music (decision pending — possible polish pass)
- Juice: screen shake, ball trail, score flash, particles (decision pending)
- 2-player local mode (could revisit if 1P feels limiting)
- Power-ups, modifiers, paddle resizing, anything not in the original cabinet
- Mouse / touch input

## Current state

Macro pass + first micro pass complete. The AI went through three iterations:

1. **Naive tracker** (capped at 320, then 260 px/sec). Sharp angled shots beat it because vertical ball velocity at extreme angles outpaced the AI's vertical speed cap.
2. **Full trajectory prediction** (bounce-aware projection of ball y at AI's x-line). Became unbeatable — even at low speeds the AI commits early to the right spot.
3. **Predict-and-blend** (final). AI's target is `lerp(ball.y, predicted, predictionFraction)`. Easy uses 0.40, Normal 0.70, Hard 0.95. Lower fraction = AI biases toward where the ball IS rather than where it WILL BE, so sharp shots reliably score.

Pause + difficulty selector also shipped (Space mid-match, ←/→ in title/pause/gameOver). Selection persisted to localStorage. Default Normal feels right per playtest.

Decision pending: polish pass (juice + sound) or call shipped and start proto-002-breakout.
