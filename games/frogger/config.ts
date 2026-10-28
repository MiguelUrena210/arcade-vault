export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 40,
  COLS: 20,
  ROWS: 15,
  START: { col: 10, row: 14 },
  HOME_COLS: [2, 6, 10, 14, 18],
  MEDIAN_ROW: 7,
  HOP_MS: 110,
  HITBOX: 24,
  CROSS_TIME_S: 30,
  DYING_MS: 600,
  CLEARED_MS: 800,
  LIVES: { start: 3, max: 5, extraEvery: 10_000 },
  POINTS: { row: 10, home: 50, perSecond: 10, level: 1000 },
  SPEED_STEP: 0.1,
  SPEED_LEVEL_CAP: 10,
  WRAP_MARGIN: 160, // px fuera de pantalla antes de reaparecer
  SCORE_MAX: 1_000_000,
} as const;

export type VehicleKind = "moto" | "car" | "truck";
export const VEHICLE_LEN: Record<VehicleKind, number> = {
  moto: 40,
  car: 60,
  truck: 120,
};

// row, dir (1 = →, −1 = ←), kind, speed (px/s en nivel 1), count
export const LANES = [
  { row: 13, dir: -1, kind: "car", speed: 70, count: 3 },
  { row: 12, dir: 1, kind: "car", speed: 90, count: 3 },
  { row: 11, dir: -1, kind: "truck", speed: 50, count: 2 },
  { row: 10, dir: 1, kind: "moto", speed: 160, count: 2 },
  { row: 9, dir: -1, kind: "car", speed: 110, count: 3 },
  { row: 8, dir: 1, kind: "truck", speed: 70, count: 2 },
  { row: 6, dir: -1, kind: "car", speed: 130, count: 3 },
  { row: 5, dir: 1, kind: "truck", speed: 90, count: 2 },
  { row: 4, dir: -1, kind: "moto", speed: 200, count: 2 },
  { row: 3, dir: 1, kind: "car", speed: 150, count: 4 },
  { row: 2, dir: -1, kind: "truck", speed: 110, count: 2 },
  { row: 1, dir: 1, kind: "car", speed: 170, count: 3 },
] as const;
