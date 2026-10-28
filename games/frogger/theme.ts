import { CONFIG, VEHICLE_LEN, type VehicleKind } from "./config";
import type { Dir, Lane } from "./entities";

export type HoraPuntaTheme = "neon" | "classic";

export type Palette = {
  bg: string; // asfalto
  sidewalk: string; // acera y mediana
  hedge: string; // seto de la meta
  home: string; // madriguera libre
  laneLine: string; // líneas discontinuas
  frog: string;
  frogEye: string;
  vehicles: Record<VehicleKind, string>;
  timer: string;
  timerLow: string; // < 5 s
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};

export const PALETTES: Record<HoraPuntaTheme, Palette> = {
  neon: {
    bg: "#0a0a14",
    sidewalk: "#1a1a2e",
    hedge: "#0e3a1f",
    home: "#050d08",
    laneLine: "#00f5ff",
    frog: "#00ff88",
    frogEye: "#d4ffea",
    vehicles: { moto: "#00f5ff", car: "#ff006e", truck: "#ffd60a" },
    timer: "#00ff88",
    timerLow: "#ff3355",
    glow: 12,
    text: "#eaffff",
  },
  classic: {
    bg: "#4a4a52",
    sidewalk: "#8a6fd6",
    hedge: "#1e9e3c",
    home: "#0d0d12",
    laneLine: "#e8e8e8",
    frog: "#35c23a",
    frogEye: "#ffffff",
    vehicles: { moto: "#ffd23f", car: "#ff5d5d", truck: "#d9d9e6" },
    timer: "#35c23a",
    timerLow: "#e03030",
    glow: 0,
    text: "#ffffff",
  },
};

const { CELL, WIDTH, HEIGHT, COLS, HOME_COLS, MEDIAN_ROW, CROSS_TIME_S } =
  CONFIG;
const EXIT_ROW = CONFIG.ROWS - 1;
// Bordes entre carriles dentro de cada bloque de autopista (filas 1–6 y 8–13).
const DASH_YS = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13].map((row) => row * CELL);

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  classic: boolean,
  homes: boolean[],
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Mediana y acera de salida.
  ctx.fillStyle = p.sidewalk;
  ctx.fillRect(0, MEDIAN_ROW * CELL, WIDTH, CELL);
  ctx.fillRect(0, EXIT_ROW * CELL, WIDTH, CELL);

  // Seto de la meta con sus 5 madrigueras.
  ctx.fillStyle = p.hedge;
  ctx.fillRect(0, 0, WIDTH, CELL);
  for (const col of HOME_COLS) {
    ctx.fillStyle = p.home;
    ctx.fillRect(col * CELL + 3, 3, CELL - 6, CELL - 3);
  }
  // Borde de las madrigueras libres, como invitación.
  ctx.strokeStyle = p.frog;
  ctx.lineWidth = 2;
  homes.forEach((occupied, i) => {
    if (occupied) return;
    const col = HOME_COLS[i];
    ctx.strokeRect(col * CELL + 3, 3, CELL - 6, CELL - 3);
  });

  // Líneas discontinuas entre carriles.
  ctx.save();
  ctx.strokeStyle = p.laneLine;
  ctx.lineWidth = classic ? 4 : 3;
  ctx.setLineDash([24, 16]);
  if (!classic) ctx.shadowBlur = p.glow;
  if (!classic) ctx.shadowColor = p.laneLine;
  ctx.beginPath();
  for (const y of DASH_YS) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();
  ctx.restore();

  // CLÁSICO: línea central amarilla doble en la mediana.
  if (classic) {
    ctx.fillStyle = "#f2c21e";
    const mid = MEDIAN_ROW * CELL + CELL / 2;
    ctx.fillRect(0, mid - 5, WIDTH, 3);
    ctx.fillRect(0, mid + 2, WIDTH, 3);
  }
}

export function drawTraffic(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  classic: boolean,
  lanes: Lane[],
): void {
  for (const lane of lanes) {
    const color = p.vehicles[lane.kind];
    const len = VEHICLE_LEN[lane.kind];
    const y = lane.row * CELL + 6;
    const h = CELL - 12;
    for (const v of lane.vehicles) {
      if (v.x + len < 0 || v.x > WIDTH) continue;
      if (classic) {
        // Vehículo plano con ruedas.
        ctx.fillStyle = "#1c1c22";
        ctx.fillRect(v.x + 6, y - 3, 12, h + 6);
        ctx.fillRect(v.x + len - 18, y - 3, 12, h + 6);
        ctx.fillStyle = color;
        ctx.fillRect(v.x, y, len, h);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fillRect(v.x + 4, y + 4, len - 8, 6);
      } else {
        // Rectángulo redondeado con contorno luminoso y faros.
        ctx.save();
        ctx.shadowBlur = p.glow;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.roundRect(v.x, y, len, h, 8);
        ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
        const frontX = lane.dir === 1 ? v.x + len - 5 : v.x + 5;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(frontX, y + 7, 2.5, 0, Math.PI * 2);
        ctx.arc(frontX, y + h - 7, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

const FACING_ANGLE: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

export type FrogPose = "normal" | "sitting" | "squashed";

/** Rana vectorial centrada en (x, y): cuerpo ovalado, 4 patas y 2 ojos. */
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  facing: Dir,
  pose: FrogPose = "normal",
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(FACING_ANGLE[facing]);
  ctx.shadowBlur = p.glow;
  ctx.shadowColor = p.frog;
  ctx.fillStyle = p.frog;

  if (pose === "squashed") {
    // Rana achatada con un aspa encima.
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = p.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const sitting = pose === "sitting";
  const rx = sitting ? 9 : 11;
  const ry = sitting ? 9 : 13;
  // Patas: delanteras y traseras (recogidas si está sentada).
  const legY = sitting ? 5 : 8;
  ctx.beginPath();
  ctx.ellipse(-rx, -6, 3.5, 5, -0.5, 0, Math.PI * 2);
  ctx.ellipse(rx, -6, 3.5, 5, 0.5, 0, Math.PI * 2);
  ctx.ellipse(-rx, legY, 4, 6, 0.6, 0, Math.PI * 2);
  ctx.ellipse(rx, legY, 4, 6, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Cuerpo.
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ojos.
  ctx.shadowBlur = 0;
  ctx.fillStyle = p.frogEye;
  ctx.beginPath();
  ctx.arc(-5, -ry + 2, 3, 0, Math.PI * 2);
  ctx.arc(5, -ry + 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.bg;
  ctx.beginPath();
  ctx.arc(-5, -ry + 1.5, 1.3, 0, Math.PI * 2);
  ctx.arc(5, -ry + 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Franja de 6 px en el borde inferior de la acera de salida, sin números. */
export function drawTimerBar(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  timeLeft: number,
): void {
  const frac = Math.max(0, Math.min(1, timeLeft / CROSS_TIME_S));
  const y = HEIGHT - 6;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, y, WIDTH, 6);
  ctx.fillStyle = timeLeft < 5 ? p.timerLow : p.timer;
  ctx.fillRect(0, y, WIDTH * frac, 6);
}

export function drawHint(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  text: string,
): void {
  ctx.save();
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = p.glow;
  ctx.shadowColor = p.text;
  ctx.fillStyle = p.text;
  ctx.fillText(text, (COLS * CELL) / 2, HEIGHT - 140);
  ctx.restore();
}
