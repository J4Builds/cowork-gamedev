// =============================================================
// proto-001-pong — micro pass: juice (impact + score + motion + audio).
//
// Title -> playing -> paused -> gameOver -> playing, with three
// difficulty presets, a partial-prediction AI, and Space as the
// universal "advance / pause / resume" key.
//
// Polish layered on top of mechanics:
//   - Impact: hit-stop, paddle flash, ball squash on paddle hits.
//   - Score:  small screen shake + score-digit pulse on a point.
//   - Motion: short ball trail.
//   - Audio:  programmatic Web Audio tones for paddle hit / wall
//             bounce / score (no sample files).
//
// Every layer is dialed for restraint — Pong's silhouette stays.
// All tunables live in the "Juice knobs" block below; tweak there,
// not in the rendering code.
// =============================================================

// ---------- Canvas ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- Constants ----------
const PADDLE_W = 12;
const PADDLE_H = 90;
const PADDLE_PAD = 24;
const PLAYER_SPEED = 420;
const AI_DEADBAND = 8;
const BALL_SIZE = 12;
const BALL_SPEED_START = 420;
const BALL_SPEED_INC = 30;
const BALL_SPEED_MAX = 720;
const MAX_BOUNCE_ANGLE = Math.PI / 3;
const SERVE_DELAY = 0.5;
const WIN_SCORE = 7;

// ---------- Juice knobs ----------
// Every dial for the "feel" layer. Tune from playtest. Default rule of
// thumb: smaller numbers almost always feel better than bigger ones.
const HITSTOP_DURATION       = 0.05; // s — world freeze on paddle hit
const PADDLE_FLASH_DURATION  = 0.08; // s — paddle bloom on hit
const BALL_SQUASH_DURATION   = 0.07; // s — ball compresses then springs
const BALL_SQUASH_AMOUNT     = 0.55; // 0..1 fraction along impact axis
const SHAKE_DURATION         = 0.28; // s — screen shake on a point
const SHAKE_MAGNITUDE        = 7;    // px — peak shake amplitude
const SCORE_PULSE_DURATION   = 0.45; // s — digit grows then settles
const SCORE_PULSE_SCALE      = 1.55; // peak scale of pulsing digit
const TRAIL_LENGTH           = 6;    // # of ghost samples behind ball

// ---------- Difficulty presets ----------
// Four knobs differentiate them:
//   - aiSpeed: vertical px/sec the paddle can move (the speed cap that
//     makes physically-fast shots possible to beat)
//   - aiReactionTime: seconds between AI re-targets — the longer it is,
//     the more committed the AI is to a stale aim point
//   - aiAimError: ± px of wobble layered on each retarget
//   - aiPredictionFraction: 0..1, how much the AI trusts its full
//     bounce-aware prediction vs. the ball's current y. Lower values
//     bias the AI's aim toward where the ball IS, missing where it
//     WILL BE — this is the main lever that keeps sharp shots scoreable.
const DIFFICULTIES = {
  easy:   { label: "EASY",   aiSpeed: 180, aiReactionTime: 0.25, aiAimError: 50, aiPredictionFraction: 0.40 },
  normal: { label: "NORMAL", aiSpeed: 220, aiReactionTime: 0.20, aiAimError: 30, aiPredictionFraction: 0.70 },
  hard:   { label: "HARD",   aiSpeed: 280, aiReactionTime: 0.10, aiAimError: 15, aiPredictionFraction: 0.95 },
};
const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

// Persist selection across reloads.
let difficultyIndex = (() => {
  const v = parseInt(localStorage.getItem("pong:difficulty") ?? "1", 10);
  return Number.isInteger(v) && v >= 0 && v < DIFFICULTY_ORDER.length ? v : 1;
})();
function difficulty() { return DIFFICULTIES[DIFFICULTY_ORDER[difficultyIndex]]; }
function setDifficulty(i) {
  difficultyIndex = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, i));
  try { localStorage.setItem("pong:difficulty", String(difficultyIndex)); } catch (e) {}
}

// ---------- Input ----------
// keys: held this frame. justPressed: pressed this frame only (edge).
const keys = new Set();
const justPressed = new Set();
window.addEventListener("keydown", (e) => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  // Browsers gate AudioContext until a user input. Unlock on the first
  // keypress so paddle hits don't silently fail at match start.
  ensureAudio();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ---------- State ----------
// "title" | "playing" | "paused" | "gameOver"
let phase = "title";

const player = { y: H / 2 - PADDLE_H / 2, score: 0, flashTimer: 0 };
const ai     = { y: H / 2 - PADDLE_H / 2, score: 0, flashTimer: 0 };
const ball   = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BALL_SPEED_START, squashTimer: 0 };
let serveDelay = 0;
let winner = null; // "player" | "ai"

let aiTargetY = H / 2;
let aiReactTimer = 0;

// Juice state — these tick down each frame, set to their max on trigger.
let hitstopTimer = 0;
let shakeTimer = 0;
let shakeX = 0;
let shakeY = 0;
let playerScorePulse = 0;
let aiScorePulse = 0;
// Ring buffer of recent ball positions. Push every physics frame, trim to
// TRAIL_LENGTH. Drawn back-to-front with fading alpha to imply speed.
const trail = [];

function serveBall(direction) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = BALL_SPEED_START;
  ball.squashTimer = 0;
  trail.length = 0;
  const angle = (Math.random() - 0.5) * (Math.PI / 3);
  ball.vx = Math.cos(angle) * direction;
  ball.vy = Math.sin(angle);
  serveDelay = SERVE_DELAY;
}

function startMatch() {
  player.score = 0;
  ai.score = 0;
  player.y = H / 2 - PADDLE_H / 2;
  ai.y = H / 2 - PADDLE_H / 2;
  player.flashTimer = 0;
  ai.flashTimer = 0;
  hitstopTimer = 0;
  shakeTimer = 0;
  playerScorePulse = 0;
  aiScorePulse = 0;
  winner = null;
  serveBall(Math.random() < 0.5 ? -1 : 1);
  phase = "playing";
}

// ---------- Audio ----------
// Web Audio API, lazily initialized on first user input. All sounds are
// generated programmatically (oscillator + gain envelope, optional pitch
// sweep) so the repo carries zero asset files. The three "voices" each
// layer a couple of tones so a hit has body, not just a beep.
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playTone({ freq, duration = 0.08, type = "square", attack = 0.005, gain = 0.15, sweepTo }) {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
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
function playPaddleHit() {
  // Click on top, thump underneath. Two tones layered = "body".
  playTone({ freq: 240, duration: 0.05, type: "square", gain: 0.16 });
  playTone({ freq: 90,  duration: 0.10, type: "sine",   gain: 0.22, sweepTo: 55 });
}
function playWallBounce() {
  playTone({ freq: 320, duration: 0.04, type: "square", gain: 0.10 });
}
function playScore() {
  playTone({ freq: 660, duration: 0.18, type: "square", gain: 0.16, sweepTo: 880 });
  playTone({ freq: 220, duration: 0.20, type: "square", gain: 0.10, sweepTo: 110 });
}

// ---------- Update ----------
function update(dt) {
  // --- Menu input (title / paused / gameOver): ←/→ change difficulty ---
  if (phase === "title" || phase === "paused" || phase === "gameOver") {
    if (justPressed.has("ArrowLeft"))  setDifficulty(difficultyIndex - 1);
    if (justPressed.has("ArrowRight")) setDifficulty(difficultyIndex + 1);
  }

  // --- Space: universal advance / pause / resume ---
  if (justPressed.has(" ")) {
    if (phase === "title" || phase === "gameOver") {
      startMatch();
    } else if (phase === "playing") {
      phase = "paused";
    } else if (phase === "paused") {
      phase = "playing";
    }
  }

  // Freeze simulation outside the playing phase.
  if (phase !== "playing") return;

  // --- Hit-stop: world freezes briefly on paddle contact. Physics, input,
  // and visual timers all paused so the player's nervous system registers
  // the hit before motion resumes. The freeze IS the punch. ---
  if (hitstopTimer > 0) {
    hitstopTimer -= dt;
    return;
  }

  // --- Tick visual timers ---
  if (player.flashTimer > 0)   player.flashTimer  -= dt;
  if (ai.flashTimer > 0)       ai.flashTimer      -= dt;
  if (ball.squashTimer > 0)    ball.squashTimer   -= dt;
  if (playerScorePulse > 0)    playerScorePulse   -= dt;
  if (aiScorePulse > 0)        aiScorePulse       -= dt;
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    // Decaying random offset; magnitude scales with remaining/total time.
    const t = Math.max(0, shakeTimer / SHAKE_DURATION);
    const mag = SHAKE_MAGNITUDE * t;
    shakeX = (Math.random() - 0.5) * 2 * mag;
    shakeY = (Math.random() - 0.5) * 2 * mag;
  } else {
    shakeX = 0;
    shakeY = 0;
  }

  // --- Player paddle ---
  let dir = 0;
  if (keys.has("w") || keys.has("W") || keys.has("ArrowUp"))   dir -= 1;
  if (keys.has("s") || keys.has("S") || keys.has("ArrowDown")) dir += 1;
  player.y += dir * PLAYER_SPEED * dt;
  player.y = clamp(player.y, 0, H - PADDLE_H);

  // --- AI paddle ---
  const D = difficulty();
  aiReactTimer -= dt;
  if (aiReactTimer <= 0) {
    const aiLeft = W - PADDLE_PAD - PADDLE_W;
    if (ball.vx > 0) {
      const predicted = predictBallY(aiLeft);
      // Blend predicted intercept with current ball.y. predictionFraction
      // < 1 makes the AI's aim biased toward where the ball IS rather
      // than where it WILL BE — sharp shots leave AI committed to a
      // position too far from the actual landing y.
      const blended = ball.y + (predicted - ball.y) * D.aiPredictionFraction;
      aiTargetY = blended + (Math.random() - 0.5) * D.aiAimError * 2;
    } else {
      aiTargetY = H / 2;
    }
    aiReactTimer = D.aiReactionTime;
  }
  const aiCenter = ai.y + PADDLE_H / 2;
  if (aiCenter < aiTargetY - AI_DEADBAND) ai.y += D.aiSpeed * dt;
  else if (aiCenter > aiTargetY + AI_DEADBAND) ai.y -= D.aiSpeed * dt;
  ai.y = clamp(ai.y, 0, H - PADDLE_H);

  // --- Ball ---
  if (serveDelay > 0) {
    serveDelay -= dt;
  } else {
    ball.x += ball.vx * ball.speed * dt;
    ball.y += ball.vy * ball.speed * dt;

    // Trail: one snapshot per physics frame after the move. Older entries
    // shift out once the buffer reaches TRAIL_LENGTH.
    trail.push({ x: ball.x, y: ball.y });
    while (trail.length > TRAIL_LENGTH) trail.shift();

    // Top / bottom wall bounce.
    if (ball.y - BALL_SIZE / 2 < 0) {
      ball.y = BALL_SIZE / 2;
      ball.vy = Math.abs(ball.vy);
      playWallBounce();
    }
    if (ball.y + BALL_SIZE / 2 > H) {
      ball.y = H - BALL_SIZE / 2;
      ball.vy = -Math.abs(ball.vy);
      playWallBounce();
    }

    // Player paddle collision.
    const playerRight = PADDLE_PAD + PADDLE_W;
    if (
      ball.vx < 0 &&
      ball.x - BALL_SIZE / 2 < playerRight &&
      ball.x + BALL_SIZE / 2 > PADDLE_PAD &&
      ball.y + BALL_SIZE / 2 > player.y &&
      ball.y - BALL_SIZE / 2 < player.y + PADDLE_H
    ) {
      ball.x = playerRight + BALL_SIZE / 2;
      bouncePaddle(player.y, +1);
      player.flashTimer = PADDLE_FLASH_DURATION;
      ball.squashTimer  = BALL_SQUASH_DURATION;
      hitstopTimer      = HITSTOP_DURATION;
      playPaddleHit();
    }

    // AI paddle collision.
    const aiLeft = W - PADDLE_PAD - PADDLE_W;
    if (
      ball.vx > 0 &&
      ball.x + BALL_SIZE / 2 > aiLeft &&
      ball.x - BALL_SIZE / 2 < W - PADDLE_PAD &&
      ball.y + BALL_SIZE / 2 > ai.y &&
      ball.y - BALL_SIZE / 2 < ai.y + PADDLE_H
    ) {
      ball.x = aiLeft - BALL_SIZE / 2;
      bouncePaddle(ai.y, -1);
      ai.flashTimer    = PADDLE_FLASH_DURATION;
      ball.squashTimer = BALL_SQUASH_DURATION;
      hitstopTimer     = HITSTOP_DURATION;
      playPaddleHit();
    }

    // Score.
    if (ball.x < -BALL_SIZE) {
      ai.score += 1;
      aiScorePulse = SCORE_PULSE_DURATION;
      shakeTimer   = SHAKE_DURATION;
      playScore();
      if (ai.score >= WIN_SCORE) endMatch("ai");
      else serveBall(+1);
    } else if (ball.x > W + BALL_SIZE) {
      player.score += 1;
      playerScorePulse = SCORE_PULSE_DURATION;
      shakeTimer       = SHAKE_DURATION;
      playScore();
      if (player.score >= WIN_SCORE) endMatch("player");
      else serveBall(-1);
    }
  }
}

function bouncePaddle(paddleY, dirX) {
  const center = paddleY + PADDLE_H / 2;
  const offset = clamp((ball.y - center) / (PADDLE_H / 2), -1, 1);
  const angle = offset * MAX_BOUNCE_ANGLE;
  ball.vx = Math.cos(angle) * dirX;
  ball.vy = Math.sin(angle);
  ball.speed = Math.min(ball.speed + BALL_SPEED_INC, BALL_SPEED_MAX);
}

function endMatch(who) {
  winner = who;
  phase = "gameOver";
}

// ---------- Render ----------
function render() {
  // Apply screen shake by translating the world; every draw inside
  // save/restore inherits the shifted origin. Background fills are
  // emitted at world (-shakeX, -shakeY) so they cover the canvas after
  // translate.
  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = "#000";
  ctx.fillRect(-shakeX, -shakeY, W, H);

  // Always draw the play field outside title so pause/gameOver overlay
  // sits on top of the frozen game.
  if (phase !== "title") drawPlayField();

  if (phase === "title") {
    drawTitleScreen();
  } else if (phase === "paused") {
    drawDimOverlay();
    drawText("PAUSED", W / 2, H / 2 - 80, 56);
    drawDifficultySelector(W / 2, H / 2);
    drawText("Press SPACE to resume", W / 2, H / 2 + 90, 20, "#aaa");
  } else if (phase === "gameOver") {
    drawDimOverlay();
    drawText(winner === "player" ? "YOU WIN" : "AI WINS", W / 2, H / 2 - 80, 56);
    drawDifficultySelector(W / 2, H / 2);
    drawText("Press SPACE to play again", W / 2, H / 2 + 90, 20, "#aaa");
  }

  ctx.restore();
}

function drawTitleScreen() {
  drawText("PONG", W / 2, H / 2 - 150, 64);
  drawText("First to 7 wins", W / 2, H / 2 - 90, 18, "#aaa");
  drawText("W / S or  ↑ / ↓  to move    SPACE to pause", W / 2, H / 2 - 60, 14, "#888");
  drawDifficultySelector(W / 2, H / 2 + 5);
  drawText("Press SPACE to start", W / 2, H / 2 + 110, 22);
}

function drawPlayField() {
  // Center net.
  ctx.fillStyle = "#333";
  for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 1, y, 2, 12);

  // Score with per-side pulse.
  drawScore(player.score, W / 4,       64, playerScorePulse);
  drawScore(ai.score,     (W * 3) / 4, 64, aiScorePulse);

  // Paddles.
  drawPaddle(PADDLE_PAD, player.y, player.flashTimer);
  drawPaddle(W - PADDLE_PAD - PADDLE_W, ai.y, ai.flashTimer);

  // Trail behind the ball — older = more transparent.
  drawBallTrail();

  // Ball with squash.
  drawBall();
}

function drawPaddle(x, y, flashTimer) {
  // Base paddle.
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, PADDLE_W, PADDLE_H);
  // Flash bloom: an oversized translucent rectangle so the paddle
  // visually swells outward briefly. Alpha eases from peak → 0.
  if (flashTimer > 0) {
    const t = Math.max(0, flashTimer / PADDLE_FLASH_DURATION);
    const grow = 6 * t;
    ctx.fillStyle = `rgba(255,255,255,${0.55 * t})`;
    ctx.fillRect(x - grow, y - grow, PADDLE_W + grow * 2, PADDLE_H + grow * 2);
  }
}

function drawBallTrail() {
  // At least 2 samples so we don't draw a ghost on top of a stationary ball.
  if (trail.length < 2) return;
  // Skip the last entry (it's the ball's current position).
  for (let i = 0; i < trail.length - 1; i++) {
    const p = trail[i];
    // Older = fainter; cap brightest ghost below the ball itself so the
    // ball still reads as "the thing".
    const a = ((i + 1) / trail.length) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(p.x - BALL_SIZE / 2, p.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
  }
}

function drawBall() {
  ctx.fillStyle = "#fff";
  if (ball.squashTimer > 0) {
    // Compress along x (impact axis), slight stretch on y to preserve
    // sense of mass. Scale eases from peak → 1.
    const t = Math.max(0, ball.squashTimer / BALL_SQUASH_DURATION);
    const sx = 1 - BALL_SQUASH_AMOUNT * t;
    const sy = 1 + (BALL_SQUASH_AMOUNT * 0.4) * t;
    const w = BALL_SIZE * sx;
    const h = BALL_SIZE * sy;
    ctx.fillRect(ball.x - w / 2, ball.y - h / 2, w, h);
  } else {
    ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
  }
}

function drawScore(score, x, y, pulseTimer) {
  // Pulse: scale from peak → 1 across SCORE_PULSE_DURATION using a soft
  // ease-out (1 - (1-t)²) so the digit pops on the leading edge.
  let scale = 1;
  if (pulseTimer > 0) {
    const t = pulseTimer / SCORE_PULSE_DURATION;
    const ease = 1 - (1 - t) * (1 - t);
    scale = 1 + (SCORE_PULSE_SCALE - 1) * ease;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawText(score.toString(), 0, 0, 56, "#666", "monospace");
  ctx.restore();
}

function drawDimOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(-shakeX, -shakeY, W, H);
}

// Three labels in a row, current selection highlighted.
function drawDifficultySelector(centerX, y) {
  drawText("DIFFICULTY", centerX, y - 22, 13, "#888");
  const labels = DIFFICULTY_ORDER.map((k) => DIFFICULTIES[k].label);
  const spacing = 110;
  const totalWidth = spacing * (labels.length - 1);
  const startX = centerX - totalWidth / 2;
  for (let i = 0; i < labels.length; i++) {
    const x = startX + spacing * i;
    const selected = i === difficultyIndex;
    drawText(labels[i], x, y + 10, 22, selected ? "#fff" : "#555");
  }
  drawText("←  →  to change", centerX, y + 42, 12, "#666");
}

function drawText(text, x, y, size, color = "#fff", family = "system-ui, sans-serif") {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Project the ball's y when its x reaches `targetX`, accounting for any
// number of top/bottom wall bounces. Trick: in an "unfolded" world the
// ball goes straight, so compute the straight-line landing y, then fold
// back into [r, H-r] with a triangle wave.
function predictBallY(targetX) {
  if (ball.vx === 0) return ball.y;
  const t = (targetX - ball.x) / (ball.vx * ball.speed);
  if (t < 0) return H / 2;
  const yProj = ball.y + ball.vy * ball.speed * t;
  const r = BALL_SIZE / 2;
  const usableH = H - BALL_SIZE;
  const period = 2 * usableH;
  let y = yProj - r;
  y = ((y % period) + period) % period;
  if (y > usableH) y = period - y;
  return y + r;
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
