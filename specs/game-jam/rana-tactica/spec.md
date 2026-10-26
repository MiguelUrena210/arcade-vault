# JAM Frogger — RANA TÁCTICA jugable con leaderboard

> **Estado:** Descartada
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-26
> **Tema:** Frogger — una rana intenta cruzar una autopista sin ser aplastada por los vehículos.
> **Objetivo:** Crear un Frogger por turnos en `games/rana-tactica/`, donde el tráfico solo avanza cuando la rana actúa y se puntúa la eficiencia de pasos, jugable con leaderboard en `/games/rana-tactica/play`, reemplazando RANARIA.

## Alcance

**Dentro:**

- Fila `ranaria` de `public.games` reemplazada por migración: slug `rana-tactica`, title `RANA TÁCTICA`, cat `PUZZLE`, cover `cover-rana-tactica`, `short`/`long` nuevos, `saves_scores = true`. `color` (`green`) y `sort_order` (7) sin cambios.
- Portada: la clase `.cover-rana` de `app/globals.css` se renombra a `.cover-rana-tactica` y se rediseña con `/frontend-design` (grilla de carriles con flechas de turno y una rana en una celda).
- Ticker de `lib/home.ts`: `game: "Ranaria"` → `"Rana Táctica"`.
- Motor nuevo en `games/rana-tactica/` (sin juego de referencia ni assets; todo vectorial), canvas 800×600, grilla 16×12 con celdas de 50 px.
- Tablero: fila 11 = acera de salida, fila 0 = acera de meta, filas 1–10 = carriles. En los niveles 1–6 la fila 6 es mediana segura.
- Rana inicial en la celda `(7, 11)`.
- **Turnos:** el mundo no avanza con el tiempo. Cada acción de la rana es un turno: saltar una celda (`↑ ↓ ← →` / `W A S D`) o esperar (`Espacio`). Tras la acción, todos los vehículos avanzan según su carril.
- Carriles: dirección alterna por fila (fila 10 hacia la derecha), toroidales (el vehículo que sale por un borde entra por el otro). Tres ritmos: `slow` (1 celda cada 2 turnos, en turnos pares), `normal` (1 celda/turno) y `fast` (2 celdas/turno).
- Vehículos: coche (1 celda) y camión (2 o 3 celdas). Todos los de un carril comparten ritmo.
- Telegrafía: cada carril muestra chevrones de dirección y ritmo en su borde, y los vehículos que se moverán en el siguiente turno dibujan un fantasma tenue en su posición futura. El puzzle es de información completa.
- Colisión determinista: la rana se mueve primero; si su celda destino está ocupada, muere. Después los vehículos avanzan celda a celda; si alguno pisa o atraviesa la celda de la rana, muere.
- Niveles generados con PRNG con semilla fija por nivel (`mulberry32(SEED_BASE + nivel)`): todos los jugadores ven los mismos niveles. El generador valida con BFS que el nivel es resoluble y calcula su **par** (mínimo de turnos); si no es resoluble en `MAX_PAR` turnos, reintenta con la semilla siguiente.
- Dificultad por nivel: más carriles activos, mayor densidad, ritmos `slow`/`fast` y camiones a partir de ciertos niveles; sin mediana desde el nivel 7. Se estabiliza en el nivel 12.
- Puntuación por nivel completado: `100 × min(nivel, 20)` + bonus de eficiencia `max(0, 500 − 50 × (turnos − par))`. Los turnos del nivel se acumulan entre muertes.
- Vidas: 3 al empezar; +1 cada 5 niveles completados (máx. 5). Morir resta una vida y reinicia el nivel (tráfico al turno 0, rana a la salida); sin vidas, `onGameOver(score)`.
- Estado `ready` al inicio de cada nivel: tráfico quieto y pista en canvas `PAR <n> · PULSA UNA FLECHA`. La primera flecha/WASD cierra la pista y ejecuta ese salto como turno 1; `Espacio` solo cierra la pista.
- Animación puramente visual: tween de 110 ms por turno; durante el tween se almacena como máximo 1 acción en búfer. Muerte: 500 ms (`dying`) con aplastamiento vectorial. Meta: 500 ms (`cleared`) con destello de la fila 0.
- 2 temas: NEÓN (default, contornos con glow sobre fondo oscuro) y CLÁSICO (asfalto gris, líneas blancas discontinuas, rana verde, coches de colores planos). ESTILO alterna sin reiniciar; no se persiste.
- HUD React: Puntuación, Vidas y Nivel del motor.
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.

**Fuera (specs futuras):**

- Sonido.
- Deshacer turno.
- Río, troncos, tortugas y nenúfares.
- Contador de turnos o par visibles durante la partida (solo en `ready`).
- Editor de niveles o niveles diseñados a mano.
- Récords locales, localStorage y persistencia del tema.
- Controles táctiles o con ratón.
- Redirect de `/games/ranaria`.

## Modelo de datos

```sql
-- supabase/migrations/20261026000000_rana_tactica.sql (solo datos)
update public.games
set slug = 'rana-tactica',
    title = 'RANA TÁCTICA',
    cat = 'PUZZLE',
    short = 'El tráfico solo avanza cuando saltas. Planea la ruta y cruza con los mínimos pasos.',
    long = 'Por turnos: los coches solo se mueven cuando la rana salta (← ↑ → ↓ o W A S D) o espera (Espacio). Lee la dirección y el ritmo de cada carril y llega a la acera de enfrente. Cada nivel tiene un par de pasos: igualarlo da el bonus completo y cada paso extra lo reduce. Los niveles son iguales para todos. Tienes 3 vidas y ganas una cada 5 niveles.',
    cover = 'cover-rana-tactica',
    saves_scores = true
where slug = 'ranaria';
```

```ts
// games/registry.ts (entrada nueva)
"rana-tactica": {
  create: createRanaTactica,
  width: 800,
  height: 600,
  themes: [
    { id: "neon", label: "NEÓN" },
    { id: "classic", label: "CLÁSICO" },
  ],
},
```

```ts
// games/rana-tactica/engine.ts
export type RanaTheme = "neon" | "classic";
export function createRanaTactica(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Mode = "ready" | "playing" | "dying" | "cleared" | "gameover";
type Cell = { x: number; y: number }; // 0..15, 0..11
type Action = "up" | "down" | "left" | "right" | "wait";
type State = {
  mode: Mode;
  level: number;
  layout: LevelLayout; // generado al entrar en el nivel
  turn: number; // turno del tráfico desde el último reinicio del nivel
  movesInLevel: number; // turnos usados en el nivel, acumulados entre muertes
  frog: Cell;
  prevFrog: Cell; // origen del tween
  tween: number; // ms restantes de animación del turno
  buffered: Action | null; // máx. 1
  timer: number; // ms restantes de dying/cleared
  score: number;
  lives: number;
  cleared: number; // niveles completados
};

// games/rana-tactica/config.ts
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 50,
  COLS: 16,
  ROWS: 12,
  START: { x: 7, y: 11 },
  GOAL_ROW: 0,
  MEDIAN_ROW: 6,
  MEDIAN_UNTIL_LEVEL: 6,
  SEED_BASE: 0x0f2066,
  MAX_PAR: 60, // límite de la BFS; si no resuelve, semilla + 1000
  MAX_REGEN: 20,
  DIFFICULTY_CAP_LEVEL: 12,
  LIVES: { start: 3, every: 5, max: 5 },
  POINTS: { perLevel: 100, levelCap: 20, bonus: 500, penalty: 50 },
  TWEEN_MS: 110,
  DYING_MS: 500,
  CLEARED_MS: 500,
} as const;

// games/rana-tactica/levels.ts — generación y validación, puras
export type Pace = "slow" | "normal" | "fast";
export type Lane = {
  row: number; // 1..10
  dir: 1 | -1;
  pace: Pace;
  vehicles: { x: number; len: 1 | 2 | 3 }[]; // x en turno 0
};
export type LevelLayout = {
  level: number;
  seed: number;
  lanes: Lane[];
  median: boolean;
  par: number;
};
// mulberry32(seed) → () => number
// difficulty(level) → { activeLanes, density, paces: Pace[], trucks: boolean }
// generateLevel(level) → LevelLayout  (reintenta hasta MAX_REGEN; último recurso: quita el carril más denso)
// solve(lanes) → number | null  (BFS sobre (x, y, turn mod 32); devuelve el par)

// games/rana-tactica/entities.ts — utilidades puras, sin dibujo ni globals
// laneOffset(lane, turn) → number, occupied(lanes, turn) → Set<number> (índice y·16+x),
// applyAction(frog, action) → Cell (clamp a la grilla), resolveTurn(lanes, turn, frog, action)
//   → { frog, dead: boolean, reachedGoal: boolean }, levelScore(level, moves, par) → number,
// livesAfterClear(lives, cleared) → number

// games/rana-tactica/theme.ts
export type Palette = {
  bg: string;
  lane: string;
  laneLine: string;
  sidewalk: string;
  frog: string;
  frogEye: string;
  car: string[]; // por índice de carril
  truck: string;
  ghost: string; // fantasma del turno siguiente (con alpha)
  chevron: string;
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};
export const PALETTES: Record<RanaTheme, Palette>;
```

Tabla de dificultad (`difficulty(level)`, con `L = min(level, 12)`):

| Nivel | Carriles activos | Densidad                             | Ritmos                   | Camiones | Mediana |
| ----- | ---------------- | ------------------------------------ | ------------------------ | -------- | ------- |
| 1–2   | `3 + L`          | 0.25                                 | `normal`                 | No       | Sí      |
| 3–4   | `3 + L`          | 0.25–0.31                            | `normal`, `slow`         | Desde 4  | Sí      |
| 5–6   | 9                | 0.34–0.37                            | `slow`, `normal`, `fast` | Sí       | Sí      |
| 7–12+ | 10               | `0.25 + 0.025 × (L − 1)` hasta 0.525 | los tres                 | Sí       | No      |

Convenciones:

- Canvas 800×600; el tablero ocupa todo el canvas (sin franja de HUD).
- `stats`: `{ score, lives, level }`; `onStats` solo cuando cambia alguno (y al iniciar/reiniciar).
- Loop con `requestAnimationFrame`; `dt` en milisegundos con clamp 50. El `dt` solo consume `tween`, `timer` de `dying`/`cleared` y la animación de chevrones; la lógica del juego avanza por turnos, nunca por tiempo.
- Turno: `resolveTurn` aplica la acción (salto con clamp a la grilla; un salto contra el borde cuenta como espera), comprueba la celda destino contra la ocupación actual, incrementa `turn` y avanza cada carril celda a celda (`fast` comprueba las 2 celdas recorridas). `movesInLevel++` siempre.
- Posición de un vehículo: `x0 + dir × offset(turn)`, módulo 16; `offset` = `turn` (`normal`), `2 × turn` (`fast`), `floor(turn / 2)` (`slow`). Periodo global ≤ 32, de ahí el `turn mod 32` de la BFS.
- Meta: la rana llega a la fila 0 → `score += levelScore(level, movesInLevel, par)`, `cleared++`, `lives = livesAfterClear(...)`, modo `cleared`; al terminar el timer, `level++`, `generateLevel`, modo `ready`.
- Muerte: modo `dying`; al terminar, `lives--`. Con vidas: rana a `START`, `turn = 0`, modo `playing` (sin `ready`, el par ya se mostró). Sin vidas: `mode = "gameover"` y `onGameOver(score)` una sola vez.
- Score entero, clamp a 1.000.000.
- Pista `PAR <n> · PULSA UNA FLECHA` centrada en `bold monospace`, color `text` de la paleta; sin score, vidas, nivel ni GAME OVER en canvas.
- Input por `KeyboardEvent.code` sobre `window`: `ArrowUp/Down/Left/Right`, `KeyW/A/S/D`, `Space`. Se ignora `event.repeat` (un turno por pulsación). `preventDefault` solo en flechas y `Space`; nunca si `event.target` es `input`/`textarea` (ahí se ignora el evento entero).
- Durante `tween > 0` la acción va a `buffered` (sustituye la anterior); se ejecuta al acabar el tween. En `dying`/`cleared` se descarta el input.
- En pausa o game over el motor no avanza ni procesa pulsaciones; al reanudar se vacía `buffered`.
- `restart()`: score 0, vidas 3, nivel 1, `cleared = 0`, layout del nivel 1, `mode = "ready"`; conserva el tema.
- `setTheme(id)` solo cambia la paleta.
- `destroy()` cancela rAF y quita todos los listeners.
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 3 y 6, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `cacheComponents` (no se tocan, pero el motor se monta desde `GameCanvas`, que es Client Component).

1. **Migración** (`.claude/skills/add-game/checklist.md` §1): `list_tables` + `list_migrations`; crear `supabase/migrations/20261026000000_rana_tactica.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos (el enum `PUZZLE` ya existe): `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso: `lib/home.ts` ticker `"Ranaria"` → `"Rana Táctica"`, y renombrar `.cover-rana` → `.cover-rana-tactica` en `app/globals.css` para que la card no quede sin portada. `grep -rn -i "ranaria\|cover-rana\b" app components lib games` vacío. `/games/rana-tactica` muestra el detalle con el juego simulado.
2. **Portada** (`checklist.md` §2): rediseñar `.cover-rana-tactica` (+ `::before`/`::after`) con `/frontend-design`: carriles con chevrones y una rana verde en una celda de una grilla tenue, gradientes CSS sin imágenes. Verificar en `/games` y `/games/rana-tactica`.
3. Crear `games/rana-tactica/config.ts` y `games/rana-tactica/entities.ts` (utilidades puras de Modelo de datos) (`.claude/skills/add-game/contract.md` § Reglas del motor).
4. Crear `games/rana-tactica/levels.ts`: `mulberry32`, `difficulty`, `generateLevel` y `solve` (BFS). Comprobar en una ejecución local de prueba (sin commitear scripts) que los niveles 1–30 generan layout resoluble con `par ≥ 11`.
5. Crear `games/rana-tactica/theme.ts`: `PALETTES` y funciones de dibujo (tablero, carriles con chevrones, vehículos, fantasmas, rana, aplastamiento, destello de meta, pista) que reciben `ctx` y `Palette`.
6. Crear `games/rana-tactica/engine.ts` (`contract.md` § Reglas del motor): `createRanaTactica` con loop rAF, modos, turnos, búfer, tween, puntuación, vidas, niveles y `pause`/`resume`/`restart`/`setTheme`/`destroy`.
7. Registrar `rana-tactica` en `games/registry.ts` (`contract.md` § Añadir un juego; 800×600, NEÓN/CLÁSICO). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `rana-tactica` con `saves_scores = true`, `cat = PUZZLE`, `color = green`, `sort_order = 7`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/ranaria` devuelve la 404 temática y `grep -rn -i "ranaria" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/rana-tactica` muestran card/detalle con la portada nueva y los textos nuevos; JUGAR AHORA navega a `/games/rana-tactica/play`.
- [ ] El filtro PUZZLE de `/games` incluye RANA TÁCTICA.
- [ ] El canvas llena la pantalla del CRT y arranca en `ready`: rana en `(7, 11)`, tráfico quieto y `PAR <n> · PULSA UNA FLECHA`.
- [ ] Sin pulsar ninguna tecla durante 10 s, ningún vehículo se mueve.
- [ ] Cada flecha/WASD mueve la rana exactamente una celda y avanza el tráfico un turno; `Espacio` avanza el tráfico sin mover la rana.
- [ ] Mantener una tecla pulsada ejecuta un solo turno.
- [ ] Los fantasmas muestran exactamente dónde estará cada vehículo que se mueve en el siguiente turno; los carriles `slow` solo muestran fantasma en turnos en que se moverán.
- [ ] Saltar a una celda ocupada mata; quedarse en una celda que un vehículo `fast` atraviesa mata.
- [ ] La página no hace scroll con flechas ni `Espacio`.
- [ ] Llegar a la fila 0 en exactamente `par` turnos suma `100 × nivel + 500`; con `par + 3` turnos suma `100 × nivel + 350`.
- [ ] El Nivel del HUD sube al completar un nivel y el nuevo nivel arranca en `ready` con su par.
- [ ] Dos partidas distintas muestran el mismo layout en el nivel 1 y en el nivel 5.
- [ ] Los niveles 1–6 tienen mediana en la fila 6; el nivel 7 no.
- [ ] Morir resta una vida, devuelve la rana a la salida y el tráfico a su posición inicial; el bonus del nivel refleja los turnos gastados antes de morir.
- [ ] Al completar el nivel 5 las vidas suben en 1; nunca pasan de 5.
- [ ] Perder la última vida o pulsar FIN abre el modal FIN DEL JUEGO con la puntuación real.
- [ ] El canvas no dibuja score, vidas, nivel ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA; en pausa las teclas no ejecutan turnos.
- [ ] Escribir en el input del modal (incluido espacio y letras WASD) no afecta al juego.
- [ ] JUGAR DE NUEVO vuelve a `ready` del nivel 1 con score 0, vidas 3, nivel 01.
- [ ] ESTILO alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops ni listeners (una pulsación = un turno).
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=rana-tactica` con la fila; Mejor global y Partidas actualizados en `/games/rana-tactica`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids, Tetris, Arkanoid y Snake conservan sus temas y criterios de SPEC 04/06/07/08; los 3 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Respuestas comunes del jam:** reemplazar `ranaria` (update + `saves_scores = true`, ticker de `lib/home.ts`), temas NEÓN + CLÁSICO, sin sonido, vidas libres, complejidad máxima M, Canvas 2D 800×600, flechas/WASD, leaderboard por puntos. Decididas por el organizador sin preguntar al usuario.
- **Sí:** slug `rana-tactica` y title `RANA TÁCTICA`. Nombre propio que comunica el ángulo puzzle. _(Decidido sin preguntar al usuario.)_
- **Sí:** `cat = PUZZLE` en el update. El juego es por turnos y de planificación; el enum ya existe. _(Sin preguntar.)_
- **Sí:** conservar `color` (`green`) y `sort_order` (7). Sin migración de enums.
- **Sí:** renombrar `.cover-rana` a `.cover-rana-tactica`. Sigue la convención `cover-<slug>`. _(Sin preguntar.)_
- **No:** redirect de `/games/ranaria`. Sin usuarios aún (criterio de SPEC 04).
- **Sí:** tráfico que avanza solo con las acciones de la rana. Es el núcleo del ángulo B y lo separa de A (tiempo real) y C (timing). _(Sin preguntar.)_
- **Sí:** acción "esperar" con `Espacio`. Sin ella muchos niveles exigirían rodeos artificiales; esperar cuesta un turno, así que se penaliza igual.
- **Sí:** fantasmas del turno siguiente y chevrones de ritmo. Información completa: la habilidad es planificar, no adivinar. _(Sin preguntar.)_
- **Sí:** rana primero, vehículos después, con barrido celda a celda. Elimina ambigüedades de intercambio de celdas y del carril `fast`.
- **Sí:** niveles generados con semilla fija por nivel. Iguales para todos, lo que hace justo el leaderboard, y sin coste de diseño manual. _(Sin preguntar.)_
- **No:** niveles diseñados a mano. Coste de contenido alto para complejidad M y limitaría la partida a N niveles.
- **No:** semilla aleatoria por partida. Rompería la comparación entre jugadores.
- **Sí:** validar con BFS sobre `(x, y, turn mod 32)` y calcular el par. 16 × 12 × 32 = 6.144 estados: instantáneo; garantiza que todo nivel es resoluble y que el par es el óptimo real.
- **Sí:** grilla 16×12 de 50 px. Encaja exactamente en 800×600 y deja 10 carriles legibles.
- **No:** río y troncos. Duplicarían el modelo de carriles sin aportar al ángulo y suben la complejidad.
- **Sí:** puntuación base por nivel + bonus por eficiencia contra el par. Premia jugar óptimo y llegar lejos; el máximo práctico (~2.500 por nivel) nunca roza 1.000.000. Se mantiene el CHECK y se hace clamp por seguridad. _(Sin preguntar.)_
- **Sí:** turnos acumulados entre muertes. Morir no puede ser una forma gratis de reintentar con bonus completo.
- **No:** deshacer turno. Con deshacer el bonus de eficiencia no significaría nada.
- **Sí:** 3 vidas, +1 cada 5 niveles (máx. 5). Tolera errores de lectura sin que la partida sea infinita. _(Sin preguntar.)_
- **Sí:** estado `ready` por nivel con `PAR <n>` en canvas. Excepción documentada al contrato (como SPEC 07/08): forma parte del arranque del nivel y el par es información del puzzle, no del HUD. _(Sin preguntar.)_
- **No:** contador de turnos durante la partida en canvas. Sería HUD en canvas, que el contrato prohíbe; ampliar el HUD React iría en otra spec.
- **Sí:** tween visual de 110 ms con búfer de 1 acción. Da lectura del movimiento sin convertirlo en un juego de reflejos.
- **Sí:** ignorar `event.repeat`. Un turno por pulsación evita gastar turnos sin querer.
- **Sí:** temas NEÓN (default) y CLÁSICO, todo vectorial. No hay assets de rana ni coches en `references/source-assets/`.
- **No:** sonido. Fuera por contrato.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Un nivel generado no tiene solución                                 | BFS antes de entregar el layout; reintento con semilla + 1000 hasta `MAX_REGEN`; último recurso: vaciar el carril más denso. |
| Cambiar el generador altera niveles ya puntuados                    | `generateLevel` y `SEED_BASE` congelados tras publicar; cualquier cambio va en otra spec y se documenta.                     |
| `Math.random` cuela no determinismo                                 | Toda la generación usa `mulberry32`; `entities.ts` y `levels.ts` no importan `Math.random`.                                  |
| Fantasmas confusos con camiones o carriles `fast`                   | Fantasma = silueta completa en la posición del turno siguiente, con alpha baja; criterio de aceptación propio.               |
| Pulsaciones rápidas pierden o duplican turnos                       | Búfer de 1 acción durante el tween; `event.repeat` ignorado; vaciar búfer al reanudar.                                       |
| `preventDefault` de `Espacio` o flechas rompe el input de iniciales | Ignorar targets `input`/`textarea`; motor detenido en game over.                                                             |
| Doble montaje (Strict Mode) duplica loops o listeners               | `destroy()` cancela rAF y quita listeners; criterio SALIR/volver (una pulsación = un turno).                                 |
| Otra propuesta del jam también reemplaza `ranaria`                  | Solo se promueve una propuesta; las demás quedan `Descartada`.                                                               |

## Lo que **no** está en esta spec

- Sonido.
- Deshacer turno.
- Río, troncos, tortugas y nenúfares.
- Contador de turnos en canvas o en el HUD React.
- Niveles diseñados a mano o editor de niveles.
- Récords locales, localStorage y persistencia del tema.
- Controles táctiles o con ratón.
- Redirect de `/games/ranaria`.

Cada uno, si llega, va en su propia spec.
