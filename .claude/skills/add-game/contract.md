# Contrato de motor y registro

Basado en SPEC 04 (`games/asteroids/`). Todo juego real cumple este contrato.

## Estructura

```
games/<slug>/
  engine.ts     # create<Nombre>(canvas, callbacks, theme?) → EngineHandle
  entities.ts   # entidades/utilidades, reciben ctx y Palette en draw()
  theme.ts      # PALETTES (opcional)
games/types.ts      # tipos comunes
games/registry.ts   # ENGINES por slug
components/game-canvas.tsx  # canvas client genérico
```

## `games/types.ts`

```ts
export type EngineStats = { score: number; lives: number; level: number };

export type EngineCallbacks = {
  onStats: (stats: EngineStats) => void; // solo cuando cambia algún valor
  onGameOver: (score: number) => void;
};

export type EngineHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
  setTheme?(theme: string): void;
};

export type EngineDef = {
  create(
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    theme?: string,
  ): EngineHandle;
  width: number;
  height: number;
  themes?: { id: string; label: string }[]; // el primero es el default
};
```

## `games/registry.ts`

```ts
import type { EngineDef } from "./types";

export const ENGINES: Record<string, EngineDef> = {
  // [games.slug]: { create, width, height, themes }
};
```

La clave es `games.slug`. Un slug ausente del registro = juego simulado (arena actual de `GamePlayer`).

## Reglas del motor

- TypeScript estricto, sin globals de módulo: el estado vive en el closure de `create*`.
- Port fiel de constantes y mecánicas de la referencia (tamaños, velocidades, puntos, tiempos).
- Loop con `requestAnimationFrame`; `dt` en segundos con clamp (0.05).
- `onStats` solo cuando cambia score/lives/level (no a 60 fps).
- Input por `KeyboardEvent.code` sobre `window`. `preventDefault` solo en teclas del juego (flechas, `Space`) y nunca si `event.target` es `input`/`textarea` (el modal tiene input de iniciales).
- En pausa o game over el motor no avanza ni consume input.
- `destroy()` cancela rAF y quita **todos** los listeners (Strict Mode monta dos veces; SALIR y volver no duplica loops).
- Sin HUD, GAME OVER, menús, récords ni sonido en canvas: la plataforma pone HUD React, modal FIN DEL JUEGO y guardado.
- Nada en localStorage/sessionStorage.
- Si el juego no tiene vidas, emitir `lives` fijo y acordar en la spec cómo se muestra.
- Canvas con resolución interna fija (`width`×`height`), escalado por CSS al 100% de `.crt-screen`.
- `P` y `Escape` pausan: lo gestiona `GamePlayer`, no el motor.

## Bootstrap (solo si `games/registry.ts` no existe)

1. Crear `games/types.ts` y `games/registry.ts` como arriba.
2. Adaptar `games/asteroids/engine.ts` al contrato: `AsteroidsStats`/`AsteroidsCallbacks`/`AsteroidsHandle` pasan a ser alias de los tipos comunes; registrar `asteroids` con `width: 800`, `height: 600`, `themes: [{ id: "neon", label: "NEÓN" }, { id: "classic", label: "CLÁSICO" }]` y `create: createAsteroids`.
3. Generalizar `components/asteroids-canvas.tsx` → `components/game-canvas.tsx`: recibe `engine: EngineDef` además de `paused`, `theme`, `restartKey`, `onStats`, `onGameOver`; mantiene el patrón de refs y los efectos de pausa/tema/reinicio; usa `engine.width/height` en el `<canvas>`. Eliminar `asteroids-canvas.tsx`.
4. En `components/game-player.tsx`: sustituir `isAsteroids`/`game.slug === "asteroids"` por `const engine = ENGINES[game.slug]`; `real` stats y `theme` inicial desde `engine.themes?.[0]?.id`; el botón ESTILO solo si `engine?.themes` (alterna entre los temas); `P`/`Escape` y desactivar el `setInterval` simulado cuando `engine` existe.
5. Verificar que asteroids y los juegos simulados se comportan igual que antes (criterios de SPEC 04).

## Añadir un juego (con registro ya creado)

1. Crear `games/<slug>/` según la estructura.
2. Añadir la entrada en `ENGINES`.
3. Sin cambios en `GamePlayer` ni `game-canvas.tsx`, salvo que el juego exija una capacidad nueva (se documenta en la spec).
