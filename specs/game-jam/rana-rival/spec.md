# JAM Frogger — RANA RIVAL jugable con leaderboard

> **Estado:** Descartada
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-26
> **Tema:** Frogger — una rana intenta cruzar una autopista sin ser aplastada por los vehículos.
> **Objetivo:** Crear RANA RIVAL, un duelo de cruces contra una rana CPU con salto cargado y combos por rozones, jugable con leaderboard en `/games/rana-rival/play`, reemplazando RANARIA.

## Alcance

**Dentro:**

- Fila `ranaria` de `public.games` reemplazada por migración: slug `rana-rival`, title `RANA RIVAL`, cover `cover-rana-rival`, `cat` `ARCADE` → `VERSUS`, `short`/`long` nuevos, `saves_scores = true`. `color` (`green`) y `sort_order` (7) sin cambios.
- Portada `.cover-rana` renombrada a `.cover-rana-rival` y rediseñada en `app/globals.css` con `/frontend-design` (dos ranas, verde y magenta, sobre carriles).
- Ticker de `lib/home.ts`: `game: "Ranaria"` → `"Rana Rival"`.
- Motor nuevo en `games/rana-rival/` (no hay juego de referencia ni assets): canvas 800×600, grilla de 20 columnas × 15 filas de 40 px (4:3, llena `.crt-screen`).
- Autopista compartida: fila 14 acera de salida, filas 8–13 y 1–6 carriles (12), fila 7 mediana segura, fila 0 acera de meta.
- Dos ranas en mitades fijas: jugadora en columnas 0–9 (sale en la 4), rival CPU en columnas 10–19 (sale en la 15). Los vehículos cruzan las 800 px y afectan a ambas.
- Mecánica central de timing: **salto cargado**. Mantener `Espacio`/`↑`/`W` carga; soltar salta 1, 2 o 3 filas según el tiempo de carga (< 180 ms, < 400 ms, ≥ 400 ms). En el aire (240 ms) la rana es invulnerable; en el suelo, también mientras carga, es vulnerable.
- Saltos cortos: `←`/`A` y `→`/`D` desplazan una columna dentro de su mitad; `↓`/`S` retrocede una fila (no por debajo de la 14). Duran 120 ms, también en el aire.
- Combos de precisión: ROZÓN (salir o aterrizar a ≤ 20 px de un vehículo sin tocarlo, 50 pts) y SALTO SOBRE (sobrevolar un carril con un vehículo justo debajo, 30 pts). Cada evento suma combo; multiplicador `min(1 + floor(combo / 3), 5)`; el combo caduca a los 2 500 ms sin evento y se pierde al morir.
- Mangas (VERSUS): ambas ranas salen a la vez; la primera en llegar a la fila 0 gana la manga. Si gana la jugadora: cruce `100 × mult` + bonus de tiempo `max(0, 200 − floor(t × 10))` + victoria 250, y el nivel sube. Si gana la rival: −1 vida y se repite el mismo nivel.
- Atropello de la jugadora: −1 vida, combo a 0, 400 ms de animación aplastada y vuelta a la fila 14 de su columna de salida; la manga continúa. La rival atropellada solo vuelve a su salida.
- 3 vidas; +1 vida cada 5 mangas ganadas (máximo 5). Con 0 vidas, `onGameOver(score)`.
- Nivel = manga actual. Velocidad de tráfico `× (1 + 0.07 × min(N − 1, 10))`; la rival piensa más rápido, salta más lejos y se equivoca menos con el nivel.
- Estado `ready` al inicio de cada manga: tráfico en movimiento, ranas quietas, pista `MANGA N · MANTÉN ESPACIO Y SUELTA` en canvas. La primera tecla de salto arranca la manga y empieza a cargar.
- Estado `result` de 900 ms al acabar una manga con rótulo `¡MANGA GANADA!` o `LA RIVAL GANA` en canvas.
- Textos flotantes de 600 ms sobre la rana (`ROZÓN +50 ×2`) y anillo de carga de 3 segmentos alrededor de la rana mientras carga.
- 2 temas: NEÓN (default, vectorial con glow) y CLÁSICO (asfalto gris, líneas blancas, vehículos planos). El botón ESTILO alterna sin reiniciar; no se persiste.
- HUD React: Puntuación, Vidas (3–5) y Nivel (manga) del motor.
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.

**Fuera (specs futuras):**

- Sonido.
- Récords locales y cualquier uso de localStorage.
- Menú propio, HUD y GAME OVER en canvas.
- Persistir el tema elegido.
- Controles táctiles / ratón.
- Segundo jugador humano local u online.
- Fantasma de la mejor partida propia (rival grabada).
- Troncos, río, tortugas y casillas de meta del Frogger clásico.
- Selector de dificultad de la rival.
- Redirect de `/games/ranaria`.

## Modelo de datos

```sql
-- supabase/migrations/20261026000000_rana-rival.sql (solo datos)
update public.games
set slug = 'rana-rival',
    title = 'RANA RIVAL',
    short = 'Carga el salto, roza los coches y cruza la autopista antes que la rana rival.',
    long = 'Mantén Espacio o ↑ para cargar el salto (1, 2 o 3 carriles) y suelta para saltar; en el aire nada te toca. ← → esquivan y ↓ retrocede. Cruza antes que la rana rival para ganar la manga; si llega ella primero o te atropellan, pierdes una vida. Los rozones y los saltos sobre vehículos encadenan combo y multiplican los puntos hasta ×5. Tienes 3 vidas.',
    cat = 'VERSUS',
    cover = 'cover-rana-rival',
    saves_scores = true
where slug = 'ranaria';
```

```ts
// games/registry.ts (entrada nueva)
"rana-rival": {
  create: createRanaRival,
  width: 800,
  height: 600,
  themes: [
    { id: "neon", label: "NEÓN" },
    { id: "classic", label: "CLÁSICO" },
  ],
},
```

```ts
// games/rana-rival/engine.ts
export type RanaRivalTheme = "neon" | "classic";
export function createRanaRival(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Mode = "ready" | "playing" | "result" | "gameover";
type Side = "player" | "cpu";
type Frog = {
  side: Side;
  col: number; // 0..19, limitado a su mitad
  row: number; // 0..14
  air: {
    fromCol: number;
    fromRow: number;
    toCol: number;
    toRow: number;
    t: number;
    dur: number;
  } | null;
  chargeMs: number | null; // null = no está cargando
  splatMs: number; // > 0 = animación de atropello
};
type Vehicle = { lane: number; x: number; len: number; kind: VehicleKind };
type Popup = { x: number; y: number; text: string; t: number };
type State = {
  mode: Mode;
  score: number;
  lives: number;
  level: number; // manga, 1-based, sin límite
  wins: number; // mangas ganadas (vida extra cada 5)
  player: Frog;
  cpu: Frog;
  cpuThinkMs: number;
  vehicles: Vehicle[];
  combo: number;
  comboMs: number; // tiempo desde el último evento
  mangaMs: number;
  resultMs: number;
  lastWinner: Side | null;
  popups: Popup[];
};

// games/rana-rival/config.ts
export type VehicleKind = "moto" | "car" | "truck";
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL: 40,
  COLS: 20,
  ROWS: 15,
  GOAL_ROW: 0,
  MEDIAN_ROW: 7,
  START_ROW: 14,
  HALVES: {
    player: { min: 0, max: 9, start: 4 },
    cpu: { min: 10, max: 19, start: 15 },
  },
  FROG_BOX: 28, // hitbox cuadrada centrada en la celda
  CHARGE_MS: [180, 400], // umbrales → 1 / 2 / 3 filas
  JUMP_MS: 240,
  HOP_MS: 120,
  SPLAT_MS: 400,
  RESULT_MS: 900,
  VEHICLE_H: 28,
  VEHICLE_LEN: { moto: 40, car: 64, truck: 120 },
  LANES: [
    // row, dir (1 = →, −1 = ←), speed px/s, kind, gap px
    { row: 13, dir: 1, speed: 70, kind: "car", gap: 200 },
    { row: 12, dir: -1, speed: 110, kind: "moto", gap: 160 },
    { row: 11, dir: 1, speed: 60, kind: "truck", gap: 260 },
    { row: 10, dir: -1, speed: 140, kind: "car", gap: 220 },
    { row: 9, dir: 1, speed: 90, kind: "car", gap: 150 },
    { row: 8, dir: -1, speed: 180, kind: "moto", gap: 300 },
    { row: 6, dir: -1, speed: 80, kind: "truck", gap: 240 },
    { row: 5, dir: 1, speed: 130, kind: "car", gap: 180 },
    { row: 4, dir: -1, speed: 100, kind: "car", gap: 140 },
    { row: 3, dir: 1, speed: 200, kind: "moto", gap: 320 },
    { row: 2, dir: -1, speed: 70, kind: "truck", gap: 200 },
    { row: 1, dir: 1, speed: 160, kind: "car", gap: 200 },
  ],
  SPEED_STEP: 0.07,
  MAX_SPEED_LEVEL: 11,
  NEAR_PX: 20,
  POINTS: { near: 50, over: 30, cross: 100, win: 250, timeMax: 200 },
  COMBO_STEP: 3,
  COMBO_MAX_MULT: 5,
  COMBO_MS: 2500,
  LIVES: 3,
  MAX_LIVES: 5,
  EXTRA_LIFE_EVERY: 5,
  POPUP_MS: 600,
  CPU: {
    thinkMs: { initial: 420, step: 30, min: 120 },
    error: { initial: 0.15, step: 0.015, min: 0.02 },
    maxJump: { untilLevel2: 2, fromLevel3: 3 },
    safeMs: 350, // margen libre tras aterrizar
    threatMs: 400, // horizonte para huir del carril actual
  },
  MAX_SCORE: 1_000_000,
} as const;

// games/rana-rival/entities.ts — utilidades puras, sin dibujo ni globals
// jumpRows(chargeMs) → 1 | 2 | 3, laneSpeed(lane, level), createTraffic(level) → Vehicle[]
// (offset inicial determinista por fila: (row × 37) mod (len + gap)),
// updateTraffic(vehicles, level, dt) (wrap en ambos bordes), vehicleAt(vehicles, row, x, t?) → posición futura,
// frogRect(frog), hits(frog, vehicles) → boolean (solo si air === null),
// nearMissOnTakeoff(frog, vehicles) → boolean (vehículo acercándose, 0 < gap ≤ NEAR_PX),
// nearMissOnLanding(frog, vehicles) → boolean (vehículo alejándose, 0 < gap ≤ NEAR_PX),
// overflight(frog, row, vehicles) → boolean, multiplier(combo), timeBonus(mangaMs)

// games/rana-rival/cpu.ts — IA pura de la rival
// cpuParams(level) → { thinkMs, error, maxJump },
// cpuDecide(cpu, vehicles, level, rng) → { kind: "charge", rows } | { kind: "hop", dc, dr } | { kind: "wait" }
// Prueba de mayor a menor salto: la celda destino debe estar libre al aterrizar
// (carga + JUMP_MS) y durante safeMs; si el carril actual se ocupa antes de threatMs,
// hop lateral o atrás a una celda segura. Con probabilidad `error` omite la comprobación.

// games/rana-rival/theme.ts
export type Palette = {
  bg: string; // asfalto
  laneLine: string;
  sidewalk: string;
  median: string;
  divider: string; // línea discontinua vertical x = 400
  player: string;
  cpu: string;
  eye: string;
  vehicles: Record<VehicleKind, string>;
  charge: string;
  popup: string;
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};
export const PALETTES: Record<RanaRivalTheme, Palette>;
```

Convenciones:

- Canvas 800×600; la autopista ocupa todo el canvas (sin franja de HUD). Coordenadas: origen arriba-izquierda; la celda `(c, r)` empieza en `(c × 40, r × 40)`.
- `stats`: `{ score, lives, level }`; `onStats` solo cuando cambia alguno (y al iniciar/reiniciar).
- Loop con `requestAnimationFrame`; `dt` en segundos con clamp 0.05. El tráfico se mueve en `ready`, `playing` y `result`; ranas, IA, combo y cronómetro solo en `playing`.
- Salto: al soltar la tecla de carga, `rows = jumpRows(chargeMs)`, destino `max(0, row − rows)`. Al despegar se evalúa ROZÓN de salida; al cruzar el centro de cada fila intermedia, SALTO SOBRE; al aterrizar, ROZÓN de llegada y colisión.
- Colisión: solo en el suelo (`air === null`), intersección de `frogRect` con un vehículo del carril. Las filas 0, 7 y 14 son seguras.
- Evento de combo: `combo++`, `comboMs = 0`, `score += puntos × multiplier(combo)`, popup. `comboMs > COMBO_MS` → `combo = 0`.
- Llegada a la fila 0: la primera rana gana; `mode = "result"`. Gana la jugadora: `score += cross × mult + timeBonus + win`, `wins++`, vida extra si `wins % 5 === 0` (tope 5), `level++`. Gana la rival: `lives--`. Tras `RESULT_MS`: con vidas, nueva manga en `ready` (`createTraffic(level)`, ranas en salida, `combo = 0`); sin vidas, `gameover`.
- Atropello de la jugadora con 0 vidas: `mode = "gameover"` tras la animación y `onGameOver(score)` una sola vez.
- `score` se limita a `MAX_SCORE`.
- Pistas `ready`, rótulo `result`, popups y anillo de carga en `bold monospace`/vectorial con colores de la paleta; sin score, vidas, nivel ni GAME OVER en canvas.
- NEÓN: asfalto casi negro, líneas de carril cian tenues, vehículos como rectángulos redondeados con `shadowBlur = glow` (reset a 0 tras dibujar), rana jugadora verde y rival magenta.
- CLÁSICO: asfalto gris, líneas blancas discontinuas, aceras beige, vehículos planos de colores con ventanillas, rana verde y rival naranja.
- Input por `KeyboardEvent.code` sobre `window`; se ignora `event.repeat`. Carga: `Space`, `ArrowUp`, `KeyW` (`keydown` empieza, `keyup` salta). Hops: `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`, `ArrowDown`/`KeyS`; un hop durante la carga la cancela. En el aire o aplastada se ignora el input (sin buffer).
- `preventDefault` solo en flechas y `Space`; nunca si `event.target` es `input`/`textarea` (ahí se ignora el evento entero).
- En pausa o game over el motor no avanza ni procesa pulsaciones; al pausar se cancela la carga en curso (`chargeMs = null`).
- `restart()`: score 0, vidas 3, nivel 1, `wins = 0`, `mode = "ready"`; conserva el tema.
- `destroy()` cancela rAF y quita todos los listeners.
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 3 y 6, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `cacheComponents`.

1. **Migración** (`.claude/skills/add-game/checklist.md` §1): `list_tables` + `list_migrations`; crear `supabase/migrations/20261026000000_rana-rival.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos (el enum `VERSUS` ya existe): `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso: `lib/home.ts` ticker `"Ranaria"` → `"Rana Rival"` y `.cover-rana` → `.cover-rana-rival` provisional en `app/globals.css`. `grep -rn -i "ranaria\|cover-rana\b" app components lib games` vacío (salvo `database.types.ts` si aplica). `/games/rana-rival` muestra el detalle con el juego simulado.
2. **Portada** (`checklist.md` §2): rediseñar `.cover-rana-rival` (+ `::before`/`::after`) con `/frontend-design`, coherente con las demás portadas (gradientes CSS, sin imágenes). Verificar en `/games` y `/games/rana-rival`.
3. Crear `games/rana-rival/config.ts` (`.claude/skills/add-game/contract.md` § Reglas del motor; constantes de Modelo de datos).
4. Crear `games/rana-rival/entities.ts` (utilidades puras de tráfico, salto, colisión, rozones y puntuación) y `games/rana-rival/cpu.ts` (`cpuParams`, `cpuDecide` con `rng` inyectable).
5. Crear `games/rana-rival/theme.ts`: `PALETTES` NEÓN/CLÁSICO y funciones de dibujo de autopista, vehículos, ranas (normal, en el aire, aplastada), anillo de carga, popups y textos `ready`/`result` que reciben `ctx` y `Palette`.
6. Crear `games/rana-rival/engine.ts` (`contract.md` § Reglas del motor): `createRanaRival` con loop rAF, modos `ready`/`playing`/`result`/`gameover`, carga y saltos, IA de la rival, mangas, vidas, combo, dibujo y `pause`/`resume`/`restart`/`setTheme`/`destroy`.
7. Registrar `rana-rival` en `games/registry.ts` (800×600, NEÓN/CLÁSICO; `contract.md` § Añadir un juego). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `rana-rival` con `saves_scores = true`, `cat = VERSUS`, `color = green`, `sort_order = 7`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/ranaria` devuelve la 404 temática y `grep -rn -i "ranaria" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/rana-rival` muestran card/detalle con la portada nueva, categoría VERSUS y los textos nuevos; JUGAR AHORA navega a `/games/rana-rival/play`.
- [ ] El canvas llena la pantalla del CRT y arranca en `ready`: tráfico en movimiento, dos ranas en la fila inferior y `MANGA 1 · MANTÉN ESPACIO Y SUELTA`.
- [ ] Un toque corto de `Espacio`/`↑`/`W` salta 1 fila; mantener ~0,3 s salta 2; mantener ≥ 0,4 s salta 3; el anillo de carga muestra 1, 2 o 3 segmentos.
- [ ] Un vehículo que pasa bajo la rana en el aire no la atropella; mientras carga en un carril sí la atropella.
- [ ] `←`/`→`/`A`/`D` mueven una columna sin salir de la mitad izquierda; `↓`/`S` retrocede y no baja de la fila inferior.
- [ ] La página no hace scroll con flechas ni `Espacio`.
- [ ] Salir de un carril con un vehículo a ≤ 20 px muestra `ROZÓN +50` y suma 50 × multiplicador; sobrevolar un vehículo muestra `SALTO SOBRE +30`.
- [ ] Con 3 eventos seguidos el multiplicador pasa a ×2; no supera ×5; tras 2,5 s sin evento o al morir vuelve a ×1.
- [ ] La rival CPU cruza por la mitad derecha con saltos de 1–2 filas en los niveles 1–2 y de hasta 3 desde el 3; a veces es atropellada y vuelve a su salida.
- [ ] Llegar primero a la fila superior muestra `¡MANGA GANADA!`, suma cruce + bonus de tiempo + 250 y el Nivel del HUD sube.
- [ ] Si la rival llega primero se muestra `LA RIVAL GANA`, se pierde una vida y el Nivel no cambia.
- [ ] Ser atropellada resta una vida, muestra la rana aplastada y la devuelve a la fila inferior sin terminar la manga.
- [ ] La 5.ª manga ganada da una vida extra; el HUD nunca muestra más de 5.
- [ ] El tráfico es más rápido en cada nivel hasta el 11 y no acelera más en el 12.
- [ ] Con 0 vidas se abre el modal FIN DEL JUEGO con la puntuación real; FIN también lo abre a mitad de partida.
- [ ] El HUD React muestra Puntuación, Vidas y Nivel del motor; el canvas no dibuja score, vidas, nivel ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA; en pausa las teclas no cargan ni saltan y la carga en curso se cancela.
- [ ] Escribir en el input del modal (incluido espacio y letras WASD) no afecta al juego.
- [ ] JUGAR DE NUEVO vuelve a `ready` con score 0, vidas 3, nivel 01.
- [ ] ESTILO alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops (el tráfico no se acelera) ni listeners.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=rana-rival` con la fila; Mejor global y Partidas actualizados en `/games/rana-rival`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids, Tetris, Arkanoid y Snake conservan sus temas y criterios de SPEC 04/06/07/08; los 3 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Respuestas comunes del jam** (decididas por el organizador sin preguntar al usuario): reemplazar `ranaria`, temas NEÓN + CLÁSICO, sin sonido, vidas libres, complejidad máxima M, Canvas 2D 800×600, flechas/WASD (+ Espacio), leaderboard por puntos.
- **Sí:** reemplazar `ranaria` por `rana-rival`. Respuesta común; evita dos juegos de ranas.
- **Sí (sin preguntar):** cambiar `cat` a `VERSUS`. El duelo contra la rival encaja de forma natural y es la categoría menos cubierta; el enum ya existe.
- **Sí (sin preguntar):** conservar `color` `green` y `sort_order` 7.
- **No:** redirect de `/games/ranaria`. Sin usuarios aún (criterio de SPEC 04).
- **Sí (sin preguntar):** renombrar `.cover-rana` a `.cover-rana-rival` y rediseñarla. Alinea clase y slug como en SPEC 07.
- **Sí (sin preguntar):** salto cargado de 1–3 filas con invulnerabilidad en el aire. Es la mecánica de timing del ángulo C y la diferencia del Frogger en tiempo real (A) y por turnos (B).
- **Sí (sin preguntar):** vulnerable mientras carga. Convierte la carga en riesgo: cuanto más lejos, más tiempo expuesta.
- **Sí (sin preguntar):** rival CPU en la mitad derecha como reloj vivo. Da la tensión VERSUS con un solo jugador humano y sin red; castiga farmear rozones sin avanzar.
- **No:** segundo jugador humano. Fuera por las respuestas comunes.
- **No:** fantasma grabado de la mejor partida. Requeriría persistencia (localStorage o BD).
- **Sí (sin preguntar):** IA por simulación de posiciones futuras con tasa de error. Determinista salvo el `rng`; la dificultad sube con el nivel sin trampas.
- **Sí (sin preguntar):** tráfico compartido entre ambas mitades. Misma autopista para las dos; la línea central solo separa columnas de rana.
- **Sí (sin preguntar):** perder la manga cuesta una vida. Sin ello la rival no tendría consecuencias.
- **Sí (sin preguntar):** 3 vidas, +1 cada 5 mangas ganadas, tope 5. Vidas libres según el juego; recompensa la racha.
- **Sí (sin preguntar):** combo con caducidad de 2,5 s y multiplicador hasta ×5. Premia encadenar precisión, no solo cruzar.
- **Sí (sin preguntar):** 12 carriles fijos con mediana segura y tabla de velocidades concreta. Lectura clara del ritmo; la progresión viene de la velocidad.
- **Sí (sin preguntar):** tope de velocidad en el nivel 11 (×1,7). Evita vehículos que crucen una celda en menos de un frame útil.
- **Sí:** estado `ready`, rótulo `result`, popups y anillo de carga en canvas. Excepción documentada al contrato (como SPEC 07/08): son arranque y feedback de mecánica, no HUD ni GAME OVER.
- **No:** buffer de input en el aire. La precisión del ángulo exige pulsar en el momento.
- **No:** sonido. Respuesta común y contrato.
- **No:** assets externos. `references/source-assets/` solo tiene frutas de Snake; todo vectorial.
- **Sí:** mantener CHECK de `score` ≤ 1.000.000 y limitar el score en el motor. Una manga típica da 500–2 000 puntos.

## Riesgos

| Riesgo                                                               | Mitigación                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| La rival es imbatible o trivial                                      | Parámetros por nivel en `CONFIG.CPU` (`thinkMs`, `error`, `maxJump`); ajustar tras pruebas. |
| Farmear rozones en la fila 13 sin avanzar                            | La rival gana la manga y cuesta una vida; el bonus de tiempo cae con los segundos.          |
| La IA consume CPU al simular futuros                                 | Decide cada `thinkMs` (≥ 120 ms) y solo evalúa ≤ 6 celdas candidatas.                       |
| Tecla de carga soltada durante la pausa provoca un salto al reanudar | Cancelar la carga al pausar; se ignora el `keyup` sin carga activa.                         |
| Popups y rótulos en canvas se confunden con HUD                      | Solo feedback local de 600–900 ms; nunca score total, vidas ni nivel.                       |
| `preventDefault` de `Espacio` o flechas rompe el input de iniciales  | Ignorar targets `input`/`textarea`; motor detenido en game over.                            |
| Doble montaje (Strict Mode) duplica loops o listeners                | `destroy()` cancela rAF y quita listeners; criterio SALIR/volver.                           |
| Empate exacto de llegada en el mismo frame                           | Se procesa primero la jugadora; gana ella.                                                  |

## Lo que **no** está en esta spec

- Sonido.
- Récords locales y localStorage.
- Menú propio, HUD y GAME OVER en canvas.
- Persistencia del tema.
- Controles táctiles o con ratón.
- Segundo jugador humano y juego en red.
- Fantasma de la mejor partida.
- Río, troncos, tortugas y casillas de meta del Frogger clásico.
- Selector de dificultad de la rival.
- Redirect de `/games/ranaria`.

Cada uno, si llega, va en su propia spec.
