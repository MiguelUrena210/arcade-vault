import type { EngineCallbacks, EngineHandle, EngineStats } from "../types";
import { CONFIG } from "./config";
import {
  hitsBody,
  hitsWall,
  initialSnake,
  isOpposite,
  level as levelOf,
  nextHead,
  spawnFruit,
  step,
  tickMs,
  type Cell,
  type Dir,
  type Fruit,
} from "./entities";
import { SPRITESHEET_URL } from "./sprites";
import {
  drawBoard,
  drawFruit,
  drawHint,
  drawSnake,
  PALETTES,
  type SnakeTheme,
} from "./theme";

export type { SnakeTheme } from "./theme";

const MAX_DT = 50; // ms

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const MAX_QUEUE = 2;

type Mode = "ready" | "playing" | "gameover";

const isTextTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

const themeOf = (id: string): SnakeTheme =>
  id === "classic" ? "classic" : "neon";

export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme: string = "neon",
): EngineHandle {
  const ctx = canvas.getContext("2d")!;
  let currentTheme = themeOf(theme);

  let mode: Mode = "ready";
  let snake: Cell[] = initialSnake();
  let dir: Dir = "right"; // última dirección aplicada
  let queue: Dir[] = [];
  let fruit: Fruit | null = null;
  let eaten = 0;
  let acc = 0; // ms hacia el siguiente tick
  let paused = false;
  let lastTime: number | null = null;
  let raf = 0;
  let last: EngineStats | null = null;

  // ── Atlas de frutas (ambos temas) ───────────────────────────────────────────
  let sheet: HTMLImageElement | null = null;
  const img = new Image();
  img.onload = () => {
    sheet = img;
  };
  img.src = SPRITESHEET_URL;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const emitStats = () => {
    const score = eaten * CONFIG.POINTS_PER_FRUIT;
    const level = levelOf(eaten);
    if (last && last.score === score && last.level === level) return;
    last = { score, lives: 1, level };
    callbacks.onStats(last);
  };

  const gameOver = () => {
    mode = "gameover";
    callbacks.onGameOver(eaten * CONFIG.POINTS_PER_FRUIT);
  };

  const initGame = () => {
    snake = initialSnake();
    dir = "right";
    queue = [];
    eaten = 0;
    acc = 0;
    fruit = spawnFruit(snake);
    mode = "ready";
    paused = false;
    lastTime = null;
    last = null; // el HUD siempre recibe el estado inicial tras reiniciar
    emitStats();
  };

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || mode === "gameover" || e.repeat) return;
    const turn = KEY_DIR[e.code];
    if (mode === "ready") {
      if (e.code === "Space") mode = "playing";
      else if (turn && !isOpposite(turn, dir)) {
        dir = turn;
        mode = "playing";
      }
      return;
    }
    if (!turn || queue.length >= MAX_QUEUE) return;
    const prev = queue[queue.length - 1] ?? dir;
    if (turn !== prev && !isOpposite(turn, prev)) queue.push(turn);
  };
  window.addEventListener("keydown", onKeyDown);

  // ── Update ──────────────────────────────────────────────────────────────────
  const tick = () => {
    const next = queue.shift();
    if (next) dir = next;
    const head = nextHead(snake[0], dir);
    if (hitsWall(head)) return gameOver();
    const ate = !!fruit && fruit.cell.x === head.x && fruit.cell.y === head.y;
    // La cola se libera en este mismo tick salvo que la serpiente crezca.
    if (hitsBody(ate ? snake : snake.slice(0, -1), head)) return gameOver();
    snake = step(snake, dir, ate);
    if (!ate) return;
    eaten++;
    fruit = spawnFruit(snake, fruit?.kind);
    emitStats();
    if (!fruit) gameOver(); // tablero lleno
  };

  const update = (dt: number) => {
    if (mode !== "playing") return;
    acc += dt;
    while (mode === "playing" && acc >= tickMs(levelOf(eaten))) {
      acc -= tickMs(levelOf(eaten));
      tick();
    }
  };

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = () => {
    const pal = PALETTES[currentTheme];
    drawBoard(ctx, currentTheme, pal);
    if (fruit) drawFruit(ctx, fruit, sheet);
    drawSnake(ctx, currentTheme, pal, snake, dir);
    if (mode === "ready") drawHint(ctx, pal, "PULSA UNA FLECHA");
  };

  // ── Loop ────────────────────────────────────────────────────────────────────
  const loop = (ts: number) => {
    raf = requestAnimationFrame(loop);
    if (!paused && mode !== "gameover") {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
      lastTime = ts;
      update(dt);
    }
    draw();
  };

  initGame();
  raf = requestAnimationFrame(loop);

  return {
    pause() {
      paused = true;
    },
    resume() {
      if (!paused) return;
      paused = false;
      lastTime = null;
      queue = [];
    },
    restart() {
      initGame();
    },
    setTheme(id) {
      currentTheme = themeOf(id);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      img.onload = null;
    },
  };
}
