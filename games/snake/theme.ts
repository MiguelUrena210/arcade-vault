import { CONFIG } from "./config";
import type { Cell, Dir, Fruit } from "./entities";
import { FRUITS } from "./sprites";

export type SnakeTheme = "neon" | "classic" | "amber";

export type Palette = {
  bg: string;
  bgAlt: string; // segundo color del damero o color de línea de la grilla
  board: "grid" | "checker";
  segment: "rect" | "round" | "block"; // block = celdas separadas, sin conectores
  snake: string;
  head: string;
  eye: string;
  fruit: string; // fallback mientras no carga fruits.png
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};

export const PALETTES: Record<SnakeTheme, Palette> = {
  neon: {
    bg: "#05050f",
    bgAlt: "rgba(0,255,136,0.10)",
    board: "grid",
    segment: "rect",
    snake: "#00ff88",
    head: "#d4ffea",
    eye: "#05050f",
    fruit: "#ff006e",
    glow: 10,
    text: "#00ff88",
  },
  classic: {
    bg: "#aad751",
    bgAlt: "#a2d149",
    board: "checker",
    segment: "round",
    snake: "#2f56c4",
    head: "#2445a8",
    eye: "#fff",
    fruit: "#c2185b",
    glow: 0,
    text: "#1f3b0a",
  },
  amber: {
    bg: "#140c00",
    bgAlt: "rgba(255, 176, 0, 0.08)",
    board: "grid",
    segment: "block",
    snake: "#ffb000",
    head: "#ffd27a",
    eye: "#140c00",
    fruit: "#ff5a1f",
    glow: 4,
    text: "#ffb000",
  },
};

const { CELL, COLS, ROWS, FRUIT_SIZE } = CONFIG;
const INSET = 3; // margen del segmento dentro de la celda
const BLOCK_INSET = 5; // margen de cada celda en segmento "block"
const FORWARD: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function drawBoard(ctx: CanvasRenderingContext2D, p: Palette) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  if (p.board === "checker") {
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
// cargado: círculo con el color de fruta de la paleta.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: Fruit,
  sheet: HTMLImageElement | null,
  p: Palette,
) {
  const cx = fruit.cell.x * CELL + CELL / 2;
  const cy = fruit.cell.y * CELL + CELL / 2;
  if (!sheet) {
    ctx.fillStyle = p.fruit;
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

function segment(ctx: CanvasRenderingContext2D, p: Palette, a: Cell, b?: Cell) {
  if (p.segment === "block") {
    if (b) return; // sin conectores entre celdas
    const size = CELL - BLOCK_INSET * 2;
    ctx.fillRect(
      a.x * CELL + BLOCK_INSET,
      a.y * CELL + BLOCK_INSET,
      size,
      size,
    );
    return;
  }
  const x = Math.min(a.x, b?.x ?? a.x) * CELL + INSET;
  const y = Math.min(a.y, b?.y ?? a.y) * CELL + INSET;
  const w = (Math.abs(a.x - (b?.x ?? a.x)) + 1) * CELL - INSET * 2;
  const h = (Math.abs(a.y - (b?.y ?? a.y)) + 1) * CELL - INSET * 2;
  ctx.beginPath();
  if (p.segment === "round") ctx.roundRect(x, y, w, h, 10);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  snake: Cell[],
  dir: Dir,
) {
  ctx.fillStyle = p.snake;
  ctx.shadowColor = p.snake;
  ctx.shadowBlur = p.glow;
  for (let i = snake.length - 1; i >= 0; i--) {
    segment(ctx, p, snake[i]);
    if (i > 0) segment(ctx, p, snake[i], snake[i - 1]);
  }
  ctx.shadowBlur = 0;

  const head = snake[0];
  ctx.fillStyle = p.head;
  segment(ctx, p, head);

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
