import { createAsteroids } from "./asteroids/engine";
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
};
