# SPEC 09 — HORA PUNTA jugable con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-26
> **Objetivo:** Crear en TypeScript un Frogger arcade en tiempo real de 12 carriles de autopista, jugable con leaderboard en `/games/frogger/play`, reemplazando RANARIA.

## Alcance

**Dentro:**

- Fila `ranaria` de `public.games` reemplazada por migración: slug `frogger`, title `FROGGER`, cover `cover-frogger`, `short`/`long` nuevos, `saves_scores = true`. `cat` (`ARCADE`), `color` (`green`) y `sort_order` (7) sin cambios.
- Portada: `.cover-rana` de `app/globals.css` renombrada a `.cover-frogger` y rediseñada con `/frontend-design` (autopista nocturna vista desde arriba, rana neón en la mediana; solo gradientes CSS).
- Ticker de `lib/home.ts`: `game: "Ranaria"` → `"Frogger"`.
- Motor nuevo en `games/frogger/` (sin juego de referencia ni assets), canvas 800×600, grilla lógica 20×15 con celdas de 40 px (4:3, llena `.crt-screen`).
- Tablero por filas (y = 0 arriba):
  - Fila 0: meta. Seto continuo con 5 madrigueras en las columnas 2, 6, 10, 14 y 18.
  - Filas 1–6: 6 carriles rápidos.
  - Fila 7: mediana segura.
  - Filas 8–13: 6 carriles lentos.
  - Fila 14: acera de salida. La rana aparece en `(10, 14)`.
- Tráfico continuo en tiempo real: cada carril tiene sentido, tipo de vehículo, velocidad en px/s y número de vehículos fijos (tabla `LANES` en Modelo de datos). Los vehículos salen por un borde y reaparecen por el opuesto.
- Rana con salto discreto de 1 celda (40 px) en 110 ms, interpolado. Un salto por pulsación; buffer de 1 salto pedido durante el salto en curso. No sale del canvas por los lados ni por abajo.
- Muerte: hitbox de la rana (24×24 centrada en su posición dibujada) solapa un vehículo; saltar a la fila 0 fuera de una madriguera libre (seto o madriguera ocupada); temporizador de cruce agotado.
- Temporizador: 30 s por cruce. Se reinicia al aparecer la rana (tras madriguera o muerte). No corre en `ready`.
- Puntuación:
  - +10 por cada fila nueva más alta alcanzada en el cruce actual (máx. 13 por cruce).
  - +50 al entrar en una madriguera libre, más 10 × segundos enteros restantes del temporizador.
  - +1000 al llenar las 5 madrigueras (nivel completado).
  - Score con tope 1 000 000.
- Vidas: 3 iniciales; +1 cada 10 000 puntos, máximo 5.
- Niveles: al llenar las 5 madrigueras, `level++`, se vacían las madrigueras y el tráfico se reposiciona. Velocidad de todos los carriles × `1 + 0.1 × (min(level, 10) − 1)` (×1.9 tope desde el nivel 10).
- Estado `ready`: tráfico en marcha, rana quieta en la salida, temporizador detenido, pista `PULSA UNA FLECHA` en canvas. La primera flecha/WASD/`Espacio` pasa a `playing` (la flecha además ejecuta el salto, salvo `↓`/`S`, que no mueve).
- Animaciones breves sin texto: aplastamiento 600 ms tras morir; destello de 800 ms del tablero al completar nivel. Sin input durante ambas.
- Barra de tiempo en canvas: franja de 6 px dentro de la acera de salida (fila 14, borde inferior), sin números. Excepción documentada al contrato (ver Decisiones).
- Input: `ArrowUp/Down/Left/Right`, `KeyW/A/S/D` y `Space` (solo en `ready`).
- 2 temas: NEÓN (default) y CLÁSICO. El botón ESTILO alterna sin reiniciar; no se persiste.
- HUD React: Puntuación, Vidas y Nivel del motor.
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.

**Fuera (specs futuras):**

- Río, troncos, tortugas y cocodrilos (el tema es solo autopista).
- Moscas o bonus en madrigueras, rana acompañante.
- Sonido.
- Récords locales y cualquier uso de localStorage.
- Menú propio, HUD numérico y GAME OVER en canvas.
- Persistir el tema elegido.
- Controles táctiles / ratón.
- Tráfico por turnos (ángulo B) y salto cargado o cruce rítmico (ángulo C).
- Redirect de `/games/ranaria`.

## Modelo de datos

```sql
-- supabase/migrations/20261026000000_hora_punta.sql (solo datos)
update public.games
set slug = 'frogger',
    title = 'Frogger',
    short = 'Cruza 12 carriles de autopista sin acabar bajo una rueda.',
    long = 'Salta con ← ↑ → ↓ o W A S D entre 12 carriles de tráfico y una mediana segura hasta una de las 5 madrigueras. Cada fila nueva vale 10; cada madriguera, 50 más 10 por segundo sobrante; llenar las 5 da 1000 y sube el nivel: el tráfico acelera hasta el nivel 10. Tienes 3 vidas, 30 s por cruce y una vida extra cada 10 000 puntos.',
    cover = 'cover-frogger',
    saves_scores = true
where slug = 'ranaria';
```

```ts
// games/registry.ts (entrada nueva)
"frogger": {
  create: createHoraPunta,
  width: 800,
  height: 600,
  themes: [
    { id: "neon", label: "NEÓN" },
    { id: "classic", label: "CLÁSICO" },
  ],
},
```

```ts
// games/frogger/engine.ts
export type HoraPuntaTheme = "neon" | "classic";
export function createHoraPunta(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Mode = "ready" | "playing" | "dying" | "cleared" | "gameover";
type Dir = "up" | "down" | "left" | "right";
type Frog = {
  col: number;
  row: number; // celda lógica (destino si salta)
  from: { col: number; row: number }; // origen del salto
  hopT: number; // 0..1; 1 = en reposo
  facing: Dir;
  queued: Dir | null; // buffer de 1 salto
};
type Vehicle = { x: number; len: number }; // x = borde izquierdo en px
type Lane = {
  row: number;
  dir: 1 | -1;
  kind: VehicleKind;
  speed: number;
  vehicles: Vehicle[];
};
type State = {
  mode: Mode;
  frog: Frog;
  lanes: Lane[];
  homes: boolean[]; // 5 madrigueras
  bestRow: number; // fila más alta alcanzada en el cruce (14 = salida)
  timeLeft: number; // s
  animT: number; // ms restantes de dying/cleared
  score: number;
  lives: number;
  level: number;
  nextLifeAt: number; // 10 000, 20 000, …
};

// games/frogger/config.ts
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 40,
  COLS: 20,
  ROWS: 15,
  START: { col: 10, row: 14 },
  HOME_COLS: [2, 6, 10, 14, 18],
  MEDIAN_ROW: 7,
  HOP_MS: 110,
  HITBOX: 24,
  CROSS_TIME_S: 30,
  DYING_MS: 600,
  CLEARED_MS: 800,
  LIVES: { start: 3, max: 5, extraEvery: 10_000 },
  POINTS: { row: 10, home: 50, perSecond: 10, level: 1000 },
  SPEED_STEP: 0.1,
  SPEED_LEVEL_CAP: 10,
  WRAP_MARGIN: 160, // px fuera de pantalla antes de reaparecer
  SCORE_MAX: 1_000_000,
} as const;

export type VehicleKind = "moto" | "car" | "truck";
export const VEHICLE_LEN: Record<VehicleKind, number> = {
  moto: 40,
  car: 60,
  truck: 120,
};

// row, dir (1 = →, −1 = ←), kind, speed (px/s en nivel 1), count
export const LANES = [
  { row: 13, dir: -1, kind: "car", speed: 70, count: 3 },
  { row: 12, dir: 1, kind: "car", speed: 90, count: 3 },
  { row: 11, dir: -1, kind: "truck", speed: 50, count: 2 },
  { row: 10, dir: 1, kind: "moto", speed: 160, count: 2 },
  { row: 9, dir: -1, kind: "car", speed: 110, count: 3 },
  { row: 8, dir: 1, kind: "truck", speed: 70, count: 2 },
  { row: 6, dir: -1, kind: "car", speed: 130, count: 3 },
  { row: 5, dir: 1, kind: "truck", speed: 90, count: 2 },
  { row: 4, dir: -1, kind: "moto", speed: 200, count: 2 },
  { row: 3, dir: 1, kind: "car", speed: 150, count: 4 },
  { row: 2, dir: -1, kind: "truck", speed: 110, count: 2 },
  { row: 1, dir: 1, kind: "car", speed: 170, count: 3 },
] as const;

// games/frogger/entities.ts — utilidades puras, sin dibujo ni globals
// speedFactor(level), spawnLanes(level, rng?) → Lane[] (vehículos equiespaciados
// en 800 + 2·WRAP_MARGIN con desfase aleatorio por carril), advanceLanes(lanes, dt),
// frogPos(frog) → { x, y } interpolado, frogHitbox(frog) → Rect, overlaps(a, b),
// hitsTraffic(lanes, frog), homeIndex(col) → 0..4 | -1, canMove(frog, dir),
// homeScore(timeLeft), clampScore(n)

// games/frogger/theme.ts
export type Palette = {
  bg: string; // asfalto
  sidewalk: string; // acera y mediana
  hedge: string; // seto de la meta
  home: string; // madriguera libre
  laneLine: string; // líneas discontinuas
  frog: string;
  frogEye: string;
  vehicles: Record<VehicleKind, string>;
  timer: string;
  timerLow: string; // < 5 s
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};
export const PALETTES: Record<HoraPuntaTheme, Palette>;
```

Convenciones:

- Canvas 800×600; el tablero ocupa todo el canvas (sin franja de HUD). Origen arriba-izquierda.
- `stats`: `{ score, lives, level }`; `onStats` solo cuando cambia alguno (y al iniciar/reiniciar).
- Loop con `requestAnimationFrame`; `dt` en segundos con clamp 0.05. En `ready`, `playing`, `dying` y `cleared` avanza el tráfico; en `gameover` y en pausa no avanza nada.
- Movimiento de vehículos: `x += dir × speed × speedFactor(level) × dt`; si sale más allá de `WRAP_MARGIN`, se desplaza `800 + 2·WRAP_MARGIN` al lado opuesto. La separación entre vehículos de un carril es constante (nunca se solapan).
- Salto: al pulsar con la rana en reposo, si `canMove` → `from = (col,row)`, nueva celda, `hopT = 0`. Pulsación durante un salto → `queued` (sustituye a la anterior). Al terminar el salto se ejecuta `queued`.
- Colisión con tráfico en cada frame sobre la posición interpolada (incluye durante el salto), solo si la rana está en una fila de carril.
- Fila nueva: al aterrizar, si `row < bestRow` → `bestRow = row`, +10.
- Fila 0: al aterrizar, `homeIndex(col)` libre → `homes[i] = true`, +50 + `homeScore(timeLeft)`, respawn en salida con `bestRow = 14` y temporizador a 30 s. Seto o madriguera ocupada → muerte.
- 5 madrigueras llenas → +1000, `mode = "cleared"`, al terminar `level++`, `homes` vacías, `spawnLanes(level)`, respawn.
- Muerte → `mode = "dying"`, `lives--`; al terminar la animación: `lives > 0` → respawn y `playing`; `lives = 0` → `mode = "gameover"` y `onGameOver(score)` una sola vez.
- Vida extra: tras cada suma, mientras `score >= nextLifeAt` → `lives = min(5, lives + 1)`, `nextLifeAt += 10 000`.
- NEÓN: asfalto casi negro, líneas de carril cian discontinuas con glow, vehículos como rectángulos redondeados con contorno luminoso (magenta, amarillo, cian por tipo) y faros; rana verde neón con `shadowBlur = glow` (reset a 0 tras dibujar).
- CLÁSICO: asfalto gris, línea central amarilla doble en la mediana, aceras violeta y seto verde estilo arcade 1981, vehículos planos de colores con ruedas; rana verde plana.
- Rana vectorial: cuerpo ovalado, 4 patas y 2 ojos, rotada según `facing`; en madriguera ocupada se dibuja sentada. Aplastamiento: rana achatada y aspa del color `text`.
- Barra de tiempo: ancho proporcional a `timeLeft / 30`, color `timerLow` por debajo de 5 s. Pista `PULSA UNA FLECHA` en `bold monospace` color `text`. Sin score, vidas, nivel ni GAME OVER en canvas.
- Input por `KeyboardEvent.code` sobre `window`; se ignora `event.repeat` (un salto por pulsación). `preventDefault` solo en flechas y `Space`; nunca si `event.target` es `input`/`textarea` (ahí se ignora el evento entero). WASD no necesita `preventDefault`.
- En pausa, `dying`, `cleared` o `gameover` el motor no consume pulsaciones; al reanudar se vacía `queued`.
- `restart()`: score 0, vidas 3, nivel 1, madrigueras vacías, tráfico de nivel 1, `nextLifeAt = 10 000`, `mode = "ready"`; conserva el tema.
- `destroy()` cancela rAF y quita todos los listeners.
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 2 y 6, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `cacheComponents` (no se tocan, pero `GameCanvas` monta el motor en un Client Component).

1. **Migración** (`.claude/skills/add-game/checklist.md` §1): cargar skills `supabase` y `supabase-postgres-best-practices`; `list_tables` + `list_migrations`; crear `supabase/migrations/20261026000000_hora_punta.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos: `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso: `lib/home.ts` ticker `"Ranaria"` → `"Frogger` y renombrar `.cover-rana` → `.cover-frogger` en `app/globals.css`. `grep -rn -i "ranaria\|cover-rana\b" app components lib games` vacío (salvo `database.types.ts` si aplica). `/games/frogger` muestra el detalle con el juego simulado.
2. **Portada** (`checklist.md` §2): rediseñar `.cover-frogger` (+ `::before`/`::after`) con `/frontend-design`, coherente con las demás portadas (gradientes CSS, sin imágenes). Verificar en `/games` y `/games/frogger`.
3. Crear `games/frogger/config.ts` (`CONFIG`, `VEHICLE_LEN`, `LANES`) (`.claude/skills/add-game/contract.md` § Reglas del motor).
4. Crear `games/frogger/entities.ts` con las utilidades puras de Modelo de datos (sin dibujo ni globals).
5. Crear `games/frogger/theme.ts`: `PALETTES` y funciones de dibujo de tablero (asfalto, aceras, mediana, seto, madrigueras, líneas), vehículos por tipo, rana (reposo, salto, sentada, aplastada), barra de tiempo y pista; reciben `ctx` y `Palette`.
6. Crear `games/frogger/engine.ts` (`contract.md` § Reglas del motor): `createHoraPunta` con loop rAF, modos `ready`/`playing`/`dying`/`cleared`/`gameover`, input con buffer, tráfico, colisiones, temporizador, puntuación, vidas extra, niveles, dibujo y `pause`/`resume`/`restart`/`setTheme`/`destroy`.
7. Registrar `"frogger"` en `games/registry.ts` (800×600, NEÓN/CLÁSICO) (`contract.md` § Añadir un juego). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `frogger` con `saves_scores = true`, `cat = ARCADE`, `color = green`, `sort_order = 7`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/ranaria` devuelve la 404 temática y `grep -rn -i "ranaria" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/frogger` muestran card/detalle con la portada `.cover-frogger` y los textos nuevos; JUGAR AHORA navega a `/games/frogger/play`.
- [ ] El ticker de la home muestra `Hora Punta` en lugar de `Ranaria`.
- [ ] El canvas llena la pantalla del CRT y arranca en `ready`: tráfico en movimiento, rana quieta en `(10, 14)`, barra de tiempo llena y `PULSA UNA FLECHA`.
- [ ] En `ready` la barra de tiempo no baja; `↑`/`W` inicia la partida y salta una fila; `↓`/`S` y `Espacio` inician sin mover la rana.
- [ ] Flechas y WASD saltan exactamente 1 celda por pulsación; mantener la tecla no encadena saltos; una pulsación durante un salto se ejecuta al aterrizar.
- [ ] La rana no sale del canvas por izquierda, derecha ni abajo.
- [ ] La página no hace scroll con flechas ni `Espacio`.
- [ ] Hay 12 carriles con los sentidos, tipos y velocidades de `LANES`; los vehículos reaparecen por el lado opuesto y nunca se solapan.
- [ ] Tocar un vehículo (también a mitad de salto) muestra el aplastamiento, resta 1 vida en el HUD y reaparece la rana en la salida.
- [ ] La mediana (fila 7) y las aceras nunca matan.
- [ ] Cada fila nueva alcanzada en un cruce suma 10; volver atrás y avanzar de nuevo no suma otra vez.
- [ ] Entrar en una madriguera libre suma 50 + 10 por segundo restante, la deja ocupada (rana sentada) y la rana reaparece en la salida.
- [ ] Saltar al seto o a una madriguera ocupada mata.
- [ ] Agotar los 30 s del cruce mata; la barra cambia de color por debajo de 5 s.
- [ ] Llenar las 5 madrigueras suma 1000, destella el tablero, sube el Nivel del HUD, vacía las madrigueras y el tráfico va más rápido; desde el nivel 10 no acelera más.
- [ ] Al cruzar 10 000 puntos el HUD suma 1 vida; nunca supera 5.
- [ ] Perder la última vida abre el modal FIN DEL JUEGO con la puntuación real tras la animación; FIN lo abre a mitad de partida.
- [ ] El canvas no dibuja score, vidas, nivel ni GAME OVER (solo barra de tiempo sin números y pista de `ready`).
- [ ] PAUSA, `P` y `Escape` congelan tráfico, rana y temporizador; overlay EN PAUSA; en pausa las teclas no mueven la rana.
- [ ] Escribir en el input del modal (incluido espacio y letras WASD) no afecta al juego.
- [ ] JUGAR DE NUEVO vuelve a `ready` con score 0, vidas 3, nivel 01 y madrigueras vacías.
- [ ] ESTILO alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops (el tráfico no se acelera) ni listeners.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=frogger` con la fila; Mejor global y Partidas actualizados en `/games/frogger`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids, Tetris, Arkanoid y Snake conservan sus temas y criterios de SPEC 04/06/07/08; los 3 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Respuestas comunes del jam** (decididas por el organizador, sin preguntar al usuario): reemplazar el simulado `ranaria` (update + `saves_scores = true` + ticker), temas NEÓN + CLÁSICO, sin sonido, vidas libres según el juego, complejidad máxima M, Canvas 2D 800×600, flechas/WASD, leaderboard por puntos.
- **Sí:** slug `frogger` en lugar de conservar `ranaria`. El título nuevo describe el ángulo (tráfico denso, ritmo alto) y la carpeta de la propuesta debe ser distinta de `ranaria`. _(Decidido sin preguntar.)_
- **No:** fila nueva. Duplicaría el juego de la rana en el catálogo.
- **No:** redirect de `/games/ranaria`. Sin usuarios aún (criterio de SPEC 04).
- **Sí:** conservar `cat` `ARCADE`, `color` `green` y `sort_order` 7. Sin migración de enums.
- **Sí:** renombrar `.cover-rana` → `.cover-frogger`. Patrón de `checklist.md` §2. _(Decidido sin preguntar.)_
- **Sí:** solo autopista, sin río. El tema es cruzar la autopista; el río duplicaría mecánica (plataformas) y empujaría la complejidad a L. _(Decidido sin preguntar.)_
- **Sí:** tráfico continuo en tiempo real y salto de 110 ms. Es lo que separa el ángulo A del B (por turnos) y del C (una sola mecánica de timing). _(Decidido sin preguntar.)_
- **Sí:** grilla 20×15 de 40 px con mediana segura en la fila 7. Encaja en 4:3 y da un respiro a mitad de cruce. _(Decidido sin preguntar.)_
- **Sí:** 5 madrigueras y nivel al llenarlas. Estructura clásica de Frogger; da objetivo y progresión clara. _(Decidido sin preguntar.)_
- **Sí:** puntuación clásica adaptada (10 por fila nueva, 50 + 10/s por madriguera, 1000 por nivel). Premia avanzar y cruzar rápido, no esperar. _(Decidido sin preguntar.)_
- **Sí:** 3 vidas, +1 cada 10 000 hasta 5. Vidas libres según el juego; el tope evita partidas infinitas. _(Decidido sin preguntar.)_
- **Sí:** aceleración del 10 % por nivel con tope en el 10. Dificultad creciente sin volverse injugable. _(Decidido sin preguntar.)_
- **Sí:** temporizador de 30 s con barra en canvas sin números. Excepción documentada al contrato (como la pista `ready` de SPEC 07/08): sin barra el temporizador es invisible y el HUD React solo tiene score/vidas/nivel. _(Decidido sin preguntar.)_
- **No:** añadir un cuarto campo (tiempo) al HUD React. Exigiría cambiar `EngineStats` y `GamePlayer` para un solo juego.
- **Sí:** estado `ready` con pista en canvas y tráfico en marcha. Excepción documentada (SPEC 07/08); deja leer el ritmo antes de empezar.
- **Sí:** un salto por pulsación, ignorando `event.repeat`, con buffer de 1. Precisión en reflejos; el buffer evita perder la pulsación a mitad de salto.
- **Sí:** colisión sobre la posición interpolada con hitbox de 24×24. Justa visualmente y perdona roces de esquina.
- **No:** moscas, rana acompañante ni vehículos especiales. Mecánicas extra fuera de M.
- **Sí:** todo vectorial. `references/source-assets/` solo tiene `snake-assets`, sin sprites útiles para este juego.
- **No:** sonido. Fuera por contrato y respuesta común.
- **Sí:** mantener CHECK de `score` ≤ 1 000 000 con tope en el motor. Un nivel perfecto ronda 3 300 puntos; llegar al tope exige ~300 niveles.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| La barra de tiempo se interpreta como HUD prohibido                        | Excepción documentada en Decisiones; sin números ni texto; ocupa la acera, no una franja.                           |
| Carriles injugables en niveles altos (huecos menores que un salto)         | Velocidad con tope ×1.9 y `count` fijo; verificar en nivel 10 que todos los carriles tienen hueco.                  |
| Colisiones injustas a mitad de salto                                       | Hitbox 24×24 interpolada; solo en filas de carril.                                                                  |
| Muerte a ciegas al respawnear con un vehículo encima                       | La salida (fila 14) es acera; no hay tráfico en ella.                                                               |
| `dt` grande tras cambiar de pestaña teletransporta vehículos sobre la rana | Clamp de `dt` a 0.05 s.                                                                                             |
| Doble montaje (Strict Mode) duplica loops o listeners                      | `destroy()` cancela rAF y quita listeners; criterio SALIR/volver.                                                   |
| `preventDefault` de `Espacio` o flechas rompe el input de iniciales        | Ignorar targets `input`/`textarea`; motor detenido en `gameover`.                                                   |
| Tecla pulsada durante la pausa provoca un salto al reanudar                | Vaciar `queued` al reanudar; ignorar `event.repeat`.                                                                |
| Solape conceptual con las propuestas B y C                                 | Tiempo real con tráfico continuo y varios ejes de habilidad (ruta, timing, velocidad); sin turnos ni salto cargado. |

## Lo que **no** está en esta spec

- Río, troncos, tortugas y cocodrilos.
- Moscas, bonus y rana acompañante.
- Sonido.
- Récords locales y localStorage.
- Menú propio, HUD numérico y GAME OVER en canvas.
- Persistencia del tema.
- Controles táctiles o con ratón.
- Redirect de `/games/ranaria`.

Cada uno, si llega, va en su propia spec.
