import { CONFIG } from "./config";
import { FRUIT_KINDS, type FruitKind } from "./sprites";

export type Cell = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";
export type Fruit = { cell: Cell; kind: FruitKind };

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// snake[0] es la cabeza; mira a la derecha.
export function initialSnake(): Cell[] {
  const { x, y, length } = CONFIG.START;
  return Array.from({ length }, (_, i) => ({ x: x - i, y }));
}

export function level(eaten: number): number {
  return 1 + Math.floor(eaten / CONFIG.FRUITS_PER_LEVEL);
}

export function tickMs(lvl: number): number {
  const { initial, step, min } = CONFIG.TICK_MS;
  return Math.max(min, initial - step * (lvl - 1));
}

export function isOpposite(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b;
}

export function nextHead(head: Cell, dir: Dir): Cell {
  return { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };
}

// Devuelve la serpiente tras un tick: nueva cabeza y, sin `grow`, sin la cola.
export function step(snake: Cell[], dir: Dir, grow: boolean): Cell[] {
  const next = [nextHead(snake[0], dir), ...snake];
  if (!grow) next.pop();
  return next;
}

export function hitsWall(cell: Cell): boolean {
  return (
    cell.x < 0 || cell.y < 0 || cell.x >= CONFIG.COLS || cell.y >= CONFIG.ROWS
  );
}

// `body` es el conjunto de segmentos contra los que se compara; quien llama
// excluye la cola cuando esta se libera en el mismo tick.
export function hitsBody(body: Cell[], cell: Cell): boolean {
  return body.some((s) => s.x === cell.x && s.y === cell.y);
}

// Celda libre al azar y fruta distinta de `prev`. null si el tablero está lleno.
export function spawnFruit(
  snake: Cell[],
  prev?: FruitKind,
  rng: () => number = Math.random,
): Fruit | null {
  const free: Cell[] = [];
  for (let y = 0; y < CONFIG.ROWS; y++) {
    for (let x = 0; x < CONFIG.COLS; x++) {
      if (!hitsBody(snake, { x, y })) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  const kinds = FRUIT_KINDS.filter((k) => k !== prev);
  return {
    cell: free[Math.floor(rng() * free.length)],
    kind: kinds[Math.floor(rng() * kinds.length)],
  };
}
