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

## Out of scope (kept out — see CUT.md for cut-pass-specific items)

- Music (procedural SFX only — three voices)
- 2-player local mode (could revisit if 1P feels limiting)
- Power-ups, modifiers, paddle resizing, anything not in the original cabinet
- Mouse / touch input
- Particles, camera zoom, chromatic aberration — silhouette-violating juice

## Current state

Macro pass + two micro passes complete. **Status: shipped (playable, polished, mechanics + feel both validated).**

### AI tuning (micro pass 1)

The AI went through three iterations:

1. **Naive tracker** (capped at 320, then 260 px/sec). Sharp angled shots beat it because vertical ball velocity at extreme angles outpaced the AI's vertical speed cap.
2. **Full trajectory prediction** (bounce-aware projection of ball y at AI's x-line). Became unbeatable — even at low speeds the AI commits early to the right spot.
3. **Predict-and-blend** (final). AI's target is `lerp(ball.y, predicted, predictionFraction)`. Easy uses 0.40, Normal 0.70, Hard 0.95. Lower fraction = AI biases toward where the ball IS rather than where it WILL BE, so sharp shots reliably score.

Pause + difficulty selector also shipped (Space mid-match, ←/→ in title/pause/gameOver). Selection persisted to localStorage. Default Normal feels right per playtest.

### Juice pass (micro pass 2)

Seven layers added in one bundle, all dialed for restraint to preserve the Atari silhouette:

- **Impact**: hit-stop (50ms world freeze on paddle contact), paddle flash bloom (80ms), ball squash on impact axis (70ms, 55% compression).
- **Score**: decaying screen shake (280ms, 7px peak), per-side score-digit pulse (450ms, 1.55× peak scale, ease-out).
- **Motion**: 6-frame ball trail with fading alpha.
- **Audio**: three Web Audio voices — paddle hit (240Hz square click + 90Hz→55Hz sine thump), wall bounce (320Hz square tick), score (660Hz→880Hz square + 220Hz→110Hz square sweep). Lazy AudioContext init on first keypress.

Validated on first playtest — no retuning needed. The principle that paid off: every dial picked at the conservative end of "I can feel it" rather than "I can see it." When in doubt, pull back.
