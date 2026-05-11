// =============================================================
// proto-002-breakout — macro pass.
//
// Faithful 1976 Breakout: paddle, ball, 8×14 brick wall, three-stage
// speed ramp, lives-based game over, paddle-position-based ball angle.
//
// No juice this session — that's the next pass (impact, audio, etc.).
// Brick state PERSISTS across lost balls; that's the difficulty curve.
//
// All tunable numbers live in the constants block below. Tweak there,
// not in the physics or rendering code.
// =============================================================

// ---------- Canvas ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- Constants ----------
// Paddle (horizontal, fixed y near the bottom).
const PADDLE_W      = 90;
const PADDLE_H      = 12;
const PADDLE_Y      = 540;
const PADDLE_SPEED  = 520;

// Ball.
const BALL_SIZE         = 10;
const MAX_BOUNCE_ANGLE  = Math.PI / 3; // 60° max deflection off paddle center

// Brick wall geometry.
const COLS       = 14;
const ROWS       = 8;
const BRICK_W    = 52;
const BRICK_H    = 20;
const BRICK_GAP  = 2;
const WALL_LEFT  = 23;
const WALL_TOP   = 80;

// Row palette and points (top → bottom). Atari original.
const ROW_COLORS = ["#dc2626","#dc2626","#ea580c","#ea580c","#16a34a","#16a34a","#eab308","#eab308"];
const ROW_POINTS = [        7,        7,        5,        5,        3,        3,        1,        1];

// Three-stage speed ramp. SPEED_LEVELS[level] is the ball's px/sec.
// Bumps at: 4th brick hit, 12th brick hit, first red-row hit.
// Whichever trigger fires first promotes the speed level (latched).
const SPEED_LEVELS    = [280, 360, 460, 580];
const RAMP_HIT_4      = 4;
const RAMP_HIT_12     = 12;
const TOP_ROW_INDEX   = 1; // rows 0..1 are the red rows

// Lives + serve.
const LIVES_START  = 3;
const SERVE_DELAY  = 0.6; // seconds the ball waits before launching

// ---------- Input ----------
// keys: held this frame. justPressed: pressed this frame only (edge).
const keys = new Set();
const justPressed = new Set();
window.addEventListener("keydown", (e) => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ---------- State ----------
// "title" | "playing" | "gameOver" | "won"
let phase = "title";

const paddle = { x: W / 2 - PADDLE_W / 2 };
const ball   = { x: 0, y: 0, vx: 0, vy: 0, speed: SPEED_LEVELS[0] };

let bricks         = [];   // { x, y, row, alive, color, points }
let lives          = LIVES_START;
let score          = 0;
let hits           = 0;    // brick hits on current ball (resets per life)
let speedLevel     = 0;
let topRowReached  = false; // resets per life
let serveTimer     = 0;     // counts down before ball launches

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
  // Serve from above the paddle, launching upward. Player has time to
  // pre-position before the ball returns. Slight random horizontal kick
  // so consecutive serves don't trace identical paths.
  ball.x = W / 2;
  ball.y = PADDLE_Y - 40;
  const angle = (Math.random() - 0.5) * (Math.PI / 3); // ±30° off vertical
  ball.vx = Math.sin(angle);
  ball.vy = -Math.cos(angle); // negative = up
  // A new life resets the speed ramp and the hit counter so the player
  // gets a fresh "slow start" each time they lose a ball.
  speedLevel    = 0;
  ball.speed    = SPEED_LEVELS[0];
  hits          = 0;
  topRowReached = false;
  serveTimer    = SERVE_DELAY;
}

function startGame() {
  buildWall();
  lives    = LIVES_START;
  score    = 0;
  paddle.x = W / 2 - PADDLE_W / 2;
  resetBall();
  phase    = "playing";
}

// ---------- Update ----------
function update(dt) {
  // SPACE: universal start / restart from any terminal phase.
  if (justPressed.has(" ")) {
    if (phase === "title" || phase === "gameOver" || phase === "won") {
      startGame();
    }
  }

  if (phase !== "playing") return;

  // --- Paddle ---
  let dir = 0;
  if (keys.has("ArrowLeft"))  dir -= 1;
  if (keys.has("ArrowRight")) dir += 1;
  paddle.x += dir * PADDLE_SPEED * dt;
  paddle.x = clamp(paddle.x, 0, W - PADDLE_W);

  // --- Ball (held still during serve delay; paddle still movable) ---
  if (serveTimer > 0) {
    serveTimer -= dt;
    return;
  }

  ball.x += ball.vx * ball.speed * dt;
  ball.y += ball.vy * ball.speed * dt;

  // Wall bounces: left, right, top.
  if (ball.x - BALL_SIZE / 2 < 0) {
    ball.x = BALL_SIZE / 2;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + BALL_SIZE / 2 > W) {
    ball.x = W - BALL_SIZE / 2;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y - BALL_SIZE / 2 < 0) {
    ball.y = BALL_SIZE / 2;
    ball.vy = Math.abs(ball.vy);
  }

  // Paddle collision: only when the ball is descending into the paddle.
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

  // Ball lost off the bottom.
  if (ball.y - BALL_SIZE / 2 > H) {
    lives -= 1;
    if (lives <= 0) phase = "gameOver";
    else            resetBall();
  }

  // Win check.
  if (bricks.every(b => !b.alive)) {
    phase = "won";
  }
}

function bouncePaddle() {
  // Snap above the paddle so we don't get stuck inside its volume.
  ball.y = PADDLE_Y - BALL_SIZE / 2;
  // Paddle-position-based steering: where the ball hit on the paddle
  // determines the outgoing angle. Hit on the LEFT edge → ball goes up-left.
  // Center → straight up. RIGHT edge → up-right. The offset is the ball's
  // horizontal distance from paddle center, normalized to [-1, +1] across
  // the paddle's half-width. That offset times MAX_BOUNCE_ANGLE is the
  // outgoing angle, measured off "straight up". Same trick as Pong — the
  // mechanic the player is actually practicing is this paddle aim.
  const center = paddle.x + PADDLE_W / 2;
  const offset = clamp((ball.x - center) / (PADDLE_W / 2), -1, 1);
  const angle  = offset * MAX_BOUNCE_ANGLE;
  ball.vx = Math.sin(angle);
  ball.vy = -Math.cos(angle); // post-paddle, ball always heads up
}

// AABB ball-vs-bricks with side detection via minimum penetration depth.
//
// For each live brick, test for axis-aligned bounding-box overlap. On
// overlap, compute how deep the ball has penetrated the brick on the X
// axis and on the Y axis. The axis with the SMALLER overlap is the one
// the ball entered through (it hadn't crossed as far on that side), so:
//   - flip the velocity along that axis (so it bounces back)
//   - push the ball back out by exactly that overlap distance
// Then mark the brick dead, score it, and break — handling one brick per
// frame avoids spurious double-hits on neighbors we just rebounded from.
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

    if (overlapX < overlapY) {
      // Entered through left or right face.
      if (ball.vx > 0) ball.x -= overlapX;
      else             ball.x += overlapX;
      ball.vx = -ball.vx;
    } else {
      // Entered through top or bottom face.
      if (ball.vy > 0) ball.y -= overlapY;
      else             ball.y += overlapY;
      ball.vy = -ball.vy;
    }

    // Score + destroy.
    b.alive = false;
    score  += b.points;
    hits   += 1;

    // Speed-ramp triggers (latch — Math.max prevents going backward).
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

    break;
  }
}

// ---------- Render ----------
function render() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  if (phase === "title") {
    drawTitle();
    return;
  }

  drawHUD();
  drawBricks();
  drawPaddle();
  drawBall();

  if (phase === "gameOver") {
    drawDimOverlay();
    drawText("GAME OVER",                 W / 2, H / 2 - 40, 56);
    drawText(`Score: ${score}`,           W / 2, H / 2 + 10, 22, "#aaa");
    drawText("Press SPACE to play again", W / 2, H / 2 + 50, 18, "#888");
  } else if (phase === "won") {
    drawDimOverlay();
    drawText("YOU WIN",                   W / 2, H / 2 - 40, 56);
    drawText(`Score: ${score}`,           W / 2, H / 2 + 10, 22, "#aaa");
    drawText("Press SPACE to play again", W / 2, H / 2 + 50, 18, "#888");
  }
}

function drawTitle() {
  drawText("BREAKOUT",                       W / 2, H / 2 - 100, 64);
  drawText("Clear the wall — 3 balls",       W / 2, H / 2 - 40,  18, "#aaa");
  drawText("← / →  to move    SPACE to start", W / 2, H / 2,       14, "#888");
  drawText("Press SPACE",                    W / 2, H / 2 + 60,  22);
}

function drawHUD() {
  drawText(`SCORE  ${score.toString().padStart(4, "0")}`, 24,     32, 18, "#aaa", "monospace", "left");
  drawText(`BALLS  ${lives}`,                              W - 24, 32, 18, "#aaa", "monospace", "right");
}

function drawBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
  }
}

function drawPaddle() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
}

function drawBall() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
}

function drawDimOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, W, H);
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
