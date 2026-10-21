function createPaddle() {
  const { w, h, y } = CONFIG.PADDLE;
  return { x: (CONFIG.WIDTH - w) / 2, y, w, h };
}

function updatePaddle(paddle, dt) {
  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA) dir -= 1;
  if (keys.ArrowRight || keys.KeyD) dir += 1;
  paddle.x += dir * CONFIG.PADDLE.speed * dt;
  paddle.x = Math.max(0, Math.min(CONFIG.WIDTH - paddle.w, paddle.x));
}

function drawPaddle(ctx, paddle) {
  drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h);
}

function createBall() {
  return { x: 0, y: 0, vx: 0, vy: 0, size: CONFIG.BALL.size };
}

// Coloca la bola centrada sobre la pala y detenida.
function attachBall(ball, paddle) {
  ball.x = paddle.x + (paddle.w - ball.size) / 2;
  ball.y = paddle.y - ball.size;
  ball.vx = 0;
  ball.vy = 0;
}

// Rapidez de la bola en px/s para un nivel (0-based): +speedStep por nivel.
function ballSpeed(level) {
  return CONFIG.BALL.speed * (1 + CONFIG.BALL.speedStep * level);
}

function launchBall(ball, speed) {
  const angle = (20 * Math.PI) / 180; // desde la vertical, hacia la derecha
  ball.vx = speed * Math.sin(angle);
  ball.vy = -speed * Math.cos(angle);
}

// Mueve la bola y rebota en paredes laterales y techo. Devuelve true si rebotó.
function updateBall(ball, dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  let bounced = false;
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    bounced = true;
  } else if (ball.x + ball.size > CONFIG.WIDTH) {
    ball.x = CONFIG.WIDTH - ball.size;
    ball.vx = -Math.abs(ball.vx);
    bounced = true;
  }
  if (ball.y < CONFIG.HUD_HEIGHT) {
    ball.y = CONFIG.HUD_HEIGHT;
    ball.vy = Math.abs(ball.vy);
    bounced = true;
  }
  return bounced;
}

// Rebote en la pala: el ángulo depende del punto de impacto (centro = vertical,
// extremos = maxAngle) y la rapidez se mantiene constante. Devuelve true si rebotó.
function collideBallPaddle(ball, paddle, speed) {
  const overlaps =
    ball.vy > 0 &&
    ball.x + ball.size > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.size > paddle.y &&
    ball.y < paddle.y + paddle.h;
  if (!overlaps) return false;

  const ballCenter = ball.x + ball.size / 2;
  const paddleCenter = paddle.x + paddle.w / 2;
  const offset = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (paddle.w / 2)));
  const angle = (offset * CONFIG.BALL.maxAngle * Math.PI) / 180;

  ball.vx = speed * Math.sin(angle);
  ball.vy = -speed * Math.cos(angle);
  ball.y = paddle.y - ball.size;
  return true;
}

// Carácter del mapa -> { color, hp }. Cualquier otro carácter es un hueco.
const BRICK_CHARS = {
  r: { color: 'red', hp: 1 },
  c: { color: 'cyan', hp: 1 },
  g: { color: 'green', hp: 1 },
  m: { color: 'magenta', hp: 1 },
  y: { color: 'yellow', hp: 1 },
  h: { color: 'hotpink', hp: 1 },
  2: { color: 'gray', hp: 2 },
  3: { color: 'gray', hp: 3 },
};

// Construye los bloques desde el mapa de LEVELS[level].
function createBricks(level) {
  const { cols, maxRows, w, h, gap, offsetX, offsetY } = CONFIG.BRICKS;
  const bricks = [];
  LEVELS[level].map.slice(0, maxRows).forEach((row, r) => {
    for (let c = 0; c < Math.min(row.length, cols); c++) {
      const kind = BRICK_CHARS[row[c]];
      if (!kind) continue;
      bricks.push({
        x: offsetX + c * (w + gap),
        y: offsetY + r * (h + gap),
        w,
        h,
        color: kind.color,
        alive: true,
        hp: kind.hp,
        maxHp: kind.hp,
      });
    }
  });
  return bricks;
}

// Tono y grietas del gray según hp restante, encima del sprite.
function drawGrayDamage(ctx, b) {
  const look = CONFIG.GRAY_LOOK[b.hp];
  if (!look) return;
  if (look.tint) {
    ctx.fillStyle = look.tint;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  ctx.strokeStyle = CONFIG.CRACKS.color;
  ctx.lineWidth = CONFIG.CRACKS.width;
  for (const line of CONFIG.CRACKS.lines.slice(0, look.cracks)) {
    ctx.beginPath();
    line.forEach(([fx, fy], i) => {
      const x = b.x + fx * b.w;
      const y = b.y + fy * b.h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function drawBricks(ctx, bricks) {
  for (const b of bricks) {
    if (!b.alive) continue;
    drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.w, b.h);
    if (b.color === 'gray') drawGrayDamage(ctx, b);
  }
}

// Rebota la bola en el primer bloque vivo que solape (por el eje de menor
// penetración), le resta 1 de hp (alive = false con hp 0) y lo devuelve.
// Devuelve null si no hay golpe.
function collideBallBricks(ball, bricks) {
  for (const b of bricks) {
    if (!b.alive) continue;
    const overlapX = Math.min(ball.x + ball.size - b.x, b.x + b.w - ball.x);
    const overlapY = Math.min(ball.y + ball.size - b.y, b.y + b.h - ball.y);
    if (overlapX <= 0 || overlapY <= 0) continue;

    if (overlapX < overlapY) {
      const fromLeft = ball.x + ball.size / 2 < b.x + b.w / 2;
      ball.x += fromLeft ? -overlapX : overlapX;
      ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
    } else {
      const fromTop = ball.y + ball.size / 2 < b.y + b.h / 2;
      ball.y += fromTop ? -overlapY : overlapY;
      ball.vy = fromTop ? -Math.abs(ball.vy) : Math.abs(ball.vy);
    }
    b.hp--;
    if (b.hp <= 0) b.alive = false;
    return b;
  }
  return null;
}

function drawBall(ctx, ball) {
  drawSprite(ctx, 'ball', ball.x, ball.y, ball.size, ball.size);
}
