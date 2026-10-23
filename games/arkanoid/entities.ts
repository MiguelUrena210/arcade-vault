import { CONFIG } from "./config";
import { LEVELS, type BrickColor } from "./levels";

export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
};
export type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BrickColor;
  alive: boolean;
  hp: number;
  maxHp: number;
};

export function createPaddle(): Paddle {
  const { w, h, y } = CONFIG.PADDLE;
  return { x: (CONFIG.WIDTH - w) / 2, y, w, h };
}

// dir: -1 izquierda, 0 quieta, 1 derecha.
export function updatePaddle(paddle: Paddle, dir: number, dt: number) {
  paddle.x += dir * CONFIG.PADDLE.speed * dt;
  paddle.x = Math.max(0, Math.min(CONFIG.WIDTH - paddle.w, paddle.x));
}

export function createBall(): Ball {
  return { x: 0, y: 0, vx: 0, vy: 0, size: CONFIG.BALL.size };
}

// Coloca la bola centrada sobre la pala y detenida.
export function attachBall(ball: Ball, paddle: Paddle) {
  ball.x = paddle.x + (paddle.w - ball.size) / 2;
  ball.y = paddle.y - ball.size;
  ball.vx = 0;
  ball.vy = 0;
}

// Rapidez de la bola en px/s para un nivel (1-based): +speedStep por nivel
// hasta maxSpeedLevel.
export function ballSpeed(level: number): number {
  const steps = Math.min(level, CONFIG.BALL.maxSpeedLevel) - 1;
  return CONFIG.BALL.speed * (1 + CONFIG.BALL.speedStep * steps);
}

export function launchBall(ball: Ball, speed: number) {
  const angle = (CONFIG.BALL.launchAngle * Math.PI) / 180; // hacia la derecha
  ball.vx = speed * Math.sin(angle);
  ball.vy = -speed * Math.cos(angle);
}

// Mueve la bola y rebota en paredes laterales y techo. Devuelve true si rebotó.
export function updateBall(ball: Ball, dt: number): boolean {
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
export function collideBallPaddle(
  ball: Ball,
  paddle: Paddle,
  speed: number,
): boolean {
  const overlaps =
    ball.vy > 0 &&
    ball.x + ball.size > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.size > paddle.y &&
    ball.y < paddle.y + paddle.h;
  if (!overlaps) return false;

  const ballCenter = ball.x + ball.size / 2;
  const paddleCenter = paddle.x + paddle.w / 2;
  const offset = Math.max(
    -1,
    Math.min(1, (ballCenter - paddleCenter) / (paddle.w / 2)),
  );
  const angle = (offset * CONFIG.BALL.maxAngle * Math.PI) / 180;

  ball.vx = speed * Math.sin(angle);
  ball.vy = -speed * Math.cos(angle);
  ball.y = paddle.y - ball.size;
  return true;
}

// Carácter del mapa -> { color, hp }. Cualquier otro carácter es un hueco.
const BRICK_CHARS: Record<string, { color: BrickColor; hp: number }> = {
  r: { color: "red", hp: 1 },
  c: { color: "cyan", hp: 1 },
  g: { color: "green", hp: 1 },
  m: { color: "magenta", hp: 1 },
  y: { color: "yellow", hp: 1 },
  h: { color: "hotpink", hp: 1 },
  "2": { color: "gray", hp: 2 },
  "3": { color: "gray", hp: 3 },
};

// Construye los bloques del nivel (1-based, sin límite): los 5 mapas en ciclo.
export function createBricks(level: number): Brick[] {
  const { cols, maxRows, w, h, gap, offsetX, offsetY } = CONFIG.BRICKS;
  const bricks: Brick[] = [];
  LEVELS[(level - 1) % LEVELS.length].map
    .slice(0, maxRows)
    .forEach((row, r) => {
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

// Rebota la bola en el primer bloque vivo que solape (por el eje de menor
// penetración), le resta 1 de hp (alive = false con hp 0) y lo devuelve.
// Devuelve null si no hay golpe.
export function collideBallBricks(ball: Ball, bricks: Brick[]): Brick | null {
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
