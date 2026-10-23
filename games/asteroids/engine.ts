import {
  Asteroid,
  Bullet,
  H,
  Particle,
  POINTS,
  Ship,
  W,
  dist,
  rand,
  type Keys,
} from "./entities";
import type { EngineCallbacks, EngineHandle, EngineStats } from "../types";
import { PALETTES, type AsteroidsTheme, type Palette } from "./theme";

export type { AsteroidsTheme } from "./theme";

export type AsteroidsStats = EngineStats;
export type AsteroidsCallbacks = EngineCallbacks;
export type AsteroidsHandle = EngineHandle;

type Phase = "playing" | "dead" | "gameover";

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const isTextTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
  theme: string = "neon",
): AsteroidsHandle {
  const ctx = canvas.getContext("2d")!;
  const paletteOf = (id: string): Palette =>
    PALETTES[id as AsteroidsTheme] ?? PALETTES.neon;
  let palette: Palette = paletteOf(theme);

  const keys: Keys = {};
  const justPressed: Keys = {};

  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let phase: Phase = "playing";
  let deadTimer = 0;
  let paused = false;
  let lastTime: number | null = null;
  let raf = 0;
  let last: AsteroidsStats | null = null;

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  const clearInput = () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  };
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearInput);

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

  const spawnAsteroids = (count: number) => {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  };

  const initGame = () => {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = 3;
    level = 1;
    phase = "playing";
    spawnAsteroids(4);
    emitStats();
  };

  const nextLevel = () => {
    level++;
    bullets = [];
    particles = [];
    ship.reset();
    spawnAsteroids(3 + level);
  };

  const explode = (x: number, y: number, count = 8) => {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  };

  const killShip = () => {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
      emitStats();
      callbacks.onGameOver(score);
    } else {
      phase = "dead";
      deadTimer = 2;
    }
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  const update = (dt: number) => {
    if (phase === "gameover") return;

    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
        justPressed["Space"] = false;
      }
      return;
    }

    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (phase === "playing" && asteroids.length === 0) nextLevel();

    emitStats();
  };

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = () => {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);
  };

  // ── Loop ────────────────────────────────────────────────────────────────────
  const loop = (ts: number) => {
    raf = requestAnimationFrame(loop);
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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
      clearInput();
    },
    resume() {
      if (!paused) return;
      paused = false;
      lastTime = null;
      clearInput();
    },
    restart() {
      paused = false;
      lastTime = null;
      clearInput();
      initGame();
    },
    setTheme(next) {
      palette = paletteOf(next);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
    },
  };
}
