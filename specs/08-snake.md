# SPEC 08 — Snake jugable con leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-23
> **Objetivo:** Crear en TypeScript el Snake clásico con las frutas de `references/source-assets/snake-assets/` sobre el registro de motores y hacerlo jugable con leaderboard en `/games/snake/play`, reemplazando SERPENTINA.

## Alcance

**Dentro:**

- Fila `serpentina` de `public.games` reemplazada por migración: slug `snake`, title `SNAKE`, cover `cover-snake`, `short`/`long` nuevos, `saves_scores = true`. `cat` (`ARCADE`), `color` (`green`) y `sort_order` (3) sin cambios.
- Portada `.cover-snake` rediseñada en `app/globals.css` con `/frontend-design` (la clase ya existe y conserva el nombre).
- Ticker de `lib/home.ts`: `game: "Serpentina"` → `"Snake"`.
- Motor nuevo en `games/snake/` (no hay juego de referencia; solo assets), canvas 800×600, grilla 20×15 con celdas de 40 px (4:3, llena `.crt-screen`).
- Reglas clásicas: muros mortales, chocar con el propio cuerpo termina la partida, una fruta a la vez, la serpiente crece 1 segmento por fruta.
- Serpiente inicial de 3 segmentos mirando a la derecha, cabeza en la celda `(10, 7)`.
- Movimiento por ticks discretos. Tick inicial 140 ms; baja 10 ms por nivel hasta 60 ms (nivel 9 en adelante).
- Nivel `N = 1 + floor(frutas / 5)`, sin límite; el tick es `max(60, 140 − 10 × (N − 1))`.
- Puntuación: 10 por fruta (`score = frutas × 10`).
- Frutas: una aleatoria de las 22 del atlas (fila pixel-art de `fruits.png`), distinta de la anterior, en celda libre.
- Estado `ready`: serpiente quieta; la primera flecha/WASD (salvo `←`/`A`, que sería reversa) o `Espacio` la pone en marcha hacia la derecha o hacia la dirección pulsada. Pista `PULSA UNA FLECHA` en canvas.
- Input: `ArrowUp/Down/Left/Right` y `KeyW/A/S/D`. Cola de hasta 2 giros por tick; se descarta reversa de 180° respecto al último giro encolado.
- Fin por tablero lleno (300 celdas): `onGameOver(score)` como cualquier otra muerte.
- 2 temas: NEÓN (default, vectorial con glow) y CLÁSICO (tablero verde de damero, serpiente azul plana). Ambos usan las frutas del atlas. El botón ESTILO alterna sin reiniciar; no se persiste.
- Assets: `fruits.png` copiado a `public/games/snake/fruits.png`.
- HUD React: Puntuación, Vidas (fija en 1, se muestra `♥`) y Nivel del motor.
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.

**Fuera (specs futuras):**

- Sonido (los assets no incluyen audio).
- Récords locales y cualquier uso de localStorage.
- Menú propio, HUD y GAME OVER en canvas.
- Persistir el tema elegido.
- Controles táctiles / ratón.
- Fruta especial o bonus, obstáculos, modo wrap-around, varios modos de dificultad.
- Variantes de las otras dos filas del atlas (ilustradas y fotográficas).
- Redirect de `/games/serpentina`.

## Modelo de datos

```sql
-- supabase/migrations/20261023000200_snake.sql (solo datos)
update public.games
set slug = 'snake',
    title = 'SNAKE',
    short = 'Come fruta, crece y no choques contigo ni con el muro.',
    long = 'Guía la serpiente con ← ↑ → ↓ o W A S D. Cada fruta vale 10 puntos y la alarga; cada 5 frutas subes de nivel y la serpiente se acelera hasta el nivel 9. Chocar con un muro o con tu propio cuerpo termina la partida. Solo tienes una vida.',
    cover = 'cover-snake',
    saves_scores = true
where slug = 'serpentina';
```

```ts
// games/registry.ts (entrada nueva)
snake: {
  create: createSnake,
  width: 800,
  height: 600,
  themes: [
    { id: "neon", label: "NEÓN" },
    { id: "classic", label: "CLÁSICO" },
  ],
},
```

```ts
// games/snake/engine.ts
export type SnakeTheme = "neon" | "classic";
export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Mode = "ready" | "playing" | "gameover";
type Cell = { x: number; y: number }; // 0..19, 0..14
type Dir = "up" | "down" | "left" | "right";
type State = {
  mode: Mode;
  snake: Cell[]; // snake[0] = cabeza
  dir: Dir;
  queue: Dir[]; // máx. 2
  fruit: { cell: Cell; kind: FruitKind };
  eaten: number; // frutas comidas
  acc: number; // ms acumulados hacia el siguiente tick
};

// games/snake/config.ts
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 40,
  COLS: 20,
  ROWS: 15,
  START: { x: 10, y: 7, length: 3 },
  TICK_MS: { initial: 140, step: 10, min: 60 },
  FRUITS_PER_LEVEL: 5,
  POINTS_PER_FRUIT: 10,
  FRUIT_SIZE: 36, // lado mayor del sprite dentro de la celda
} as const;

// games/snake/sprites.ts — ATLAS de sprites.js, fila pixel-art (y = 136, h = 160)
export type FruitKind =
  "banana" | "orange" | /* … las 22 claves de sprites.js */ "melon";
export const FRUITS: Record<
  FruitKind,
  { x: number; y: number; w: number; h: number }
>;

// games/snake/entities.ts — utilidades puras, sin dibujo ni globals
// level(eaten), tickMs(level), isOpposite(a, b), step(snake, dir, grow) → Cell[],
// hitsWall(cell), hitsBody(snake, cell), spawnFruit(snake, prev?, rng?) → { cell, kind } | null

// games/snake/theme.ts
export type Palette = {
  bg: string;
  bgAlt: string; // segundo color del damero (CLÁSICO) o color de línea (NEÓN)
  snake: string;
  head: string;
  eye: string;
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};
export const PALETTES: Record<SnakeTheme, Palette>;
```

Convenciones:

- Canvas 800×600; el tablero ocupa todo el canvas (sin franja de HUD).
- `stats`: `{ score, lives: 1, level }`; `onStats` solo cuando cambia score o nivel (y al iniciar/reiniciar).
- Loop con `requestAnimationFrame`; `dt` en milisegundos con clamp 50. Solo en `playing`, `acc += dt` y se ejecutan ticks mientras `acc >= tickMs(level)`.
- Tick: toma el primer giro de `queue` (si lo hay), calcula la nueva cabeza; fuera del tablero → `gameover`. Colisión con el cuerpo: se compara contra todos los segmentos salvo la cola cuando no hay crecimiento (la cola se libera en ese mismo tick).
- Comer: `eaten++`, la cola se conserva (crece), `spawnFruit`. Si no queda celda libre, `gameover`.
- Muerte: `mode = "gameover"` y `onGameOver(score)` una sola vez.
- Dibujo de la fruta: `drawImage(img, sx, sy, sw, sh, …)` escalado para que el lado mayor mida `FRUIT_SIZE`, centrado en la celda. Mientras `fruits.png` no carga, círculo magenta del tamaño de la celda.
- NEÓN: fondo oscuro con líneas de grilla tenues, serpiente verde con `shadowBlur = glow` (reset a 0 tras dibujar), cabeza más clara con ojos.
- CLÁSICO: damero de dos verdes, serpiente azul plana con esquinas redondeadas, cabeza con ojos.
- Pista `PULSA UNA FLECHA` en `bold monospace`, color de la paleta; sin score, vidas ni GAME OVER en canvas.
- Input por `KeyboardEvent.code` sobre `window`; se ignora `event.repeat`. `preventDefault` solo en flechas y `Space`; nunca si `event.target` es `input`/`textarea` (ahí se ignora el evento entero). Las teclas WASD no necesitan `preventDefault`.
- En pausa o game over el motor no avanza ni procesa pulsaciones; al reanudar se vacía `queue`.
- `restart()`: score 0, nivel 1, serpiente inicial, `mode = "ready"`; conserva el tema.
- `destroy()` cancela rAF y quita todos los listeners.
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 3 y 6, leer en `node_modules/next/dist/docs/` lo relativo a Client Components, `cacheComponents` y `01-app/03-api-reference/03-file-conventions/public-folder.md`.

1. **Migración** (`.claude/skills/add-game/checklist.md` §1): `list_tables` + `list_migrations`; crear `supabase/migrations/20261023000200_snake.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos: `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso: `lib/home.ts` ticker `"Serpentina"` → `"Snake"`. `grep -rn -i "serpentina" app components lib games` vacío (salvo `database.types.ts` si aplica). `/games/snake` muestra el detalle con el juego simulado.
2. **Portada** (`checklist.md` §2): rediseñar `.cover-snake` (+ `::after`/`::before`) con `/frontend-design`, coherente con las demás portadas (gradientes CSS, sin imágenes). Verificar en `/games` y `/games/snake`.
3. **Asset**: copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`. Abrir `/games/snake/fruits.png` en `npm run dev` y comprobar 200.
4. Crear `games/snake/config.ts` y `games/snake/sprites.ts` (coordenadas de `sprites.js`, solo el bloque `fruits`, claves idénticas) (`.claude/skills/add-game/contract.md` § Reglas del motor).
5. Crear `games/snake/entities.ts` (utilidades puras de Modelo de datos) y `games/snake/theme.ts` (`PALETTES` y funciones de dibujo de tablero, serpiente, cabeza y fruta que reciben `ctx`, `Palette` e imagen opcional).
6. Crear `games/snake/engine.ts` (`contract.md` § Reglas del motor): `createSnake` con loop rAF, acumulador de ticks, modos `ready`/`playing`/`gameover`, input con cola, niveles, puntuación, carga de `fruits.png`, dibujo y `pause`/`resume`/`restart`/`setTheme`/`destroy`.
7. Registrar `snake` en `games/registry.ts` (800×600, NEÓN/CLÁSICO). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `snake` con `saves_scores = true`, `cat = ARCADE`, `color = green`, `sort_order = 3`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/serpentina` devuelve la 404 temática y `grep -rn -i "serpentina" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/snake` muestran card/detalle con la portada nueva y los textos nuevos; JUGAR AHORA navega a `/games/snake/play`.
- [ ] El canvas llena la pantalla del CRT y arranca en `ready`: serpiente de 3 segmentos quieta, una fruta visible y `PULSA UNA FLECHA`.
- [ ] La primera flecha o `W`/`S`/`D`/`Espacio` inicia el movimiento; `←`/`A` en `ready` no la inicia.
- [ ] Flechas y WASD giran la serpiente; una reversa de 180° se ignora; dos giros rápidos dentro de un mismo tick se aplican en ticks consecutivos.
- [ ] La página no hace scroll con flechas ni `Espacio`.
- [ ] Comer una fruta suma 10, alarga la serpiente 1 segmento y genera otra fruta distinta en una celda libre.
- [ ] Las frutas se dibujan con sprites de `fruits.png`, sin deformarse, y varían entre sí.
- [ ] El Nivel del HUD sube a 2 con la 5.ª fruta y la serpiente se mueve más rápido; no acelera más allá del nivel 9.
- [ ] Chocar con un muro o con el propio cuerpo abre el modal FIN DEL JUEGO con la puntuación real; mover la cabeza a la celda que ocupaba la cola en ese tick no mata.
- [ ] FIN abre el modal a mitad de partida.
- [ ] El HUD muestra `♥` (1 vida) en todo momento.
- [ ] El canvas no dibuja score, vidas, nivel ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA; en pausa las teclas no giran la serpiente.
- [ ] Escribir en el input del modal (incluido espacio y letras WASD) no afecta al juego.
- [ ] JUGAR DE NUEVO vuelve a `ready` con score 0, vidas 1, nivel 01.
- [ ] ESTILO alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops (la serpiente no se acelera) ni listeners.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=snake` con la fila; Mejor global y Partidas actualizados en `/games/snake`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids, Tetris y Arkanoid conservan sus temas y criterios de SPEC 04/06/07; los 4 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** reemplazar `serpentina` por `snake`. Misma temática; evita dos juegos de serpiente.
- **No:** fila nueva. Duplicaría el juego en el catálogo.
- **No:** redirect de `/games/serpentina`. Sin usuarios aún (criterio de SPEC 04).
- **Sí:** conservar `cat`, `color` y `sort_order`; el slug de la portada ya es `cover-snake`. Sin migración de enums.
- **Sí:** grilla 20×15 con celdas de 40 px. Encaja en 4:3 y deja el sprite de la fruta legible.
- **No:** grilla 40×30. Los sprites pixel-art pierden detalle a 20 px.
- **Sí:** muros mortales. Snake clásico; wrap-around va en otra spec si llega.
- **Sí:** `lives` fijo en 1, mostrado como `♥`. El juego no tiene vidas; el contrato exige un valor fijo.
- **Sí:** nivel cada 5 frutas con tick de 140 ms a 60 ms. Progresión visible sin hacerlo injugable.
- **Sí:** estado `ready` con pista en canvas. Excepción documentada al contrato (igual que SPEC 07): es parte del arranque, no HUD ni GAME OVER.
- **Sí:** cola de 2 giros y descarte de reversa. Evita morir por pulsar dos teclas dentro de un tick.
- **Sí:** fruta aleatoria de las 22, distinta de la anterior, siempre 10 puntos. Aprovecha todo el atlas sin añadir mecánicas.
- **No:** fruta bonus. Mecánica no clásica.
- **Sí:** temas NEÓN (default) y CLÁSICO; ambos usan las frutas del atlas. Encaja con la plataforma; no se persiste.
- **Sí:** solo la fila pixel-art del atlas (la que define `sprites.js`). Las otras dos filas quedan sin usar.
- **Sí:** asset en `public/games/snake/`. Servido estático por Next sin import.
- **No:** sonido. Los assets no incluyen audio; evita añadir capacidad al contrato.
- **Sí:** mantener CHECK de `score` ≤ 1.000.000. El máximo posible (297 frutas) son 2.970 puntos.

## Riesgos

| Riesgo                                                              | Mitigación                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `fruits.png` (3790×442) tarda en cargar                             | Fallback a círculo magenta hasta `onload`; la partida no depende de la carga.       |
| Giros perdidos o reversa fatal con pulsaciones rápidas              | Cola de 2 giros y comparación contra el último giro encolado.                       |
| Doble montaje (Strict Mode) duplica loops o listeners               | `destroy()` cancela rAF y quita listeners; criterio SALIR/volver.                   |
| `preventDefault` de `Espacio` o flechas rompe el input de iniciales | Ignorar targets `input`/`textarea`; motor detenido en game over.                    |
| Dimensiones de sprites del atlas desiguales (110–170 × 160)         | Escalar por lado mayor a `FRUIT_SIZE` conservando proporción y centrar en la celda. |
| Tablero casi lleno hace lento el `spawnFruit`                       | Elegir al azar entre las celdas libres calculadas; máximo 300 celdas.               |
| Tecla mantenida durante la pausa gira la serpiente al reanudar      | Vaciar `queue` al reanudar; ignorar `event.repeat`.                                 |

## Lo que **no** está en esta spec

- Sonido.
- Récords locales y localStorage.
- Menú propio, HUD y GAME OVER en canvas.
- Persistencia del tema.
- Controles táctiles o con ratón.
- Fruta bonus, obstáculos, wrap-around y modos de dificultad.
- Filas ilustrada y fotográfica del atlas.
- Redirect de `/games/serpentina`.

Cada uno, si llega, va en su propia spec.
