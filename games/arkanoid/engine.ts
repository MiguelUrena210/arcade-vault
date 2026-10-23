import type { EngineCallbacks, EngineHandle, EngineStats } from "../types";
import { CONFIG } from "./config";
import {
  attachBall,
  ballSpeed,
  collideBallBricks,
  collideBallPaddle,
  createBall,
  createBricks,
  createPaddle,
  launchBall,
  updateBall,
  updatePaddle,
  type Ball,
  type Brick,
  type Paddle,
} from "./entities";
import { LEVELS } from "./levels";
import { SPRITESHEET_URL } from "./sprites";
import {
  drawBall,
  drawBricks,
  drawExplosions,
  drawPaddle,
  paletteFor,
  type ArkanoidTheme,
  type Explosion,
} from "./theme";

export type { ArkanoidTheme } from "./theme";

const { WIDTH: W, HEIGHT: H } = CONFIG;

const MAX_DT = 1 / 30; // s

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const SOUND_BASE = "/games/arkanoid/sounds/";

type Mode = "menu" | "ready" | "playing" | "gameover";

const isTextTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

const themeOf = (id: string): ArkanoidTheme =>
  id === "classic" ? "classic" : "neon";

export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme: string = "neon",
): EngineHandle {
  const ctx = canvas.getContext("2d")!;
  let currentTheme = themeOf(theme);

  let mode: Mode = "menu";
  let score = 0;
  let lives: number = CONFIG.LIVES;
  let level = 1;
  let menuIndex = 0;
  let paddle: Paddle = createPaddle();
  const ball: Ball = createBall();
  let bricks: Brick[] = [];
  let explosions: Explosion[] = [];
  let muted = false;
  let paused = false;
  let lastTime: number | null = null;
  let raf = 0;
  let last: EngineStats | null = null;

  const held = new Set<string>(); // teclas mantenidas
  const pressed = new Set<string>(); // pulsaciones desde el último update

  // ── Spritesheet (CLÁSICO) ───────────────────────────────────────────────────
  let sheet: HTMLImageElement | null = null;
  let sheetImg: HTMLImageElement | null = null;
  const ensureSheet = () => {
    if (sheetImg) return;
    const img = new Image();
    img.onload = () => {
      sheet = img;
    };
    img.src = SPRITESHEET_URL;
    sheetImg = img;
  };
  if (currentTheme === "classic") ensureSheet();

  // ── Sonido ──────────────────────────────────────────────────────────────────
  const bounceSound = new Audio(`${SOUND_BASE}ball-bounce.mp3`);
  const breakSound = new Audio(`${SOUND_BASE}break-sound.mp3`);
  const playing = new Set<HTMLAudioElement>();
  const playSound = (sound: HTMLAudioElement) => {
    if (muted) return;
    const clone = sound.cloneNode() as HTMLAudioElement;
    playing.add(clone);
    clone.addEventListener("ended", () => playing.delete(clone));
    clone.play().catch(() => playing.delete(clone));
  };

  // ── Estado ──────────────────────────────────────────────────────────────────
  const emitStats = () => {
    if (
      last &&
      last.score === score &&
      last.lives === lives &&
      last.level === level
    )
      return;
    last = { score, lives, level };
    callbacks.onStats(last);
  };

  const resetPaddle = () => {
    paddle = createPaddle();
    attachBall(ball, paddle);
  };

  // Partida limpia en el nivel indicado (1-based).
  const startGame = (startLevel: number) => {
    score = 0;
    lives = CONFIG.LIVES;
    level = startLevel;
    bricks = createBricks(level);
    explosions = [];
    resetPaddle();
    mode = "ready";
    emitStats();
  };

  const startNextLevel = () => {
    level++;
    bricks = createBricks(level);
    explosions = [];
    resetPaddle();
    mode = "ready";
  };

  const initGame = () => {
    score = 0;
    lives = CONFIG.LIVES;
    level = 1;
    menuIndex = 0;
    bricks = [];
    explosions = [];
    resetPaddle();
    mode = "menu";
    paused = false;
    lastTime = null;
    held.clear();
    pressed.clear();
    last = null; // el HUD siempre recibe el estado inicial tras reiniciar
    emitStats();
  };

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || mode === "gameover") return;
    if (e.code === "KeyM" && !e.repeat) muted = !muted;
    held.add(e.code);
    if (!e.repeat) pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    held.delete(e.code);
  };
  const onBlur = () => held.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const paddleDir = () =>
    (held.has("ArrowRight") || held.has("KeyD") ? 1 : 0) -
    (held.has("ArrowLeft") || held.has("KeyA") ? 1 : 0);

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateMenu = () => {
    const count = LEVELS.length;
    if (pressed.has("ArrowUp")) menuIndex = (menuIndex - 1 + count) % count;
    if (pressed.has("ArrowDown")) menuIndex = (menuIndex + 1) % count;
    if (pressed.has("Enter")) startGame(menuIndex + 1);
    else if (pressed.has("Space")) startGame(1);
  };

  const update = (dt: number) => {
    explosions = explosions
      .map((e) => ({ ...e, t: e.t + dt * 1000 }))
      .filter((e) => e.t < CONFIG.EXPLOSION_MS);

    if (mode === "menu") {
      updateMenu();
    } else if (mode === "ready") {
      updatePaddle(paddle, paddleDir(), dt);
      attachBall(ball, paddle);
      if (pressed.has("Space")) {
        launchBall(ball, ballSpeed(level));
        mode = "playing";
      }
    } else if (mode === "playing") {
      updatePaddle(paddle, paddleDir(), dt);
      const hitWall = updateBall(ball, dt);
      const hitPaddle = collideBallPaddle(ball, paddle, ballSpeed(level));
      const brick = collideBallBricks(ball, bricks);
      if (hitWall || hitPaddle || brick) playSound(bounceSound);
      if (brick && !brick.alive) {
        score +=
          brick.color === "gray"
            ? CONFIG.POINTS_PER_HIT_GRAY * brick.maxHp
            : CONFIG.POINTS_PER_BRICK;
        explosions.push({
          x: brick.x,
          y: brick.y,
          w: brick.w,
          h: brick.h,
          color: brick.color,
          t: 0,
        });
        playSound(breakSound);
      }
      if (!bricks.some((b) => b.alive)) {
        startNextLevel();
      } else if (ball.y > H) {
        lives--;
        if (lives === 0) {
          mode = "gameover";
          emitStats();
          callbacks.onGameOver(score);
        } else {
          mode = "ready";
          attachBall(ball, paddle);
        }
      }
    }
    pressed.clear();
    emitStats();
  };

  // ── Draw ────────────────────────────────────────────────────────────────────
  const drawMenu = (pal: ReturnType<typeof paletteFor>) => {
    ctx.textAlign = "center";
    ctx.fillStyle = pal.text;
    ctx.shadowColor = pal.text;
    ctx.shadowBlur = pal.glow;
    ctx.font = "bold 56px monospace";
    ctx.fillText("ARKANOID", W / 2, H / 2 - 100);
    ctx.shadowBlur = 0;
    ctx.font = "bold 28px monospace";
    LEVELS.forEach((_, i) => {
      const label = `NIVEL ${i + 1}`;
      ctx.fillStyle = i === menuIndex ? pal.bricks.yellow : pal.text;
      ctx.fillText(
        i === menuIndex ? `> ${label} <` : label,
        W / 2,
        H / 2 - 30 + i * 44,
      );
    });
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px monospace";
    ctx.fillText(
      "↑↓ mover · Enter elegir · Espacio para empezar",
      W / 2,
      H - 40,
    );
  };

  const draw = () => {
    const pal = paletteFor(currentTheme, !!sheet);
    const spriteSheet = currentTheme === "classic" ? sheet : null;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";
    if (mode === "menu") {
      drawMenu(pal);
      return;
    }
    drawBricks(ctx, pal, spriteSheet, bricks);
    drawExplosions(ctx, pal, spriteSheet, explosions);
    drawPaddle(ctx, pal, spriteSheet, paddle);
    drawBall(ctx, pal, spriteSheet, ball);
    if (mode === "ready") {
      ctx.textAlign = "center";
      ctx.fillStyle = pal.text;
      ctx.font = "bold 22px monospace";
      ctx.fillText("ESPACIO PARA LANZAR", W / 2, H / 2 + 80);
    }
  };

  // ── Loop ────────────────────────────────────────────────────────────────────
  const loop = (ts: number) => {
    raf = requestAnimationFrame(loop);
    if (!paused && mode !== "gameover") {
      const dt =
        lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
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
      pressed.clear();
    },
    restart() {
      initGame();
    },
    setTheme(id) {
      currentTheme = themeOf(id);
      if (currentTheme === "classic") ensureSheet();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (sheetImg) sheetImg.onload = null;
      playing.forEach((a) => a.pause());
      playing.clear();
    },
  };
}
