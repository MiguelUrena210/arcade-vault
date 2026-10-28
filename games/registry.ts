import { createArkanoid } from "./arkanoid/engine";
import { createAsteroids } from "./asteroids/engine";
import { createHoraPunta } from "./frogger/engine";
import { createSnake } from "./snake/engine";
import { createTetris } from "./tetris/engine";
import type { EngineDef, TouchControls } from "./types";

// Cruceta estándar: flechas del teclado, etiquetas ▲ ▼ ◀ ▶
const DPAD = {
  up: { code: "ArrowUp", label: "▲" },
  down: { code: "ArrowDown", label: "▼" },
  left: { code: "ArrowLeft", label: "◀" },
  right: { code: "ArrowRight", label: "▶" },
} satisfies TouchControls["dpad"];

export const ENGINES: Record<string, EngineDef> = {
  // [games.slug]: { create, width, height, themes, controls }
  asteroids: {
    create: createAsteroids,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
      { id: "notebook", label: "CUADERNO" },
    ],
    controls: {
      dpad: { up: DPAD.up, left: DPAD.left, right: DPAD.right },
      buttons: [{ code: "Space", label: "DISPARO" }],
    },
  },
  arkanoid: {
    create: createArkanoid,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
      { id: "poster", label: "PÓSTER" },
    ],
    controls: {
      dpad: DPAD,
      buttons: [
        { code: "Space", label: "LANZAR" },
        { code: "Enter", label: "NIVEL" },
        { code: "KeyM", label: "SONIDO" },
      ],
    },
  },
  snake: {
    create: createSnake,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
      { id: "amber", label: "ÁMBAR" },
    ],
    controls: {
      dpad: DPAD,
      buttons: [{ code: "Space", label: "INICIO" }],
    },
  },
  frogger: {
    create: createHoraPunta,
    width: 800,
    height: 600,
    themes: [
      { id: "neon", label: "NEÓN" },
      { id: "classic", label: "CLÁSICO" },
      { id: "diorama", label: "DIORAMA" },
    ],
    controls: {
      dpad: DPAD,
      buttons: [{ code: "Space", label: "INICIO" }],
    },
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
    controls: {
      dpad: {
        up: DPAD.up,
        down: { ...DPAD.down, repeat: true },
        left: { ...DPAD.left, repeat: true },
        right: { ...DPAD.right, repeat: true },
      },
      buttons: [
        { code: "Space", label: "CAÍDA" },
        { code: "KeyX", label: "GIRAR" },
      ],
    },
  },
};
