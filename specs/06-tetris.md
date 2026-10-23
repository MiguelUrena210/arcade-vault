# SPEC 06 — Tetris jugable con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-23
> **Objetivo:** Portar a TypeScript el Tetris de `references/started-games/03 - tetris/` sobre un registro genérico de motores y hacerlo jugable con leaderboard en `/games/tetris/play`, reemplazando CAÍDA.

## Alcance

**Dentro:**

- Bootstrap del registro de motores (`games/types.ts`, `games/registry.ts`, `components/game-canvas.tsx`) y adaptación de asteroids al contrato.
- Fila `caida` de `public.games` reemplazada por migración: slug `tetris`, title `TETRIS`, cover `cover-tetris`, `short`/`long` nuevos, `saves_scores = true`. `cat` (`PUZZLE`), `color` (`magenta`) y `sort_order` (2) sin cambios.
- Portada nueva `.cover-tetris` en `app/globals.css` diseñada con `/frontend-design`; se elimina `.cover-tetro`.
- Ticker de `lib/home.ts`: `game: "Caída"` → `"Tetris"`.
- Motor portado en `games/tetris/` con mecánicas idénticas a `game.js`: tablero 10×20, 7 piezas estándar (I, O, T, S, Z, J, L), rotación horaria `rotateCW` + wall kicks `[0, -1, 1, -2, 2]`, ghost piece (alpha 0.2), vista NEXT, soft drop (+1/fila), hard drop (+2/celda), `LINE_SCORES = [0, 100, 300, 500, 800] × nivel`, nivel `floor(lines / 10) + 1`, `dropInterval = max(100, 1000 - (level - 1) * 90)` ms, game over si la pieza nueva colisiona al aparecer.
- Canvas interno 800×600 dentro de `.crt-screen`: pozo 300×600 (`BLOCK = 30`) centrado horizontalmente y caja NEXT 120×120 a su derecha.
- 4 temas portados de `skins.js`: NEÓN (default), RETRO, PASTEL, PIXEL. El botón ESTILO los recorre en ciclo sin reiniciar; no se persiste.
- HUD React: Puntuación y Nivel del motor; Vidas fijo en 1 (`♥`).
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.
- La partida arranca al entrar en `/games/tetris/play`.

**Fuera (specs futuras):**

- 8.ª pieza (anillo 3×3) de la referencia.
- Récords locales (`records.js`, `localStorage['tetris.records']`), mejor combo y líneas máximas.
- Pantalla de inicio propia y menú de pausa propio (`pause-menu.js`).
- Nivel inicial configurable (1–10).
- Toggle claro/oscuro de la referencia.
- Contador de LÍNEAS en el HUD.
- HUD y GAME OVER en canvas.
- Sonido.
- Controles táctiles / móvil.
- Persistir el tema elegido.
- Ampliar el CHECK de `score` por encima de 1.000.000.
- Redirect de `/games/caida`.

## Modelo de datos

```sql
-- supabase/migrations/20261023000000_tetris.sql (solo datos)
update public.games
set slug = 'tetris',
    title = 'TETRIS',
    short = 'Encaja las piezas y limpia líneas antes de que el pozo se llene.',
    long = 'Siete piezas caen sobre un pozo de 10×20. Muévelas, rótalas y suéltalas de golpe para completar líneas: 1, 2, 3 o 4 a la vez valen 100, 300, 500 u 800 puntos por nivel. Cada 10 líneas sube el nivel y la caída se acelera. La pieza fantasma marca dónde aterrizará y la siguiente se ve antes de llegar.',
    cover = 'cover-tetris',
    saves_scores = true
where slug = 'caida';
```

```ts
// games/types.ts (bootstrap, según contract.md)
export type EngineStats = { score: number; lives: number; level: number };
export type EngineCallbacks = {
  onStats: (stats: EngineStats) => void;
  onGameOver: (score: number) => void;
};
export type EngineHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
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

// games/registry.ts
export const ENGINES: Record<string, EngineDef> = {
  asteroids: {
    create: createAsteroids,
    width: 800,
    height: 600,
    themes: [/* NEÓN, CLÁSICO */],
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
    ],
  },
};
```

```ts
// games/tetris/engine.ts
export type TetrisTheme = "neon" | "retro" | "pastel" | "pixel";
export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Piece = { type: number; shape: number[][]; x: number; y: number };
type Board = number[][]; // ROWS × COLS; 0 vacío, 1–7 tipo de pieza

// games/tetris/pieces.ts
export const COLS = 10,
  ROWS = 20,
  BLOCK = 30;
export const PIECES: (number[][] | null)[]; // índice 0 null, 1–7 = I, O, T, S, Z, J, L (matrices de game.js)
export const LINE_SCORES = [0, 100, 300, 500, 800];
// utilidades puras: createBoard, randomPiece, collide, rotateCW, clearLines, ghostY

// games/tetris/theme.ts
export type Skin = {
  label: string;
  colors: string[]; // [unused, I, O, T, S, Z, J, L] de skins.js (sin el color 8)
  background: string; // null de la referencia → "#000"
  grid: string; // null de la referencia → "rgba(255,255,255,0.06)"
  drawBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    color: string,
    alpha: number,
  ): void;
};
export const SKINS: Record<TetrisTheme, Skin>;
```

Convenciones:

- Layout del canvas 800×600: pozo en `x = 250..550`, `y = 0..600`; caja NEXT 120×120 en `x = 580`, `y = 30`, con marco y rótulo `NEXT`. No se dibujan score, líneas, nivel, controles ni GAME OVER.
- `stats`: `{ score, lives: 1, level }`; `onStats` solo cuando cambia score o level.
- `dt` acumulado en ms con clamp de 50 ms por frame; al reanudar, `dropAccum = 0` (como `togglePause` de la referencia).
- Input por `KeyboardEvent.code`: `ArrowLeft`/`ArrowRight` mover, `ArrowUp`/`KeyX` rotar, `ArrowDown` soft drop, `Space` hard drop. `preventDefault` solo en flechas y `Space`, nunca si `event.target` es `input`/`textarea`. Auto-repeat del teclado permitido (como la referencia).
- En pausa o game over el motor no avanza ni consume input.
- Skins con `shadowBlur` lo resetean a 0 tras dibujar.
- Números del HUD con `toLocaleString("es-ES")`.
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 1 y 7, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `cacheComponents`.

1. **Bootstrap del registro** (`.claude/skills/add-game/contract.md` § Bootstrap): crear `games/types.ts` y `games/registry.ts`; adaptar `games/asteroids/engine.ts` (alias a tipos comunes) y registrarlo; generalizar `components/asteroids-canvas.tsx` → `components/game-canvas.tsx` (prop `engine: EngineDef`) y eliminar el antiguo; en `components/game-player.tsx` sustituir `isAsteroids` por `const engine = ENGINES[game.slug]`, tema inicial `engine.themes?.[0]?.id`, botón ESTILO solo si `engine?.themes` y recorriendo la lista en ciclo con su `label`. `npm run build` pasa; asteroids y simulados igual que en SPEC 04/05.
2. **Migración** (`.claude/skills/add-game/checklist.md` §1): `list_tables` + `list_migrations`; crear `supabase/migrations/20261023000000_tetris.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos: `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso, `lib/home.ts` ticker `"Caída"` → `"Tetris"` y `.cover-tetro` → `.cover-tetris` provisional en `app/globals.css`. `grep -rn -i "caida\|caída\|cover-tetro" app components lib games` vacío (salvo `database.types.ts` si aplica). Build pasa; `/games/tetris` muestra el detalle con el juego simulado (sin entrada en registro aún).
3. **Portada** (`checklist.md` §2): rediseñar `.cover-tetris` (+ `::before`/`::after`) con `/frontend-design`, coherente con las demás portadas (gradientes CSS, sin imágenes). Verificar en `/games` y `/games/tetris`.
4. Crear `games/tetris/pieces.ts`: constantes y utilidades puras portadas de `game.js` (sin la pieza 8).
5. Crear `games/tetris/theme.ts`: `SKINS` portadas de `skins.js` (colores 1–7, `drawBlock` y `roundRectPath`), con `background`/`grid` resueltos para fondo negro.
6. Crear `games/tetris/engine.ts` (`contract.md` § Reglas del motor): `createTetris` con loop rAF, caída por `dropInterval`, `lockPiece` → `merge` → `clearLines` → `spawn`, puntuación/nivel, input, dibujo de pozo + grid + ghost + pieza + caja NEXT, `pause`/`resume`/`restart`/`setTheme`/`destroy`.
7. Registrar `tetris` en `games/registry.ts` (800×600, 4 temas). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `tetris` con `saves_scores = true`, `cat = PUZZLE`, `color = magenta`, `sort_order = 2`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/caida` devuelve la 404 temática y `grep -rn -i "caida\|caída\|cover-tetro" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/tetris` muestran card/detalle con la portada nueva y los textos nuevos; JUGAR AHORA navega a `/games/tetris/play`.
- [ ] El canvas llena la pantalla del CRT: pozo 10×20 centrado con grid y caja NEXT a la derecha; la partida arranca al entrar.
- [ ] Solo aparecen las 7 piezas estándar; la NEXT coincide con la siguiente pieza que entra.
- [ ] `←`/`→` mueven, `↑` y `X` rotan con wall kick junto a la pared, `↓` baja una fila (+1), `Espacio` cae al fondo (+2 por celda); la página no hace scroll con estas teclas.
- [ ] La pieza fantasma marca la posición de aterrizaje.
- [ ] Limpiar 1/2/3/4 líneas en nivel 1 suma 100/300/500/800 en Puntuación.
- [ ] A las 10 líneas Nivel pasa a 02 y la caída se acelera.
- [ ] Vidas muestra `♥` durante toda la partida.
- [ ] El canvas no dibuja score, líneas, nivel ni GAME OVER.
- [ ] Cuando la pieza nueva no cabe, se abre el modal FIN DEL JUEGO con la puntuación real; FIN también lo abre a mitad de partida.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA; en pausa las flechas no mueven la pieza.
- [ ] Escribir en el input del modal (incluido espacio) no afecta al juego.
- [ ] JUGAR DE NUEVO reinicia tablero vacío, score 0, nivel 01.
- [ ] ESTILO recorre NEÓN → RETRO → PASTEL → PIXEL → NEÓN sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops (la caída no se acelera) ni listeners.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=tetris` con la fila; Mejor global y Partidas actualizados en `/games/tetris`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids conserva NEÓN/CLÁSICO y sus criterios de SPEC 04; los 6 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** reemplazar `caida` por `tetris`. Misma temática; evita dos juegos de bloques.
- **No:** fila nueva. Duplicaría el juego en el catálogo.
- **No:** redirect de `/games/caida`. Sin usuarios aún (criterio de SPEC 04).
- **Sí:** conservar `cat`, `color` y `sort_order`. Sin migración de enums.
- **Sí:** portada nueva con `/frontend-design`. Pedido explícito.
- **Sí:** bootstrap del registro de motores en esta spec. Segundo juego real; el contrato lo exige.
- **Sí:** `lives` fijo en 1 (`♥`). Sin cambios en `GamePlayer`.
- **No:** casilla LÍNEAS ni ocultar Vidas. Exigiría nueva capacidad del contrato.
- **Sí:** canvas 800×600 con pozo centrado y NEXT en canvas. Encaja en el 4:3 del CRT; NEXT es parte del juego, no HUD.
- **No:** NEXT en el HUD React. Nueva capacidad del contrato.
- **Sí:** 4 skins como temas, default NEÓN, sin persistir. Pedido explícito; respeta "nada en localStorage".
- **No:** 8.ª pieza (anillo). Decisión del usuario: solo las 7 estándar.
- **No:** récords locales, pantalla de inicio, menú de pausa propio, nivel inicial, toggle claro/oscuro, sonido, táctil. La plataforma cubre pausa, fin y ranking.
- **Sí:** arranque inmediato al entrar. Igual que asteroids.
- **Sí:** mantener CHECK de `score` ≤ 1.000.000. Solo datos en la migración.
- **Sí:** rotación no SRS con kicks `[0, -1, 1, -2, 2]`. Port fiel.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Score > 1.000.000 en partidas muy largas                                | `saveScore` y el CHECK lo rechazan con error en el modal; ampliación en otra spec si ocurre. |
| Bootstrap rompe asteroids                                               | Paso 1 aislado y verificado con los criterios de SPEC 04 antes de añadir tetris.             |
| Doble montaje (Strict Mode) duplica loops o listeners                   | `destroy()` cancela rAF y quita listeners; criterio SALIR/volver.                            |
| `preventDefault` de `Espacio` rompe el input de iniciales               | Ignorar targets `input`/`textarea`; motor detenido en game over.                             |
| `shadowBlur` del skin NEÓN penaliza rendimiento (200 celdas)            | Resetear a 0 tras cada bloque; verificar fluidez en nivel alto.                              |
| Skins pensadas para fondo claro (PASTEL) se ven mal sobre negro del CRT | `background`/`grid` fijados en `theme.ts`; revisión visual de los 4 temas.                   |
| Auto-repeat de `↓` suma puntos de soft drop rápidamente                 | Comportamiento fiel a la referencia; aceptado.                                               |

## Lo que **no** está en esta spec

- 8.ª pieza (anillo).
- Récords locales, combo y líneas máximas.
- Pantalla de inicio y menú de pausa propios.
- Nivel inicial configurable.
- Toggle claro/oscuro.
- Contador de líneas en el HUD.
- Sonido.
- Controles táctiles.
- Persistencia del tema.
- Ampliar el límite de score.
- Redirect de `/games/caida`.

Cada uno, si llega, va en su propia spec.
