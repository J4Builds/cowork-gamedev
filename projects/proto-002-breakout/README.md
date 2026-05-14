# proto-002-breakout

## Status

shipped

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
- **Macro-pass playtest (2026-05-11):** "Felt much better than the [reference] one I just played. The paddle was smooth, the colors were better, and the speed kept it engaging. The most satisfying part is when you get the ball to go past the empty space on the sides, and start bouncing from the ceiling to the blocks from above, eliminating whole rows at a time." Tunneling-strategy fun moment emerged naturally from the mechanics.

### Juice layers (shipped 2026-05-11)

- **Audio.** Chain-index pentatonic brick hits (sine + triangle, layered), Pong-ported paddle voice, wall bounce, ball-lost downward sweep, speed-ramp upward tick, layered game-over descending sweep, C-E-G win arpeggio. AudioContext lazy-inits on first keypress; zero asset files.
- **Impact.** 50ms hit-stop on paddle hit; no per-brick freeze so chain-clears stay fast.
- **Visual.** Paddle flash, axis-aware ball squash on impact axis, 4-frame ball trail, 3-particle brick-color puff on break.
- **HUD.** Subtle score-digit pulse on hit (1.25× peak), lives indicator flashes white on ball lost.
- **Drama.** 5px / 200ms screen shake on ball lost, 400-500ms overlay delay on terminal phases so the audio cue lands first.

All dials in the JUICE KNOBS block. Final tuning: top speed dialed from 580 → 500 after juice playtest showed the level-3 ramp felt too leapy now that the audio honestly reads the game's intensity.

### Audio design lesson learned this session

First juice playtest used **row-based** brick pitch — each row a distinct note. Ascending sequences during tunnel chain-clears felt triumphant, but the same scheme played DESCENDING phrases when the ball cleared rows top-down (the peak moment). Descending sequences register as "winding down" even when the notes are in tune — psychoacoustic asymmetry.

Replaced with **chain-index pitch**: each consecutive brick within `CHAIN_TIMEOUT` (0.3s) ratchets to the next ascending note, capping at the top of the pentatonic table. Paddle hit or timeout resets to index 0. Tunnel chain-clears now *always* ascend regardless of which physical rows the ball is hitting. Cost: lose row identification in audio. Visual color already encoded the row; no real loss.

Principle to carry forward: when designing per-event audio for chains or streaks, the audio sequence must be ascending or steady, never descending — regardless of what the action visually is. If the peak moment involves a sequence of events, descending audio actively works against the player's perception.

## Known issues

None reported. Corner collisions resolve to the larger-overlap axis by tie-break — acceptable.

## Next session

Breakout is shipped. Next prototype is John's call. Default candidates per the working principles: proto-003 in a new genre to keep building foundational understanding (Snake? small platformer? something with novel mechanics where the validation-first rule applies instead of macro-then-micro).
