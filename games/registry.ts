import { createArkanoid } from "./arkanoid/engine";
import { createAsteroids } from "./asteroids/engine";
import { createSnake } from "./snake/engine";
import { createTetris } from "./tetris/engine";
import type { EngineDef } from "./types";

export const ENGINES: Record<string, EngineDef> = {
  // [games.slug]: { create, width, height, themes }
  asteroids: {
    create: createAsteroids,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
    ],
  },
  arkanoid: {
    create: createArkanoid,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
    ],
  },
  snake: {
    create: createSnake,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
    ],
  },
  tetris: {
    create: createTetris,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "retro", label: "RETRO" },
      { id: "pastel", label: "PASTEL" },
      { id: "pixel", label: "PIXEL" },
      { id: "toy", label: "JUGUETE" },
    ],
  },
};
