// =============================================================
// proto-001-pong — macro pass.
//
// Goal of macro: every system in the game works end-to-end.
// Title -> playing -> game over -> restart, with paddles, AI,
// ball physics, scoring, and a win condition. Tuning lives in
// the micro pass after we've played it.
// =============================================================

// ---------- Canvas ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- Tunables (will revisit in micro pass) ----------
const PADDLE_W = 12;
const PADDLE_H = 90;
const PADDLE_PAD = 24;          // distance from canvas edge to paddle face
const PLAYER_SPEED = 420;       // px/sec
const AI_SPEED = 260;           // px/sec — capped lower than player so AI is beatable.
const AI_DEADBAND = 8;          // px of slop around target before AI moves (prevents jitter)
const AI_REACTION_TIME = 0.15;  // sec between AI re-targets — feels like thinking time
const AI_AIM_ERROR = 25;        // px ± random offset added to target each retarget
const BALL_SIZE = 12;           // square ball, side length
const BALL_SPEED_START = 420;   // px/sec
const BALL_SPEED_INC = 30;      // added per paddle hit
const BALL_SPEED_MAX = 720;     // hard cap so the ball doesn't tunnel through paddles
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° — Pong's signature: hit near paddle edge for steep angles
const SERVE_DELAY = 0.5;        // seconds the ball pauses at center after a score
const WIN_SCORE = 7;

// ---------- Input ----------
// `keys` = currently held. `justPressed` = pressed this frame (edge-triggered,
// useful for "Space to start" so holding it doesn't repeatedly fire).
const keys = new Set();
const justPressed = new Set();
window.addEventListener("keydown", (e) => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  // Stop space/arrows from scrolling the page.
  if ([" ", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ---------- State ----------
// Simple state machine. Each phase has its own update behavior.
// "title"    — splash, waiting for Space
// "playing"  — full simulation
// "gameOver" — frozen scene + winner banner, waiting for Space
let phase = "title";

const player = { y: H / 2 - PADDLE_H / 2, score: 0 };
const ai     = { y: H / 2 - PADDLE_H / 2, score: 0 };

// Ball uses a unit-vector direction (vx, vy) plus a scalar speed. That way
// changing speed doesn't break the angle, and changing the angle (on paddle
// hit) doesn't break the speed.
const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BALL_SPEED_START };
let serveDelay = 0;
let winner = null; // "player" | "ai"

// AI brain state. The AI doesn't follow the ball directly anymore — it
// projects where the ball will arrive at its x-line (with wall bounces)
// and moves toward that target. Every AI_REACTION_TIME seconds it picks a
// new target, which gives sharp/fast shots a chance to slip through
// because the AI commits to a slightly stale aim point.
let aiTargetY = H / 2;
let aiReactTimer = 0;

function serveBall(direction) {
  // direction: -1 = toward player (left), +1 = toward AI (right)
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = BALL_SPEED_START;
  // Random initial angle within ±30° of horizontal so serves are varied
  // but never near-vertical.
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
  if (phase === "title" || phase === "gameOver") {
    if (justPressed.has(" ")) startMatch();
    return;
  }

  // --- Player paddle (W/S or arrows) ---
  let dir = 0;
  if (keys.has("w") || keys.has("W") || keys.has("ArrowUp"))   dir -= 1;
  if (keys.has("s") || keys.has("S") || keys.has("ArrowDown")) dir += 1;
  player.y += dir * PLAYER_SPEED * dt;
  player.y = clamp(player.y, 0, H - PADDLE_H);

  // --- AI paddle ---
  // Predictive AI. Every AI_REACTION_TIME seconds, recompute where to go:
  //   - Ball moving toward AI: predict the y where it will reach AI's x
  //     (accounting for wall bounces), plus a small aim wobble.
  //   - Ball moving away: drift back toward center.
  // The reaction delay means the AI commits to a target between updates,
  // so a sharp fast shot can land somewhere the AI didn't have time to
  // reach. That's the difficulty curve.
  aiReactTimer -= dt;
  if (aiReactTimer <= 0) {
    const aiLeft = W - PADDLE_PAD - PADDLE_W;
    if (ball.vx > 0) {
      const predicted = predictBallY(aiLeft);
      aiTargetY = predicted + (Math.random() - 0.5) * AI_AIM_ERROR * 2;
    } else {
      aiTargetY = H / 2;
    }
    aiReactTimer = AI_REACTION_TIME;
  }
  const aiCenter = ai.y + PADDLE_H / 2;
  if (aiCenter < aiTargetY - AI_DEADBAND) ai.y += AI_SPEED * dt;
  else if (aiCenter > aiTargetY + AI_DEADBAND) ai.y -= AI_SPEED * dt;
  ai.y = clamp(ai.y, 0, H - PADDLE_H);

  // --- Ball ---
  if (serveDelay > 0) {
    serveDelay -= dt;
  } else {
    ball.x += ball.vx * ball.speed * dt;
    ball.y += ball.vy * ball.speed * dt;

    // Top/bottom wall bounce — clamp + invert vy so the ball can't get stuck.
    if (ball.y - BALL_SIZE / 2 < 0) {
      ball.y = BALL_SIZE / 2;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y + BALL_SIZE / 2 > H) {
      ball.y = H - BALL_SIZE / 2;
      ball.vy = -Math.abs(ball.vy);
    }

    // Paddle collisions — AABB (axis-aligned bounding box) overlap check.
    // The `ball.vx < 0` / `> 0` guard prevents a re-collide when the ball
    // is already moving away from the paddle.
    const playerRight = PADDLE_PAD + PADDLE_W;
    if (
      ball.vx < 0 &&
      ball.x - BALL_SIZE / 2 < playerRight &&
      ball.x + BALL_SIZE / 2 > PADDLE_PAD &&
      ball.y + BALL_SIZE / 2 > player.y &&
      ball.y - BALL_SIZE / 2 < player.y + PADDLE_H
    ) {
      ball.x = playerRight + BALL_SIZE / 2; // nudge out so we don't double-trigger
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

    // Ball off left/right edge — score, then serve.
    if (ball.x < -BALL_SIZE) {
      ai.score += 1;
      if (ai.score >= WIN_SCORE) endMatch("ai");
      else serveBall(+1); // serve toward AI (whoever lost gets the disadvantage)
    } else if (ball.x > W + BALL_SIZE) {
      player.score += 1;
      if (player.score >= WIN_SCORE) endMatch("player");
      else serveBall(-1);
    }
  }
}

// On a paddle hit, the new ball angle depends on WHERE on the paddle it
// hit. Center = straight back. Edge = sharp angle. This is the single most
// important "feel" mechanic in Pong — without it, the game has no skill.
function bouncePaddle(paddleY, dirX) {
  const center = paddleY + PADDLE_H / 2;
  const offset = clamp((ball.y - center) / (PADDLE_H / 2), -1, 1); // -1..1
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
  // Clear
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  if (phase === "title") {
    drawText("PONG", W / 2, H / 2 - 80, 64);
    drawText("First to 7 wins", W / 2, H / 2, 20, "#aaa");
    drawText("W / S or  ↑ / ↓  to move", W / 2, H / 2 + 36, 16, "#aaa");
    drawText("Press SPACE to start", W / 2, H / 2 + 100, 22);
    return;
  }

  // Court midline (dashed)
  ctx.fillStyle = "#333";
  for (let y = 8; y < H; y += 24) {
    ctx.fillRect(W / 2 - 1, y, 2, 12);
  }

  // Scores
  drawText(player.score.toString(), W / 4, 64, 56, "#666", "monospace");
  drawText(ai.score.toString(),     (W * 3) / 4, 64, 56, "#666", "monospace");

  // Paddles
  ctx.fillStyle = "#fff";
  ctx.fillRect(PADDLE_PAD, player.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(W - PADDLE_PAD - PADDLE_W, ai.y, PADDLE_W, PADDLE_H);

  // Ball
  ctx.fillRect(
    ball.x - BALL_SIZE / 2,
    ball.y - BALL_SIZE / 2,
    BALL_SIZE,
    BALL_SIZE
  );

  if (phase === "gameOver") {
    // Dim everything underneath
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    const msg = winner === "player" ? "YOU WIN" : "AI WINS";
    drawText(msg, W / 2, H / 2 - 20, 56);
    drawText("Press SPACE to play again", W / 2, H / 2 + 40, 22, "#aaa");
  }
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

// Project the ball's y-coordinate when its x reaches `targetX`, accounting
// for any number of bounces off the top/bottom walls along the way.
//
// The trick: in an "unfolded" world where the ball never bounces, it'd
// travel in a straight line. We compute that straight-line landing y, then
// fold it back into the [r, H-r] range using a triangle wave. The result
// is exactly where a ball bouncing physically off the walls would arrive.
function predictBallY(targetX) {
  if (ball.vx === 0) return ball.y;
  const t = (targetX - ball.x) / (ball.vx * ball.speed);
  if (t < 0) return H / 2; // ball moving away from targetX
  const yProj = ball.y + ball.vy * ball.speed * t;

  const r = BALL_SIZE / 2;
  const usableH = H - BALL_SIZE; // ball's center can range r..H-r
  const period = 2 * usableH;
  let y = yProj - r;
  y = ((y % period) + period) % period; // positive remainder
  if (y > usableH) y = period - y;       // fold back into 0..usableH
  return y + r;
}

// ---------- Loop ----------
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  justPressed.clear(); // edge-triggered set is consumed each frame
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
