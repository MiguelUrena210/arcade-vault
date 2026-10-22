# SPEC 04 — Asteroids jugable en el reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-22
> **Objetivo:** Portar a TypeScript el Asteroids de `references/started-games/02 - asteroids/` y hacerlo jugable en `/games/asteroids/play`, reemplazando la entrada ROCAS del catálogo.

## Alcance

**Dentro:**

- Entrada `rocas` de `lib/games.ts` sobrescrita: id `asteroids`, title `ASTEROIDS`, cover `cover-asteroids`, `short`/`long` reescritos sin OVNIs (rotar, propulsar, disparar, grandes → medianos → pequeños, 3 vidas, niveles). `cat`, `color`, `best`, `plays` sin cambios.
- `.cover-rocas` (y sus `::before`/`::after`) renombrado a `.cover-asteroids` en `app/globals.css`.
- Ticker de `lib/home.ts`: `game: "Rocas"` → `"Asteroids"`.
- Motor portado a TS en `games/asteroids/` (raíz del repo), sin globals de módulo, con API imperativa `createAsteroids(...)`.
- Mecánicas idénticas a `game.js`: física, wrap toroidal, tamaños/velocidades/puntos (20/50/100), split, partículas, 3 vidas, invencibilidad 3s con parpadeo, respawn 2s, niveles con `3 + level` asteroides, `SAFE_DIST` 130, cooldown de disparo 0.2s, `dt` clamp 0.05.
- Canvas interno 800×600 dentro de `.crt-screen` (4:3), escalado por CSS al 100%.
- HUD React existente (Puntuación, Vidas, Nivel) alimentado por el motor; HUD y overlay GAME OVER dibujados en canvas eliminados.
- Botones PAUSA/REANUDAR, FIN, JUGAR DE NUEVO y overlay EN PAUSA controlan el motor. Teclas `P` y `Escape` alternan pausa.
- Game over (vidas = 0) o FIN abren el modal FIN DEL JUEGO existente con la puntuación real.
- Switch de estilo NEÓN / CLÁSICO: botón en `.hud-actions` (solo en asteroids), alterna en caliente sin reiniciar; arranca siempre en NEÓN; no se persiste.
- `GamePlayer` ramifica por `game.id === "asteroids"`; los otros 7 juegos siguen con la arena y el `setInterval` simulados.

**Fuera (specs futuras):**

- Controles táctiles / móvil.
- Power-ups y asteroides especiales (estrella fugaz) mencionados en el README de referencia (no existen en `game.js`).
- Sonido.
- Guardar puntuaciones en Supabase (GUARDAR PUNTUACIÓN sigue simulado).
- Registro genérico de motores (id → componente) y port de tetris/arkanoid.
- Persistir el estilo elegido.
- Redirect de `/games/rocas`.
- Auto-pausa al perder foco/visibilidad (el clamp de `dt` evita saltos).

## Modelo de datos

```ts
// games/asteroids/engine.ts
export type AsteroidsTheme = "neon" | "classic";
export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats: (stats: AsteroidsStats) => void; // solo cuando cambia algún valor
  onGameOver: (score: number) => void; // lives llega a 0
};

export type AsteroidsHandle = {
  pause(): void;
  resume(): void;
  restart(): void; // equivale a initGame()
  setTheme(theme: AsteroidsTheme): void;
  destroy(): void; // cancela rAF y quita listeners
};

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
  theme?: AsteroidsTheme, // default "neon"
): AsteroidsHandle;

// estado interno (no exportado)
type Phase = "playing" | "dead" | "gameover";
```

```ts
// games/asteroids/theme.ts
export type Palette = {
  bg: string;
  ship: string;
  flame: string;
  bullet: string;
  asteroid: string;
  particle: string;
  glow: number;
};
export const PALETTES: Record<AsteroidsTheme, Palette>;
// classic: todo #fff sobre #000, glow 0 (fiel a game.js)
// neon: nave var(--cyan) #00f5ff, asteroides magenta #ff006e, balas/partículas amarillo #f5ff00, glow vía shadowBlur
```

Convenciones:

- Entidades (`Ship`, `Bullet`, `Asteroid`, `Particle`) en `games/asteroids/entities.ts`; reciben `ctx` y `Palette` en `draw()` en lugar de usar globals.
- Constantes `W = 800`, `H = 600`, `RADII`, `SPEEDS`, `POINTS`, `BIG_SHAPE` con los mismos valores que `game.js`.
- Input por `KeyboardEvent.code` (`keys` + `justPressed`). `preventDefault` solo en flechas y `Space`, y nunca si `event.target` es `input`/`textarea` (el modal tiene input de iniciales).
- Mientras está en pausa o en gameover, el motor no avanza la simulación ni consume input.
- Números del HUD con `toLocaleString("es-ES")`, como hoy.
- Nada se escribe en localStorage.

## Plan de implementación

1. Renombrar en `lib/games.ts` (id, title, cover, short, long), `app/globals.css` (`.cover-rocas` → `.cover-asteroids`) y `lib/home.ts` (ticker). `grep -rn -i "rocas" app components lib` vacío. `npm run build` pasa; `/games/asteroids` muestra el detalle.
2. Crear `games/asteroids/theme.ts` con `PALETTES`.
3. Crear `games/asteroids/entities.ts` portando `Bullet`, `Asteroid`, `Particle`, `Ship` y utilidades (`wrap`, `dist`, `rand`, `randInt`) tipadas.
4. Crear `games/asteroids/engine.ts` con `createAsteroids`: loop rAF, máquina de estados, colisiones, niveles, input y callbacks. Sin dibujar HUD ni overlay.
5. Crear `components/asteroids-canvas.tsx` (client): `<canvas width={800} height={600}>` a tamaño completo de `.crt-screen`; crea el motor en `useEffect` y llama `destroy()` en cleanup; expone el handle por `ref`/props (`paused`, `theme`, `onStats`, `onGameOver`, señal de reinicio).
6. Modificar `components/game-player.tsx`: si `game.id === "asteroids"` renderiza `<AsteroidsCanvas>` en lugar de `.game-arena`, desactiva el `setInterval` simulado, toma score/lives/level del motor, PAUSA/FIN/JUGAR DE NUEVO llaman al motor, listener de `P`/`Escape` para pausa, botón NEÓN/CLÁSICO en `.hud-actions`. Resto de juegos sin cambios.
7. `npm run lint` y `npm run build` pasan; verificación manual de los criterios.

Antes de los pasos 5 y 6, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `cacheComponents`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `grep -rn -i "rocas" app components lib` no devuelve resultados.
- [ ] `/games` muestra la card ASTEROIDS con la portada de la antigua ROCAS; `/games/rocas` devuelve la 404 temática.
- [ ] `/games/asteroids` muestra título ASTEROIDS y descripción sin mención a OVNIs; JUGAR AHORA navega a `/games/asteroids/play`.
- [ ] En `/games/asteroids/play` el canvas ocupa la pantalla del CRT y el juego arranca con 4 asteroides grandes y la nave en el centro parpadeando.
- [ ] `←`/`→` rotan, `↑` propulsa con llama, `Espacio` dispara una bala por pulsación; la página no hace scroll con estas teclas.
- [ ] Destruir asteroides grande/mediano/pequeño suma 20/50/100 en el HUD React (Puntuación).
- [ ] Al chocar se pierde una vida en el HUD (♥), la nave reaparece a los 2s con invencibilidad.
- [ ] Limpiar todos los asteroides sube Nivel en el HUD y genera `3 + nivel` asteroides.
- [ ] El canvas no dibuja SCORE, NIVEL, vidas ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan el juego y muestran EN PAUSA; REANUDAR (o la misma tecla) continúa.
- [ ] Al perder la 3.ª vida aparece el modal FIN DEL JUEGO con la puntuación real; FIN lo abre también a mitad de partida.
- [ ] En el modal se puede escribir en el input (incluido espacio) sin que el juego reaccione.
- [ ] JUGAR DE NUEVO reinicia score 0, 3 vidas, nivel 01 y nuevos asteroides.
- [ ] El botón de estilo alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] Al pulsar SALIR y volver, no hay dos loops (sin aceleración) ni listeners duplicados.
- [ ] `/games/caida/play` y el resto de juegos siguen con la arena simulada y sin botón de estilo.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** sobrescribir `rocas` con `asteroids` (id, title, cover, ticker). Identificación directa con el juego real.
- **No:** nueva entrada en `GAMES`. Duplicaría el mismo juego.
- **No:** redirect desde `/games/rocas`. Sin usuarios aún (mismo criterio que SPEC 02).
- **Sí:** reescribir `short`/`long` sin OVNIs. El texto debe describir lo jugable.
- **Sí:** port a TS en `games/asteroids/` en la raíz. Tipado, sin globals, no choca con `lib/games.ts`.
- **No:** copiar `game.js` casi literal. Globals y listeners sin limpieza.
- **Sí:** API imperativa `createAsteroids` + `destroy()`. Motor independiente de React; un solo loop por montaje.
- **Sí:** HUD React + modal existente. Una sola UI de estado en toda la plataforma.
- **No:** HUD/GAME OVER en canvas. Duplica el HUD de la plataforma.
- **Sí:** branch por id en `GamePlayer`. Mínimo cambio.
- **No:** registro de motores. Prematuro con un solo juego real.
- **Sí:** switch NEÓN / CLÁSICO en el HUD, default NEÓN, sin persistir. Pedido explícito; respeta "nada en localStorage".
- **Sí:** `P`/`Escape` pausan. Estándar en arcade web.
- **No:** reiniciar con `Espacio` en gameover. El reinicio va por el modal.
- **Sí:** solo teclado. Táctil en otra spec.
- **Sí:** guardar puntuación sigue simulado. Persistencia depende de tablas y auth (specs futuras).

## Riesgos

| Riesgo                                                                 | Mitigación                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Doble montaje en dev (Strict Mode) crea dos loops/listeners            | `destroy()` cancela rAF y quita listeners; criterio de aceptación de SALIR/volver. |
| `preventDefault` de `Espacio` rompe el input de iniciales              | Ignorar eventos cuyo `target` sea `input`/`textarea`; motor detenido en gameover.  |
| `onStats` en cada frame provoca re-render a 60 fps                     | Llamar solo cuando cambia score/lives/level.                                       |
| Canvas escalado por CSS se ve borroso                                  | Resolución interna fija 800×600 (igual a la referencia, mismo 4:3 del CRT).        |
| `shadowBlur` del tema neón penaliza rendimiento                        | Glow solo en trazos principales; partículas sin blur si cae el frame rate.         |
| Pseudo-elementos de `.crt-screen` (scanlines) tapan o capturan eventos | Input es por `window`, no por el canvas; verificar visualmente.                    |

## Lo que **no** está en esta spec

- Controles táctiles.
- Power-ups y asteroides especiales.
- Sonido.
- Puntuaciones en Supabase.
- Registro de motores y otros juegos reales.
- Persistencia del estilo.
- Redirect de `/games/rocas`.

Cada uno, si llega, va en su propia spec.
