export type TetrisTheme = "neon" | "retro" | "pastel" | "pixel" | "toy";

export type Skin = {
  label: string;
  colors: string[]; // [sin uso, I, O, T, S, Z, J, L]
  background: string;
  grid: string; // grilla, borde del pozo y marco de NEXT
  text: string; // etiqueta NEXT
  drawBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    color: string,
    alpha: number,
  ): void;
};

const BACKGROUND = "#000";
const GRID = "rgba(255, 255, 255, 0.06)";
const TEXT = "rgba(255, 255, 255, 0.6)";

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const SKINS: Record<TetrisTheme, Skin> = {
  neon: {
    label: "NEÓN",
    colors: [
      "",
      "#00ffff",
      "#ffff00",
      "#d500f9",
      "#39ff14",
      "#ff1744",
      "#2979ff",
      "#ff9100",
    ],
    background: BACKGROUND,
    grid: "rgba(0, 255, 255, 0.12)",
    text: TEXT,
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, size - 6, size - 6);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
    },
  },

  retro: {
    label: "RETRO",
    colors: [
      "",
      "#4dd0e1",
      "#ffd54f",
      "#ba68c8",
      "#81c784",
      "#e57373",
      "#90caf9",
      "#ffb74d",
    ],
    background: BACKGROUND,
    grid: GRID,
    text: TEXT,
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(px + 1, py + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    },
  },

  pastel: {
    label: "PASTEL",
    colors: [
      "",
      "#a8e6ef",
      "#fff1a8",
      "#d7b8f0",
      "#b8e6b8",
      "#f7b8b8",
      "#b8d4f7",
      "#ffd9a8",
    ],
    background: BACKGROUND,
    grid: GRID,
    text: TEXT,
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      roundRectPath(ctx, px + 2, py + 2, size - 4, size - 4, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      roundRectPath(ctx, px + 6, py + 5, size - 14, 4, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },

  pixel: {
    label: "PIXEL",
    colors: [
      "",
      "#29b6f6",
      "#fdd835",
      "#ab47bc",
      "#66bb6a",
      "#ef5350",
      "#5c6bc0",
      "#ff9800",
    ],
    background: BACKGROUND,
    grid: GRID,
    text: TEXT,
    drawBlock(ctx, px, py, size, color, alpha) {
      const n = 7;
      const p = Math.floor((size - 2) / n);
      const ox = px + 1;
      const oy = py + 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(ox, oy, p * n, p * n);
      // bevel: borde superior/izquierdo claro, inferior/derecho oscuro
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillRect(ox, oy, p * n, p);
      ctx.fillRect(ox, oy, p, p * n);
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(ox, oy + p * (n - 1), p * n, p);
      ctx.fillRect(ox + p * (n - 1), oy, p, p * n);
      // textura: damero 2×2 interior
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.fillRect(ox + p * 2, oy + p * 2, p, p);
      ctx.fillRect(ox + p * 3, oy + p * 3, p, p);
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(ox + p * 3, oy + p * 2, p, p);
      ctx.fillRect(ox + p * 2, oy + p * 3, p, p);
      ctx.globalAlpha = 1;
    },
  },

  toy: {
    label: "JUGUETE",
    colors: [
      "",
      "#0277bd",
      "#9c7100",
      "#7b1fa2",
      "#2e7d32",
      "#c62828",
      "#283593",
      "#e65100",
    ],
    background: "#f3f0e8",
    grid: "rgba(0, 0, 0, 0.10)",
    text: "#3a3a3a",
    drawBlock(ctx, px, py, size, color, alpha) {
      const cx = px + size / 2;
      const cy = py + size / 2;
      const r = size * 0.22;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
      // tachuela: sombra inferior-derecha, relleno y brillo superior-izquierdo
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(cx, cy, r - 0.5, Math.PI * 0.75, Math.PI * 1.75);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },
};
