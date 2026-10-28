import { CONFIG, LANES, VEHICLE_LEN, type VehicleKind } from "./config";

export type Dir = "up" | "down" | "left" | "right";
export type Frog = {
  col: number;
  row: number; // celda lógica (destino si salta)
  from: { col: number; row: number }; // origen del salto
  hopT: number; // 0..1; 1 = en reposo
  facing: Dir;
  queued: Dir | null; // buffer de 1 salto
};
export type Vehicle = { x: number; len: number }; // x = borde izquierdo en px
export type Lane = {
  row: number;
  dir: 1 | -1;
  kind: VehicleKind;
  speed: number; // px/s con speedFactor(level) ya aplicado
  vehicles: Vehicle[];
};
export type Rect = { x: number; y: number; w: number; h: number };

const TRACK = CONFIG.WIDTH + 2 * CONFIG.WRAP_MARGIN;

export const DIR_DELTA: Record<Dir, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export function speedFactor(level: number): number {
  return 1 + CONFIG.SPEED_STEP * (Math.min(level, CONFIG.SPEED_LEVEL_CAP) - 1);
}

export function spawnLanes(
  level: number,
  rng: () => number = Math.random,
): Lane[] {
  return LANES.map((lane) => {
    const len = VEHICLE_LEN[lane.kind];
    const gap = TRACK / lane.count;
    const offset = rng() * TRACK;
    const vehicles: Vehicle[] = Array.from({ length: lane.count }, (_, i) => ({
      x: ((offset + i * gap) % TRACK) - CONFIG.WRAP_MARGIN,
      len,
    }));
    return {
      row: lane.row,
      dir: lane.dir,
      kind: lane.kind,
      speed: lane.speed * speedFactor(level),
      vehicles,
    };
  });
}

export function advanceLanes(lanes: Lane[], dt: number): void {
  for (const lane of lanes) {
    for (const v of lane.vehicles) {
      v.x += lane.dir * lane.speed * dt;
      if (lane.dir === 1 && v.x > CONFIG.WIDTH + CONFIG.WRAP_MARGIN) {
        v.x -= TRACK;
      } else if (lane.dir === -1 && v.x + v.len < -CONFIG.WRAP_MARGIN) {
        v.x += TRACK;
      }
    }
  }
}

/** Centro de la rana en px, interpolado durante el salto. */
export function frogPos(frog: Frog): { x: number; y: number } {
  const t = Math.min(frog.hopT, 1);
  const col = frog.from.col + (frog.col - frog.from.col) * t;
  const row = frog.from.row + (frog.row - frog.from.row) * t;
  return {
    x: col * CONFIG.CELL + CONFIG.CELL / 2,
    y: row * CONFIG.CELL + CONFIG.CELL / 2,
  };
}

export function frogHitbox(frog: Frog): Rect {
  const { x, y } = frogPos(frog);
  return {
    x: x - CONFIG.HITBOX / 2,
    y: y - CONFIG.HITBOX / 2,
    w: CONFIG.HITBOX,
    h: CONFIG.HITBOX,
  };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function hitsTraffic(lanes: Lane[], frog: Frog): boolean {
  const box = frogHitbox(frog);
  for (const lane of lanes) {
    const y = lane.row * CONFIG.CELL;
    for (const v of lane.vehicles) {
      if (overlaps(box, { x: v.x, y, w: v.len, h: CONFIG.CELL })) return true;
    }
  }
  return false;
}

/** Índice de madriguera de la columna, o -1 si cae en el seto. */
export function homeIndex(col: number): number {
  return CONFIG.HOME_COLS.indexOf(col as (typeof CONFIG.HOME_COLS)[number]);
}

export function canMove(frog: Frog, dir: Dir): boolean {
  const col = frog.col + DIR_DELTA[dir].col;
  const row = frog.row + DIR_DELTA[dir].row;
  return col >= 0 && col < CONFIG.COLS && row >= 0 && row < CONFIG.ROWS;
}

export function homeScore(timeLeft: number): number {
  return CONFIG.POINTS.perSecond * Math.floor(timeLeft);
}

export function clampScore(n: number): number {
  return Math.min(n, CONFIG.SCORE_MAX);
}
