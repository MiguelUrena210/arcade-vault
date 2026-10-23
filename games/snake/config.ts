export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 40, // px; grilla 20×15 = 800×600
  COLS: 20,
  ROWS: 15,
  START: { x: 10, y: 7, length: 3 }, // cabeza y segmentos iniciales, mirando a la derecha
  TICK_MS: { initial: 140, step: 10, min: 60 }, // baja `step` por nivel hasta `min`
  FRUITS_PER_LEVEL: 5,
  POINTS_PER_FRUIT: 10,
  FRUIT_SIZE: 36, // px; lado mayor del sprite dentro de la celda
} as const;
