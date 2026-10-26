import { CONFIG } from "./config";
import type { Ball, Brick, Paddle } from "./entities";
import type { BrickColor } from "./levels";
import { EXPLOSION_FRAMES, SPRITES, type Sprite } from "./sprites";

export type ArkanoidTheme = "neon" | "classic" | "poster";

export type Palette = {
  bg: string;
  paddle: string;
  ball: string;
  bricks: Record<BrickColor, string>;
  brickStroke: string | null; // contorno de ladrillo vectorial; null = sin contorno
  glow: number; // shadowBlur; 0 en CLÁSICO y PÓSTER
  text: string; // título, niveles y "ESPACIO PARA LANZAR"
  accent: string; // nivel seleccionado en el menú
  hint: string; // pista inferior del menú
};

export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BrickColor;
  t: number; // ms
};

export const PALETTES: Record<ArkanoidTheme, Palette> = {
  neon: {
    bg: "#000",
    paddle: "#00f5ff",
    ball: "#fff",
    bricks: {
      red: "#ff2e4d",
      cyan: "#00f5ff",
      green: "#00ff88",
      magenta: "#d400ff",
      yellow: "#f5ff00",
      hotpink: "#ff006e",
      gray: "#8a8fa3",
    },
    brickStroke: null,
    glow: 8,
    text: "#00f5ff",
    accent: "#f5ff00",
    hint: "rgba(255, 255, 255, 0.6)",
  },
  classic: {
    bg: "#000",
    paddle: "#cfd3dc",
    ball: "#fff",
    bricks: {
      red: "#e03a3a",
      cyan: "#35c7d9",
      green: "#3ec24a",
      magenta: "#b23ad6",
      yellow: "#e6d83a",
      hotpink: "#e0449c",
      gray: "#8a8a8a",
    },
    brickStroke: null,
    glow: 0,
    text: "#fff",
    accent: "#e6d83a",
    hint: "rgba(255, 255, 255, 0.6)",
  },
  poster: {
    bg: "#f2ead8",
    paddle: "#263238",
    ball: "#1a1a1a",
    bricks: {
      red: "#c62828",
      cyan: "#00838f",
      green: "#2e7d32",
      magenta: "#8e24aa",
      yellow: "#a66a00",
      hotpink: "#d81b60",
      gray: "#6d6d6d",
    },
    brickStroke: "#1a1a1a",
    glow: 0,
    text: "#1a1a1a",
    accent: "#c62828",
    hint: "#4a4a4a",
  },
};

// CLÁSICO sin spritesheet cargado: colores NEÓN sin glow.
const FALLBACK: Palette = { ...PALETTES.neon, glow: 0 };

export function paletteFor(theme: ArkanoidTheme, sheetReady: boolean): Palette {
  if (theme === "classic" && !sheetReady) return FALLBACK;
  return PALETTES[theme];
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  s: Sprite,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, s.sx, s.sy, s.sw, s.sh, x, y, w, h);
}

function withGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  glow: number,
  draw: () => void,
) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  draw();
  ctx.shadowBlur = 0;
}

// `sheet` no nulo = dibujar con sprites (CLÁSICO ya cargado); nulo = vectorial.
export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  sheet: HTMLImageElement | null,
  p: Paddle,
) {
  if (sheet) {
    drawSprite(ctx, sheet, SPRITES.paddle, p.x, p.y, p.w, p.h);
    return;
  }
  withGlow(ctx, pal.paddle, pal.glow, () => {
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
  });
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  sheet: HTMLImageElement | null,
  b: Ball,
) {
  if (sheet) {
    drawSprite(ctx, sheet, SPRITES.ball, b.x, b.y, b.size, b.size);
    return;
  }
  withGlow(ctx, pal.ball, pal.glow, () => {
    ctx.beginPath();
    ctx.arc(b.x + b.size / 2, b.y + b.size / 2, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Tono y grietas del gray según hp restante, encima del bloque.
function drawGrayDamage(ctx: CanvasRenderingContext2D, b: Brick) {
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

export function drawBricks(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  sheet: HTMLImageElement | null,
  bricks: Brick[],
) {
  for (const b of bricks) {
    if (!b.alive) continue;
    if (sheet) {
      drawSprite(ctx, sheet, SPRITES.blocks[b.color], b.x, b.y, b.w, b.h);
    } else {
      withGlow(ctx, pal.bricks[b.color], pal.glow, () =>
        ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2),
      );
      if (pal.brickStroke) {
        ctx.strokeStyle = pal.brickStroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
    }
    if (b.color === "gray") drawGrayDamage(ctx, b);
  }
}

export function drawExplosions(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  sheet: HTMLImageElement | null,
  explosions: Explosion[],
) {
  for (const e of explosions) {
    const p = Math.min(1, e.t / CONFIG.EXPLOSION_MS);
    if (sheet) {
      const frames = EXPLOSION_FRAMES[e.color];
      const i = Math.min(frames.length - 1, Math.floor(p * frames.length));
      drawSprite(ctx, sheet, frames[i], e.x, e.y, e.w, e.h);
      continue;
    }
    const grow = p * 8;
    ctx.globalAlpha = 1 - p;
    withGlow(ctx, pal.bricks[e.color], pal.glow, () =>
      ctx.fillRect(e.x - grow, e.y - grow, e.w + grow * 2, e.h + grow * 2),
    );
    ctx.globalAlpha = 1;
  }
}
