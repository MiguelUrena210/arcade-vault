import { CONFIG } from "./config";
import type { Cell, Dir, Fruit } from "./entities";
import { FRUITS } from "./sprites";

export type SnakeTheme = "neon" | "classic";

export type Palette = {
  bg: string;
  bgAlt: string; // segundo color del damero (CLÁSICO) o color de línea (NEÓN)
  snake: string;
  head: string;
  eye: string;
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};

export const PALETTES: Record<SnakeTheme, Palette> = {
  neon: {
    bg: "#05050f",
    bgAlt: "rgba(0,255,136,0.10)",
    snake: "#00ff88",
    head: "#d4ffea",
    eye: "#05050f",
    glow: 10,
    text: "#00ff88",
  },
  classic: {
    bg: "#aad751",
    bgAlt: "#a2d149",
    snake: "#4a75e8",
    head: "#3d63c9",
    eye: "#fff",
    glow: 0,
    text: "#1f3b0a",
  },
};

const { CELL, COLS, ROWS, FRUIT_SIZE } = CONFIG;
const INSET = 3; // margen del segmento dentro de la celda
const FORWARD: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  theme: SnakeTheme,
  p: Palette,
) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  if (theme === "classic") {
    ctx.fillStyle = p.bgAlt;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 1) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    return;
  }
  ctx.strokeStyle = p.bgAlt;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, CONFIG.HEIGHT);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(CONFIG.WIDTH, y * CELL + 0.5);
  }
  ctx.stroke();
}

// Fruta del atlas (lado mayor = FRUIT_SIZE, centrada en la celda). Sin atlas
// cargado: círculo magenta.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: Fruit,
  sheet: HTMLImageElement | null,
) {
  const cx = fruit.cell.x * CELL + CELL / 2;
  const cy = fruit.cell.y * CELL + CELL / 2;
  if (!sheet) {
    ctx.fillStyle = "#ff006e";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const s = FRUITS[fruit.kind];
  const scale = FRUIT_SIZE / Math.max(s.w, s.h);
  const w = s.w * scale;
  const h = s.h * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, s.x, s.y, s.w, s.h, cx - w / 2, cy - h / 2, w, h);
}

function segment(
  ctx: CanvasRenderingContext2D,
  theme: SnakeTheme,
  a: Cell,
  b?: Cell,
) {
  const x = Math.min(a.x, b?.x ?? a.x) * CELL + INSET;
  const y = Math.min(a.y, b?.y ?? a.y) * CELL + INSET;
  const w = (Math.abs(a.x - (b?.x ?? a.x)) + 1) * CELL - INSET * 2;
  const h = (Math.abs(a.y - (b?.y ?? a.y)) + 1) * CELL - INSET * 2;
  ctx.beginPath();
  if (theme === "classic") ctx.roundRect(x, y, w, h, 10);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  theme: SnakeTheme,
  p: Palette,
  snake: Cell[],
  dir: Dir,
) {
  ctx.fillStyle = p.snake;
  ctx.shadowColor = p.snake;
  ctx.shadowBlur = p.glow;
  for (let i = snake.length - 1; i >= 0; i--) {
    segment(ctx, theme, snake[i]);
    if (i > 0) segment(ctx, theme, snake[i], snake[i - 1]);
  }
  ctx.shadowBlur = 0;

  const head = snake[0];
  ctx.fillStyle = p.head;
  segment(ctx, theme, head);

  const f = FORWARD[dir];
  const cx = head.x * CELL + CELL / 2 + f.x * 7;
  const cy = head.y * CELL + CELL / 2 + f.y * 7;
  ctx.fillStyle = p.eye;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx - f.y * 8 * side, cy + f.x * 8 * side, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHint(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  text: string,
) {
  ctx.fillStyle = p.text;
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 80);
}
