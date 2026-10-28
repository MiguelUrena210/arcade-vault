import type { EngineCallbacks, EngineHandle, EngineStats } from "../types";
import { CONFIG } from "./config";
import {
  advanceLanes,
  canMove,
  clampScore,
  DIR_DELTA,
  frogPos,
  hitsTraffic,
  homeIndex,
  homeScore,
  spawnLanes,
  type Dir,
  type Frog,
  type Lane,
} from "./entities";
import {
  drawBoard,
  drawFrog,
  drawHint,
  drawTimerBar,
  drawTraffic,
  PALETTES,
  type HoraPuntaTheme,
} from "./theme";

type Mode = "ready" | "playing" | "dying" | "cleared" | "gameover";

const MAX_DT_S = 0.05;
// Solo estas reciben preventDefault; WASD no lo necesita.
const PREVENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
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

function isTextTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}

function themeOf(id: string | undefined): HoraPuntaTheme {
  return id && Object.hasOwn(PALETTES, id) ? (id as HoraPuntaTheme) : "neon";
}

export function createHoraPunta(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string,
): EngineHandle {
  const ctx = canvas.getContext("2d")!;
  let currentTheme = themeOf(theme);

  let mode: Mode = "ready";
  let frog!: Frog;
  let lanes: Lane[] = [];
  let homes: boolean[] = [];
  let bestRow: number = CONFIG.START.row;
  let timeLeft: number = CONFIG.CROSS_TIME_S;
  let animT = 0; // ms restantes de dying/cleared
  let deathPos = { x: 0, y: 0 };
  let score = 0;
  let lives: number = CONFIG.LIVES.start;
  let level = 1;
  let nextLifeAt = CONFIG.LIVES.extraEvery;

  let paused = false;
  let lastTime: number | null = null;
  let raf = 0;
  let last: EngineStats | null = null;

  function emitStats(): void {
    if (
      last &&
      last.score === score &&
      last.lives === lives &&
      last.level === level
    ) {
      return;
    }
    last = { score, lives, level };
    callbacks.onStats(last);
  }

  function addScore(n: number): void {
    score = clampScore(score + n);
    while (score >= nextLifeAt) {
      lives = Math.min(CONFIG.LIVES.max, lives + 1);
      nextLifeAt += CONFIG.LIVES.extraEvery;
    }
    emitStats();
  }

  function respawn(): void {
    frog = {
      col: CONFIG.START.col,
      row: CONFIG.START.row,
      from: { ...CONFIG.START },
      hopT: 1,
      facing: "up",
      queued: null,
    };
    bestRow = CONFIG.START.row;
    timeLeft = CONFIG.CROSS_TIME_S;
  }

  function initGame(): void {
    score = 0;
    lives = CONFIG.LIVES.start;
    level = 1;
    nextLifeAt = CONFIG.LIVES.extraEvery;
    homes = Array.from({ length: CONFIG.HOME_COLS.length }, () => false);
    lanes = spawnLanes(1);
    respawn();
    mode = "ready";
    last = null;
    emitStats();
  }

  function die(): void {
    deathPos = frogPos(frog);
    lives -= 1;
    emitStats();
    mode = "dying";
    animT = CONFIG.DYING_MS;
  }

  function startHop(dir: Dir): void {
    frog.from = { col: frog.col, row: frog.row };
    frog.col += DIR_DELTA[dir].col;
    frog.row += DIR_DELTA[dir].row;
    frog.hopT = 0;
    frog.facing = dir;
  }

  function tryHop(dir: Dir): void {
    if (frog.hopT < 1) {
      frog.queued = dir; // buffer de 1: sustituye a la anterior
      return;
    }
    if (canMove(frog, dir)) startHop(dir);
  }

  function land(): void {
    const { col, row } = frog;
    if (row === 0) {
      const i = homeIndex(col);
      if (i === -1 || homes[i]) {
        die();
        return;
      }
      homes[i] = true;
      addScore(CONFIG.POINTS.home + homeScore(timeLeft));
      if (homes.every(Boolean)) {
        addScore(CONFIG.POINTS.level);
        mode = "cleared";
        animT = CONFIG.CLEARED_MS;
        return;
      }
      respawn();
      return;
    }
    if (row < bestRow) {
      bestRow = row;
      addScore(CONFIG.POINTS.row);
    }
    const queued = frog.queued;
    frog.queued = null;
    if (queued) tryHop(queued);
  }

  function update(dt: number): void {
    if (mode !== "gameover") advanceLanes(lanes, dt);

    if (mode === "playing") {
      if (frog.hopT < 1) {
        frog.hopT = Math.min(1, frog.hopT + (dt * 1000) / CONFIG.HOP_MS);
        if (frog.hopT >= 1) land();
      }
      if (mode !== "playing") return;
      if (hitsTraffic(lanes, frog)) {
        die();
        return;
      }
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) die();
      return;
    }

    if (mode === "dying") {
      animT -= dt * 1000;
      if (animT > 0) return;
      if (lives > 0) {
        respawn();
        mode = "playing";
      } else {
        mode = "gameover";
        callbacks.onGameOver(score);
      }
      return;
    }

    if (mode === "cleared") {
      animT -= dt * 1000;
      if (animT > 0) return;
      level += 1;
      emitStats();
      homes = homes.map(() => false);
      lanes = spawnLanes(level);
      respawn();
      mode = "playing";
    }
  }

  function draw(): void {
    const p = PALETTES[currentTheme];
    const classic = currentTheme === "classic";
    drawBoard(ctx, p, classic, homes);
    drawTraffic(ctx, p, classic, lanes);
    homes.forEach((occupied, i) => {
      if (!occupied) return;
      const x = CONFIG.HOME_COLS[i] * CONFIG.CELL + CONFIG.CELL / 2;
      drawFrog(ctx, p, x, CONFIG.CELL / 2, "up", "sitting");
    });
    if (mode === "ready" || mode === "playing") {
      const { x, y } = frogPos(frog);
      drawFrog(ctx, p, x, y, frog.facing);
    } else if (mode === "dying") {
      drawFrog(ctx, p, deathPos.x, deathPos.y, frog.facing, "squashed");
    }
    drawTimerBar(ctx, p, timeLeft);
    if (mode === "ready") drawHint(ctx, p, "PULSA UNA FLECHA");
    if (mode === "cleared" && Math.floor(animT / 100) % 2 === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (isTextTarget(e.target)) return;
    const dir = KEY_DIR[e.code];
    const isGameKey = dir !== undefined || e.code === "Space";
    if (PREVENT_KEYS.has(e.code)) e.preventDefault();
    if (!isGameKey || paused || e.repeat) return;

    if (mode === "ready") {
      mode = "playing";
      if (dir && dir !== "down") tryHop(dir);
      return;
    }
    if (mode !== "playing" || !dir) return;
    tryHop(dir);
  }

  function loop(ts: number): void {
    raf = requestAnimationFrame(loop);
    const dt =
      lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT_S);
    lastTime = ts;
    if (!paused && mode !== "gameover") update(dt);
    draw();
  }

  initGame();
  window.addEventListener("keydown", onKeyDown);
  raf = requestAnimationFrame(loop);

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      lastTime = null;
      frog.queued = null;
    },
    restart() {
      initGame();
    },
    setTheme(id: string) {
      currentTheme = themeOf(id);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
