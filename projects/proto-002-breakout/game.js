// =============================================================
// proto-002-breakout — micro pass: juice.
//
// Faithful 1976 Breakout mechanics from the macro pass, with feel
// layered on top under the restraint principle: every dial dialed at
// the conservative end of "I can feel it" rather than "I can see it."
// Test: if the player can name one specific layer that dominates,
// that layer is too loud.
//
// Juice layers:
//   Audio:     chain-index pentatonic brick hits (sine + triangle, layered),
//              paddle voice (square click + sine thump),
//              wall bounce, ball lost, speed-ramp tick,
//              game-over sweep, win arpeggio
//   Impact:    50ms hit-stop on paddle hit only (no per-brick freeze
//              so chain-clears stay fast at speed level 3)
//   Visual:    paddle flash, axis-aware ball squash, 4-frame ball
//              trail, 3-particle brick puff in brick color
//   HUD:       subtle score-digit pulse on hit, lives flash on lost
//   Drama:     small screen shake on ball lost, brief overlay delay
//              on game-over/win so the audio cue lands first
//
// All tunables in the JUICE KNOBS block — tweak there, not in physics
// or rendering code. Tuning playbook from Pong: smaller numbers almost
// always feel better than bigger ones.
// =============================================================

// ---------- Canvas ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- Constants ----------
// Paddle.
const PADDLE_W      = 90;
const PADDLE_H      = 12;
const PADDLE_Y      = 540;
const PADDLE_SPEED  = 520;

// Ball.
const BALL_SIZE         = 10;
const MAX_BOUNCE_ANGLE  = Math.PI / 3;

// Brick wall.
const COLS       = 14;
const ROWS       = 8;
const BRICK_W    = 52;
const BRICK_H    = 20;
const BRICK_GAP  = 2;
const WALL_LEFT  = 23;
const WALL_TOP   = 80;

// Row palette + points (top → bottom). Atari original.
const ROW_COLORS = ["#dc2626","#dc2626","#ea580c","#ea580c","#16a34a","#16a34a","#eab308","#eab308"];
const ROW_POINTS = [        7,        7,        5,        5,        3,        3,        1,        1];

// Three-stage speed ramp (latched, monotonic).
const SPEED_LEVELS    = [280, 360, 460, 500];
const RAMP_HIT_4      = 4;
const RAMP_HIT_12     = 12;
const TOP_ROW_INDEX   = 1; // rows 0..1 are red

// Lives + serve.
const LIVES_START  = 3;
const SERVE_DELAY  = 0.6;

// ---------- Juice knobs ----------
// Tune here. Conservative defaults.
const HITSTOP_PADDLE         = 0.05;   // s — world freeze on paddle hit
const HITSTOP_BRICK          = 0.00;   // s — none in v1; chain-clears stay fast
const PADDLE_FLASH_DURATION  = 0.08;   // s
const BALL_SQUASH_DURATION   = 0.07;   // s
const BALL_SQUASH_AMOUNT     = 0.55;   // 0..1 compression along impact axis
const TRAIL_LENGTH           = 4;      // frames of ghost trail behind ball
const PARTICLES_PER_BRICK    = 3;
const PARTICLE_LIFE          = 0.25;   // s
const PARTICLE_SIZE          = 3;      // px
const PARTICLE_SPEED_PEAK    = 90;     // px/s initial outward speed
const PARTICLE_GRAVITY       = 280;    // px/s²
const SCORE_PULSE_DURATION   = 0.30;   // s
const SCORE_PULSE_SCALE      = 1.25;   // peak digit scale
const LIVES_FLASH_DURATION   = 0.25;   // s
const BALL_LOST_SHAKE_DUR    = 0.20;   // s
const BALL_LOST_SHAKE_MAG    = 5;      // px peak amplitude
const WIN_OVERLAY_DELAY      = 0.40;   // s — hold before dim hits
const GAMEOVER_OVERLAY_DELAY = 0.50;   // s — hold before dim hits

// Chain pitches for brick hits — pentatonic ascending. Each consecutive
// brick hit within CHAIN_TIMEOUT ratchets to the next note; chain caps
// at the top of the table and resets on paddle hit or timeout.
//
// Replaces an earlier row-based pitch scheme. From playtest (2026-05-11):
// ascending sequences during tunnel chain-clears felt triumphant, but
// the same scheme played DESCENDING phrases when the ball cleared rows
// top-down (which is exactly the peak moment). Descending = brain reads
// "winding down" even when the notes are in tune. So we ratchet by chain
// position, not by row, so the peak moment is always ascending.
//
// Pentatonic (C major) so repeated notes at the cap don't clash and any
// subset is consonant if overlap occurs.
const CHAIN_PITCHES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66]; // C4..D6
const CHAIN_TIMEOUT = 0.30; // s — gap between bricks above this resets chainIndex

// ---------- Input ----------
const keys = new Set();
const justPressed = new Set();
window.addEventListener("keydown", (e) => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  // Browsers gate AudioContext until a user gesture. Unlock on first
  // keypress so the first brick hit doesn't silently fail.
  ensureAudio();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ---------- State ----------
// "title" | "playing" | "gameOver" | "won"
let phase = "title";

const paddle = { x: W / 2 - PADDLE_W / 2, flashTimer: 0 };
const ball   = {
  x: 0, y: 0, vx: 0, vy: 0,
  speed: SPEED_LEVELS[0],
  squashTimer: 0,
  squashAxis: "y",  // "y" = compressed vertically (paddle/top-bottom hit), "x" = horizontal (side hit)
};

let bricks         = [];
let lives          = LIVES_START;
let score          = 0;
let hits           = 0;
let speedLevel     = 0;
let topRowReached  = false;
let serveTimer     = 0;

// Juice state — tick down each frame, set to max on trigger.
let hitstopTimer      = 0;
let shakeTimer        = 0;
let shakeMag          = 0;
let shakeX            = 0;
let shakeY            = 0;
let scorePulseTimer   = 0;
let livesFlashTimer   = 0;
let overlayDelayTimer = 0;  // delay before game-over/win dim overlay shows
let chainIndex        = 0;  // consecutive brick hits in current chain (audio pitch)
let chainTimer        = 0;  // counts down after each brick hit; 0 → chainIndex resets
const particles = [];       // {x, y, vx, vy, life, color}
const trail     = [];       // ring buffer of recent ball positions

// ---------- Init / reset ----------
function buildWall() {
  bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: WALL_LEFT + c * (BRICK_W + BRICK_GAP),
        y: WALL_TOP  + r * (BRICK_H + BRICK_GAP),
        row: r,
        alive: true,
        color: ROW_COLORS[r],
        points: ROW_POINTS[r],
      });
    }
  }
}

function resetBall() {
  ball.x = W / 2;
  ball.y = PADDLE_Y - 40;
  const angle = (Math.random() - 0.5) * (Math.PI / 3);
  ball.vx = Math.sin(angle);
  ball.vy = -Math.cos(angle);
  speedLevel    = 0;
  ball.speed    = SPEED_LEVELS[0];
  hits          = 0;
  topRowReached = false;
  serveTimer    = SERVE_DELAY;
  // Juice resets that should fire on every new ball.
  ball.squashTimer = 0;
  trail.length     = 0;
  hitstopTimer     = 0;
}

function startGame() {
  buildWall();
  lives             = LIVES_START;
  score             = 0;
  paddle.x          = W / 2 - PADDLE_W / 2;
  paddle.flashTimer = 0;
  particles.length  = 0;
  shakeTimer        = 0;
  shakeX            = 0;
  shakeY            = 0;
  scorePulseTimer   = 0;
  livesFlashTimer   = 0;
  overlayDelayTimer = 0;
  hitstopTimer      = 0;
  chainIndex        = 0;
  chainTimer        = 0;
  resetBall();
  phase = "playing";
}

// ---------- Audio ----------
// Web Audio API, lazily initialized on first user input. All voices
// programmatic (oscillator + gain envelope, optional pitch sweep) so
// the repo carries zero asset files. Two-tone layering = "body."
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playTone({ freq, duration = 0.08, type = "sine", attack = 0.005, gain = 0.12, sweepTo, startOffset = 0 }) {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime + startOffset;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// Brick hit — row-pitched. Sine on top for clarity, triangle an octave
// down for body. Soft waveforms (NOT raw square) so chained hits don't
// sound abrasive — the lesson from the harsh reference build.
function playBrickHit(freq) {
  playTone({ freq: freq,       duration: 0.05, type: "sine",     gain: 0.10 });
  playTone({ freq: freq * 0.5, duration: 0.07, type: "triangle", gain: 0.07 });
}

function playPaddleHit() {
  // Same shape as Pong, slightly less gain.
  playTone({ freq: 240, duration: 0.05, type: "square", gain: 0.12 });
  playTone({ freq: 90,  duration: 0.10, type: "sine",   gain: 0.18, sweepTo: 55 });
}

function playWallBounce() {
  playTone({ freq: 320, duration: 0.04, type: "square", gain: 0.08 });
}

function playBallLost() {
  // Short downward sweep — "uh oh."
  playTone({ freq: 220, duration: 0.35, type: "sine", gain: 0.14, sweepTo: 80 });
}

function playSpeedRamp() {
  // Brief upward tick — signals the difficulty bump.
  playTone({ freq: 440, duration: 0.08, type: "triangle", gain: 0.09, sweepTo: 880 });
}

function playGameOver() {
  // Longer, layered descending sweep.
  playTone({ freq: 330, duration: 0.70, type: "square", gain: 0.14, sweepTo: 80 });
  playTone({ freq: 110, duration: 0.80, type: "sine",   gain: 0.10, sweepTo: 50 });
}

function playWin() {
  // C-E-G arpeggio, triangle waves.
  playTone({ freq: 523, duration: 0.16, type: "triangle", gain: 0.12, startOffset: 0    });
  playTone({ freq: 659, duration: 0.16, type: "triangle", gain: 0.12, startOffset: 0.10 });
  playTone({ freq: 784, duration: 0.32, type: "triangle", gain: 0.14, startOffset: 0.20 });
}

// ---------- Particles ----------
// Tiny puff in brick color on break. Random outward velocity + gravity
// for a hint of debris. Fade by alpha across PARTICLE_LIFE.
function spawnBrickParticles(b) {
  for (let i = 0; i < PARTICLES_PER_BRICK; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_PEAK * (0.5 + Math.random() * 0.5);
    particles.push({
      x:     b.x + BRICK_W / 2 + (Math.random() - 0.5) * BRICK_W * 0.4,
      y:     b.y + BRICK_H / 2 + (Math.random() - 0.5) * BRICK_H * 0.4,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      life:  PARTICLE_LIFE,
      color: b.color,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += PARTICLE_GRAVITY * dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
  }
}

// ---------- Update ----------
function update(dt) {
  // SPACE: universal start / restart.
  if (justPressed.has(" ")) {
    if (phase === "title" || phase === "gameOver" || phase === "won") {
      startGame();
    }
  }

  if (phase === "title") return;

  // Animations that run in every live phase (so particles keep falling
  // and shake keeps decaying through the overlay delay).
  updateParticles(dt);
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    const t = Math.max(0, shakeTimer / BALL_LOST_SHAKE_DUR);
    shakeX = (Math.random() - 0.5) * 2 * shakeMag * t;
    shakeY = (Math.random() - 0.5) * 2 * shakeMag * t;
  } else {
    shakeX = 0;
    shakeY = 0;
  }

  // Terminal phases: tick overlay delay only.
  if (phase === "won" || phase === "gameOver") {
    if (overlayDelayTimer > 0) overlayDelayTimer -= dt;
    return;
  }

  // Hit-stop: world freezes briefly on impact. Physics + visual timers
  // paused (the freeze IS the punch). Shake + particles already updated
  // above so the freeze can still have a tiny rumble + debris motion.
  if (hitstopTimer > 0) {
    hitstopTimer -= dt;
    return;
  }

  // Tick visual timers (after hit-stop so a flash holds through the freeze).
  if (paddle.flashTimer > 0) paddle.flashTimer -= dt;
  if (ball.squashTimer  > 0) ball.squashTimer  -= dt;
  if (scorePulseTimer   > 0) scorePulseTimer   -= dt;
  if (livesFlashTimer   > 0) livesFlashTimer   -= dt;
  if (chainTimer        > 0) {
    chainTimer -= dt;
    if (chainTimer <= 0) chainIndex = 0;
  }

  // Paddle.
  let dir = 0;
  if (keys.has("ArrowLeft"))  dir -= 1;
  if (keys.has("ArrowRight")) dir += 1;
  paddle.x += dir * PADDLE_SPEED * dt;
  paddle.x = clamp(paddle.x, 0, W - PADDLE_W);

  // Serve: ball held still, paddle still movable.
  if (serveTimer > 0) {
    serveTimer -= dt;
    trail.length = 0; // don't draw a ghost on a static ball
    return;
  }

  // Ball move.
  ball.x += ball.vx * ball.speed * dt;
  ball.y += ball.vy * ball.speed * dt;

  // Trail sample after the move.
  trail.push({ x: ball.x, y: ball.y });
  while (trail.length > TRAIL_LENGTH) trail.shift();

  // Wall bounces.
  if (ball.x - BALL_SIZE / 2 < 0) {
    ball.x = BALL_SIZE / 2;
    ball.vx = Math.abs(ball.vx);
    playWallBounce();
  }
  if (ball.x + BALL_SIZE / 2 > W) {
    ball.x = W - BALL_SIZE / 2;
    ball.vx = -Math.abs(ball.vx);
    playWallBounce();
  }
  if (ball.y - BALL_SIZE / 2 < 0) {
    ball.y = BALL_SIZE / 2;
    ball.vy = Math.abs(ball.vy);
    playWallBounce();
  }

  // Paddle collision.
  if (
    ball.vy > 0 &&
    ball.y + BALL_SIZE / 2 > PADDLE_Y &&
    ball.y - BALL_SIZE / 2 < PADDLE_Y + PADDLE_H &&
    ball.x + BALL_SIZE / 2 > paddle.x &&
    ball.x - BALL_SIZE / 2 < paddle.x + PADDLE_W
  ) {
    bouncePaddle();
  }

  // Brick collisions.
  collideWithBricks();

  // Ball lost.
  if (ball.y - BALL_SIZE / 2 > H) {
    lives -= 1;
    shakeTimer = BALL_LOST_SHAKE_DUR;
    shakeMag   = BALL_LOST_SHAKE_MAG;
    if (lives <= 0) {
      phase = "gameOver";
      overlayDelayTimer = GAMEOVER_OVERLAY_DELAY;
      playGameOver();
    } else {
      livesFlashTimer = LIVES_FLASH_DURATION;
      playBallLost();
      resetBall();
    }
  }

  // Win.
  if (bricks.every(b => !b.alive)) {
    phase = "won";
    overlayDelayTimer = WIN_OVERLAY_DELAY;
    trail.length = 0;
    playWin();
  }
}

function bouncePaddle() {
  ball.y = PADDLE_Y - BALL_SIZE / 2;
  const center = paddle.x + PADDLE_W / 2;
  const offset = clamp((ball.x - center) / (PADDLE_W / 2), -1, 1);
  const angle  = offset * MAX_BOUNCE_ANGLE;
  ball.vx = Math.sin(angle);
  ball.vy = -Math.cos(angle);
  // Juice.
  paddle.flashTimer = PADDLE_FLASH_DURATION;
  ball.squashTimer  = BALL_SQUASH_DURATION;
  ball.squashAxis   = "y"; // hit from below → vertical compression
  hitstopTimer      = HITSTOP_PADDLE;
  // Paddle hit ends a chain — next brick starts the next chain from index 0.
  chainIndex        = 0;
  chainTimer        = 0;
  playPaddleHit();
}

function collideWithBricks() {
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    if (!b.alive) continue;

    const bx0 = ball.x - BALL_SIZE / 2;
    const bx1 = ball.x + BALL_SIZE / 2;
    const by0 = ball.y - BALL_SIZE / 2;
    const by1 = ball.y + BALL_SIZE / 2;

    if (bx1 <= b.x || bx0 >= b.x + BRICK_W) continue;
    if (by1 <= b.y || by0 >= b.y + BRICK_H) continue;

    const overlapX = Math.min(bx1 - b.x, b.x + BRICK_W - bx0);
    const overlapY = Math.min(by1 - b.y, b.y + BRICK_H - by0);
    let axis;
    if (overlapX < overlapY) {
      if (ball.vx > 0) ball.x -= overlapX;
      else             ball.x += overlapX;
      ball.vx = -ball.vx;
      axis = "x";
    } else {
      if (ball.vy > 0) ball.y -= overlapY;
      else             ball.y += overlapY;
      ball.vy = -ball.vy;
      axis = "y";
    }

    // Destroy + score.
    b.alive = false;
    score  += b.points;
    hits   += 1;

    // Juice triggers.
    spawnBrickParticles(b);
    // Chain-index pitch: each consecutive brick within CHAIN_TIMEOUT plays
    // the next ascending note. Tunneling chain-clears thus ALWAYS sound
    // triumphant regardless of which physical rows the ball is hitting.
    const pitch = CHAIN_PITCHES[Math.min(chainIndex, CHAIN_PITCHES.length - 1)];
    playBrickHit(pitch);
    chainIndex++;
    chainTimer = CHAIN_TIMEOUT;
    ball.squashTimer = BALL_SQUASH_DURATION;
    ball.squashAxis  = axis;
    scorePulseTimer  = SCORE_PULSE_DURATION;
    if (HITSTOP_BRICK > 0) hitstopTimer = HITSTOP_BRICK;

    // Speed-ramp triggers (latched). Audio cue fires only on promotion.
    const prevLevel = speedLevel;
    if (b.row <= TOP_ROW_INDEX && !topRowReached) {
      topRowReached = true;
      speedLevel = Math.max(speedLevel, 3);
    }
    if (hits >= RAMP_HIT_12) {
      speedLevel = Math.max(speedLevel, 2);
    } else if (hits >= RAMP_HIT_4) {
      speedLevel = Math.max(speedLevel, 1);
    }
    ball.speed = SPEED_LEVELS[speedLevel];
    if (speedLevel > prevLevel) playSpeedRamp();

    break;
  }
}

// ---------- Render ----------
function render() {
  // Apply screen shake at the world level so every draw inherits the
  // offset. Background fill emitted at world (-shakeX, -shakeY) so it
  // covers the canvas after translate.
  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = "#000";
  ctx.fillRect(-shakeX, -shakeY, W, H);

  if (phase === "title") {
    drawTitle();
    ctx.restore();
    return;
  }

  drawHUD();
  drawBricks();
  drawParticles();
  drawTrail();
  drawPaddle();
  drawBall();

  // Terminal overlays. Hold the dim back briefly so the cue audio lands
  // first; the player sees the moment, then the overlay.
  if (phase === "gameOver" && overlayDelayTimer <= 0) {
    drawDimOverlay();
    drawText("GAME OVER",                 W / 2, H / 2 - 40, 56);
    drawText(`Score: ${score}`,           W / 2, H / 2 + 10, 22, "#aaa");
    drawText("Press SPACE to play again", W / 2, H / 2 + 50, 18, "#888");
  } else if (phase === "won" && overlayDelayTimer <= 0) {
    drawDimOverlay();
    drawText("YOU WIN",                   W / 2, H / 2 - 40, 56);
    drawText(`Score: ${score}`,           W / 2, H / 2 + 10, 22, "#aaa");
    drawText("Press SPACE to play again", W / 2, H / 2 + 50, 18, "#888");
  }

  ctx.restore();
}

function drawTitle() {
  drawText("BREAKOUT",                         W / 2, H / 2 - 100, 64);
  drawText("Clear the wall — 3 balls",         W / 2, H / 2 - 40,  18, "#aaa");
  drawText("← / →  to move    SPACE to start", W / 2, H / 2,        14, "#888");
  drawText("Press SPACE",                      W / 2, H / 2 + 60,   22);
}

function drawHUD() {
  // Score with pulse — ease-out so the digit pops on the leading edge.
  let scoreScale = 1;
  if (scorePulseTimer > 0) {
    const t = scorePulseTimer / SCORE_PULSE_DURATION;
    const ease = 1 - (1 - t) * (1 - t);
    scoreScale = 1 + (SCORE_PULSE_SCALE - 1) * ease;
  }
  ctx.save();
  ctx.translate(24, 32);
  ctx.scale(scoreScale, scoreScale);
  drawText(`SCORE  ${score.toString().padStart(4, "0")}`, 0, 0, 18, "#aaa", "monospace", "left");
  ctx.restore();

  // Lives — color flashes white briefly when a ball is lost.
  const livesColor = livesFlashTimer > 0 ? "#fff" : "#aaa";
  drawText(`BALLS  ${lives}`, W - 24, 32, 18, livesColor, "monospace", "right");
}

function drawBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / PARTICLE_LIFE);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
  }
  ctx.globalAlpha = 1;
}

function drawTrail() {
  if (trail.length < 2) return;
  // Skip the last entry (it's where the ball currently is).
  for (let i = 0; i < trail.length - 1; i++) {
    const p = trail[i];
    const a = ((i + 1) / trail.length) * 0.30;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(p.x - BALL_SIZE / 2, p.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
  }
}

function drawPaddle() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
  if (paddle.flashTimer > 0) {
    const t    = Math.max(0, paddle.flashTimer / PADDLE_FLASH_DURATION);
    const grow = 5 * t;
    ctx.fillStyle = `rgba(255,255,255,${0.5 * t})`;
    ctx.fillRect(paddle.x - grow, PADDLE_Y - grow, PADDLE_W + grow * 2, PADDLE_H + grow * 2);
  }
}

function drawBall() {
  ctx.fillStyle = "#fff";
  if (ball.squashTimer > 0) {
    const t        = Math.max(0, ball.squashTimer / BALL_SQUASH_DURATION);
    const compress = 1 - BALL_SQUASH_AMOUNT * t;
    const stretch  = 1 + (BALL_SQUASH_AMOUNT * 0.4) * t;
    let sx, sy;
    if (ball.squashAxis === "y") { sx = stretch;  sy = compress; }
    else                         { sx = compress; sy = stretch;  }
    const w = BALL_SIZE * sx;
    const h = BALL_SIZE * sy;
    ctx.fillRect(ball.x - w / 2, ball.y - h / 2, w, h);
  } else {
    ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
  }
}

function drawDimOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(-shakeX, -shakeY, W, H);
}

function drawText(text, x, y, size, color = "#fff", family = "system-ui, sans-serif", align = "center") {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------- Loop ----------
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  justPressed.clear();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
