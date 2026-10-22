const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  HUD_HEIGHT: 56, // franja superior del HUD; la bola rebota por debajo de ella
  PADDLE: { w: 100, h: 20, speed: 520, y: 560 }, // px/s
  BALL: { size: 14, speed: 380, maxAngle: 60, speedStep: 0.08 }, // px/s, grados desde la vertical; speedStep = +% por nivel
  BRICKS: {
    cols: 10, rows: 6, maxRows: 10, w: 70, h: 24, gap: 4, offsetX: 32, offsetY: 70,
    colors: ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink'],
  },
  LIVES: 3,
  POINTS_PER_BRICK: 10,
  POINTS_PER_HIT_GRAY: 10, // por golpe de hp: un gray de N golpes suma 10 * N
  GRAY_LOOK: { // apariencia del gray según hp restante
    3: { tint: 'rgba(0,0,0,0.35)', cracks: 0 },       // oscuro, intacto
    2: { tint: null, cracks: 1 },                     // medio, 1 grieta
    1: { tint: 'rgba(255,255,255,0.30)', cracks: 2 }, // claro, 2 grietas
  },
  CRACKS: { // polilíneas fijas; coordenadas relativas al bloque (0-1)
    color: 'rgba(0,0,0,0.7)',
    width: 2,
    lines: [
      [[0.30, 0.00], [0.40, 0.35], [0.28, 0.60], [0.38, 1.00]],
      [[0.72, 0.00], [0.62, 0.30], [0.76, 0.58], [0.66, 1.00]],
    ],
  },
};
