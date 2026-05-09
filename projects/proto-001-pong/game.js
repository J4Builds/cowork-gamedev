// =============================================================
// proto-001-pong — micro pass: difficulty + pause.
//
// Title -> playing -> paused -> gameOver -> playing, with three
// difficulty presets selectable in any non-playing screen, an
// AI that runs a partial trajectory prediction, and Space as
// the universal "advance / pause / resume" key.
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
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ---------- State ----------
// "title" | "playing" | "paused" | "gameOver"
let phase = "title";

const player = { y: H / 2 - PADDLE_H / 2, score: 0 };
const ai     = { y: H / 2 - PADDLE_H / 2, score: 0 };
const ball   = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BALL_SPEED_START };
let serveDelay = 0;
let winner = null; // "player" | "ai"

let aiTargetY = H / 2;
let aiReactTimer = 0;

function serveBall(direction) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = BALL_SPEED_START;
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
  winner = null;
  serveBall(Math.random() < 0.5 ? -1 : 1);
  phase = "playing";
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
      // position that's too far from the actual landing y.
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

    if (ball.y - BALL_SIZE / 2 < 0) {
      ball.y = BALL_SIZE / 2;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y + BALL_SIZE / 2 > H) {
      ball.y = H - BALL_SIZE / 2;
      ball.vy = -Math.abs(ball.vy);
    }

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
    }

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
    }

    if (ball.x < -BALL_SIZE) {
      ai.score += 1;
      if (ai.score >= WIN_SCORE) endMatch("ai");
      else serveBall(+1);
    } else if (ball.x > W + BALL_SIZE) {
      player.score += 1;
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
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

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
}

function drawTitleScreen() {
  drawText("PONG", W / 2, H / 2 - 150, 64);
  drawText("First to 7 wins", W / 2, H / 2 - 90, 18, "#aaa");
  drawText("W / S or  ↑ / ↓  to move    SPACE to pause", W / 2, H / 2 - 60, 14, "#888");
  drawDifficultySelector(W / 2, H / 2 + 5);
  drawText("Press SPACE to start", W / 2, H / 2 + 110, 22);
}

function drawPlayField() {
  ctx.fillStyle = "#333";
  for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 1, y, 2, 12);
  drawText(player.score.toString(), W / 4,       64, 56, "#666", "monospace");
  drawText(ai.score.toString(),     (W * 3) / 4, 64, 56, "#666", "monospace");
  ctx.fillStyle = "#fff";
  ctx.fillRect(PADDLE_PAD, player.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(W - PADDLE_PAD - PADDLE_W, ai.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
}

function drawDimOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, W, H);
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
