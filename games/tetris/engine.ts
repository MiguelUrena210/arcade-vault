import type { EngineCallbacks, EngineHandle, EngineStats } from "../types";
import {
  BLOCK,
  COLS,
  LINE_SCORES,
  ROWS,
  clearLines,
  collide,
  createBoard,
  ghostY,
  merge,
  randomPiece,
  tryRotate,
  type Board,
  type Piece,
} from "./pieces";
import { SKINS, type Skin, type TetrisTheme } from "./theme";

export type { TetrisTheme } from "./theme";

const W = 800;
const H = 600;
const WELL_X = (W - COLS * BLOCK) / 2; // pozo centrado
const NEXT_X = 580;
const NEXT_Y = 30;
const NEXT_BLOCK = 30;
const NEXT_SIZE = 4 * NEXT_BLOCK;

const MAX_DT = 50; // ms

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const isTextTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

const intervalFor = (level: number) => Math.max(100, 1000 - (level - 1) * 90);

export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme: string = "neon",
): EngineHandle {
  const ctx = canvas.getContext("2d")!;
  const skinOf = (id: string): Skin => SKINS[id as TetrisTheme] ?? SKINS.neon;
  let skin: Skin = skinOf(theme);

  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = intervalFor(1);
  let dropAccum = 0;
  let gameOver = false;
  let paused = false;
  let lastTime: number | null = null;
  let raf = 0;
  let last: EngineStats | null = null;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const emitStats = () => {
    if (last && last.score === score && last.level === level) return;
    last = { score, lives: 1, level };
    callbacks.onStats(last);
  };

  const endGame = () => {
    gameOver = true;
    emitStats();
    callbacks.onGameOver(score);
  };

  const spawn = () => {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) endGame();
  };

  const lockPiece = () => {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = intervalFor(level);
    }
    spawn();
  };

  const softDrop = () => {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  };

  const hardDrop = () => {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  };

  const initGame = () => {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = intervalFor(level);
    dropAccum = 0;
    gameOver = false;
    paused = false;
    lastTime = null;
    next = randomPiece();
    spawn();
    last = null; // el HUD siempre recibe el estado inicial tras reiniciar
    emitStats();
  };

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
    }
    emitStats();
  };
  window.addEventListener("keydown", onKeyDown);

  // ── Draw ────────────────────────────────────────────────────────────────────
  const block = (
    c: number,
    r: number,
    type: number,
    size: number,
    ox: number,
    oy: number,
    alpha = 1,
  ) => {
    if (!type) return;
    skin.drawBlock(
      ctx,
      ox + c * size,
      oy + r * size,
      size,
      skin.colors[type],
      alpha,
    );
  };

  const drawGrid = () => {
    ctx.strokeStyle = skin.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(WELL_X + c * BLOCK, 0);
      ctx.lineTo(WELL_X + c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(WELL_X, r * BLOCK);
      ctx.lineTo(WELL_X + COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  };

  const drawNext = () => {
    ctx.strokeStyle = skin.grid;
    ctx.lineWidth = 2;
    ctx.strokeRect(NEXT_X - 1, NEXT_Y - 1, NEXT_SIZE + 2, NEXT_SIZE + 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "bottom";
    ctx.fillText("NEXT", NEXT_X, NEXT_Y - 8);

    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        block(offX + c, offY + r, shape[r][c], NEXT_BLOCK, NEXT_X, NEXT_Y);
  };

  const draw = () => {
    ctx.fillStyle = skin.background;
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    ctx.strokeStyle = skin.grid;
    ctx.lineWidth = 2;
    ctx.strokeRect(WELL_X - 1, 0, COLS * BLOCK + 2, ROWS * BLOCK);

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) block(c, r, board[r][c], BLOCK, WELL_X, 0);

    if (!gameOver) {
      const gy = ghostY(board, current);
      const { shape } = current;
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          block(current.x + c, gy + r, shape[r][c], BLOCK, WELL_X, 0, 0.2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          block(current.x + c, current.y + r, shape[r][c], BLOCK, WELL_X, 0);
    }

    drawNext();
  };

  // ── Loop ────────────────────────────────────────────────────────────────────
  const loop = (ts: number) => {
    raf = requestAnimationFrame(loop);
    if (!paused && !gameOver) {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
      lastTime = ts;
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(board, current.shape, current.x, current.y + 1))
          current.y++;
        else lockPiece();
      }
      emitStats();
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
      dropAccum = 0;
    },
    restart() {
      initGame();
    },
    setTheme(id) {
      skin = skinOf(id);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
