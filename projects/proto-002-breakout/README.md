# proto-002-breakout

## Status

prototype

## How to run

Open `index.html` in any modern browser. Or play live at:
`https://j4builds.github.io/cowork-gamedev/projects/proto-002-breakout/`

## Controls

- **← / →** — move paddle
- **SPACE** — start / restart

## What works

- Paddle moves smoothly under ← / → with edge clamps.
- Ball serves from above the paddle at a random ±30° angle from vertical, after a 0.6s pause so the player can pre-position.
- Paddle-position-based ball steering — the position of contact on the paddle face sets the outgoing angle.
- Wall bounces off top, left, right.
- 8 × 14 brick wall, classic Atari palette (red, orange, green, yellow — two rows each).
- AABB ball-brick collision with side detection via minimum penetration depth — the ball reflects off the correct face whether it hits a brick from above, below, or the side.
- Row-based scoring: red = 7, orange = 5, green = 3, yellow = 1.
- Three-stage speed ramp: bumps at hit 4, hit 12, and the first time the ball reaches a red row (whichever trigger fires first promotes the level — latched, never goes backward).
- 3 lives. Brick state persists across deaths (that's the difficulty curve).
- Title / playing / game over / win states with SPACE as the universal advance.
- **Playtest verdict (2026-05-11):** "Felt much better than the [reference] one I just played. The paddle was smooth, the colors were better, and the speed kept it engaging. The most satisfying part is when you get the ball to go past the empty space on the sides, and start bouncing from the ceiling to the blocks from above, eliminating whole rows at a time." The tunneling-strategy fun moment emerges naturally from the mechanics.

## Known issues

None reported. Corner collisions resolve to the larger-overlap axis by tie-break (acceptable for the macro pass).

## Next session

Juice pass — port the discipline from Pong (impact stack, audio, restrained dials). Specific focus areas:

- **Brick-hit audio.** Row-based pitch (each row plays a distinct note — the Atari original did this and it's load-bearing for feedback), but soft waveforms (sine/triangle, not raw square) so it doesn't sound abrasive like the reference build did. Layer like Pong's paddle voice — click + body — so each hit has weight.
- **Paddle-hit feel.** Port Pong's stack: short hit-stop, paddle flash, ball squash on impact axis.
- **Score / lives feedback.** Score-digit pulse on brick break. Lives indicator flash when a ball is lost.
- **Optional motion.** Light ball trail, maybe shorter than Pong's since the ball moves faster at speed-level 3.
- **Speed-ramp moment.** Each ramp trigger could get a tiny audio cue ("kick up") so the player feels the difficulty bumping.

Restraint principle still applies — every dial conservative, cumulative feel over individual dominance. The Atari silhouette has to hold.
