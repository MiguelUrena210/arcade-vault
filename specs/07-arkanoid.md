# SPEC 07 — Arkanoid jugable con leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06
> **Fecha:** 2026-10-23
> **Objetivo:** Portar a TypeScript el Arkanoid de `references/started-games/04 - arkanoid/` sobre el registro de motores y hacerlo jugable con leaderboard en `/games/arkanoid/play`, reemplazando BLOQUE BUSTER.

## Alcance

**Dentro:**

- Fila `bloque-buster` de `public.games` reemplazada por migración: slug `arkanoid`, title `ARKANOID`, cover `cover-arkanoid`, `short`/`long` nuevos, `saves_scores = true`. `cat` (`ARCADE`), `color` (`cyan`) y `sort_order` (1) sin cambios.
- Portada nueva `.cover-arkanoid` en `app/globals.css` diseñada con `/frontend-design`; se elimina `.cover-bricks`.
- Ticker de `lib/home.ts`: `game: "Bloque Buster"` → `"Arkanoid"`.
- Motor portado en `games/arkanoid/` con mecánicas idénticas a la referencia: canvas 800×600, techo en `y = 56` (franja `HUD_HEIGHT` vacía), pala 100×20 a 520 px/s en `y = 560`, bola 14 px a 380 px/s, rebote en pala por punto de impacto (máx. 60° desde la vertical), lanzamiento a 20°, bloques 70×24 con gap 4 y offset (32, 70), colisión por eje de menor penetración, 10 puntos por bloque, `gray` de 2/3 golpes que suman `10 × maxHp` al romperse, 3 vidas.
- Los 5 mapas de `levels.js` en ciclo infinito: nivel `N` (1-based, sin límite) usa `LEVELS[(N - 1) % 5]`.
- Velocidad de la bola `380 × (1 + 0.08 × min(N - 1, 9))`: acelera hasta el nivel 10 y luego se mantiene (≈ 654 px/s).
- Al limpiar un nivel se pasa directo al siguiente en estado `ready` (bola en la pala); score y vidas se conservan.
- Estado `ready`: bola pegada a la pala hasta `Espacio`; pista `ESPACIO PARA LANZAR` en canvas.
- Menú inicial en canvas (al entrar y en JUGAR DE NUEVO): título `ARKANOID` y lista `NIVEL 1`…`NIVEL 5`; `↑`/`↓` + `Enter` eligen nivel inicial, `Espacio` empieza en el nivel 1.
- Explosiones de 150 ms al romper un bloque: frames del spritesheet en CLÁSICO, destello vectorial en NEÓN.
- Tinte y grietas del `gray` según hp restante (`GRAY_LOOK`, `CRACKS`), en ambos temas.
- Sonido de rebote (paredes, techo, pala, bloque) y de rotura con `ball-bounce.mp3` y `break-sound.mp3`; tecla `M` silencia/activa (no se persiste).
- 2 temas: NEÓN (default, vectorial con glow) y CLÁSICO (spritesheet de la referencia). El botón ESTILO alterna sin reiniciar; no se persiste.
- Assets copiados a `public/games/arkanoid/`.
- HUD React: Puntuación, Vidas (3) y Nivel del motor.
- PAUSA/`P`/`Escape`, FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO de la plataforma; GUARDAR PUNTUACIÓN real vía `saveScore` existente.

**Fuera (specs futuras):**

- Menú de partida propio (Esc → Continuar / Reiniciar nivel / Seleccionar nivel).
- Pantalla `¡GANASTE!` y fin al completar el nivel 5 (sustituido por ciclo infinito).
- Overlay `Nivel N completado`.
- HUD y GAME OVER en canvas.
- Botón de sonido en el HUD React y persistir el silencio.
- Persistir el tema elegido.
- Controles táctiles / ratón.
- Récords locales.
- Redirect de `/games/bloque-buster`.

## Modelo de datos

```sql
-- supabase/migrations/20261023000100_arkanoid.sql (solo datos)
update public.games
set slug = 'arkanoid',
    title = 'ARKANOID',
    short = 'Rebota la bola, rompe el muro y no la dejes caer.',
    long = 'Mueve la pala con ← → o A D y lanza la bola con Espacio. Cada bloque vale 10 puntos; los grises aguantan 2 o 3 golpes y valen 10 por golpe. Cinco muros distintos se repiten en ciclo y la bola acelera un 8 % por nivel hasta el 10. Tienes 3 vidas.',
    cover = 'cover-arkanoid',
    saves_scores = true
where slug = 'bloque-buster';
```

```ts
// games/registry.ts (entrada nueva)
arkanoid: {
  create: createArkanoid,
  width: 800,
  height: 600,
  themes: [
    { id: "neon", label: "NEÓN" },
    { id: "classic", label: "CLÁSICO" },
  ],
},
```

```ts
// games/arkanoid/engine.ts
export type ArkanoidTheme = "neon" | "classic";
export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  theme?: string, // default "neon"; id inválido → "neon"
): EngineHandle;

// estado interno (closure, no exportado)
type Mode = "menu" | "ready" | "playing" | "gameover";
type State = {
  mode: Mode;
  score: number;
  lives: number;
  level: number; // 1-based, sin límite
  menuIndex: number; // 0–4
  paddle: Paddle;
  ball: Ball;
  bricks: Brick[];
  explosions: Explosion[]; // { x, y, w, h, color, t } con t en ms
  muted: boolean;
};

// games/arkanoid/config.ts — CONFIG de config.js (valores idénticos)
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  HUD_HEIGHT: 56,
  PADDLE: { w: 100, h: 20, speed: 520, y: 560 },
  BALL: {
    size: 14,
    speed: 380,
    maxAngle: 60,
    launchAngle: 20,
    speedStep: 0.08,
    maxSpeedLevel: 10,
  },
  BRICKS: {
    cols: 10,
    maxRows: 10,
    w: 70,
    h: 24,
    gap: 4,
    offsetX: 32,
    offsetY: 70,
  },
  LIVES: 3,
  POINTS_PER_BRICK: 10,
  POINTS_PER_HIT_GRAY: 10,
  GRAY_LOOK: {/* 3, 2, 1 como la referencia */},
  CRACKS: {/* color, width, lines como la referencia */},
  EXPLOSION_MS: 150,
} as const;

// games/arkanoid/levels.ts — LEVELS de levels.js (5 mapas de texto, mismos caracteres)
export type BrickColor =
  "red" | "cyan" | "green" | "magenta" | "yellow" | "hotpink" | "gray";

// games/arkanoid/entities.ts — utilidades puras portadas de entities.js
// createPaddle, updatePaddle(paddle, dir, dt), createBall, attachBall, ballSpeed(level),
// launchBall, updateBall → boolean, collideBallPaddle → boolean,
// createBricks(level) (usa LEVELS[(level - 1) % 5]), collideBallBricks → Brick | null

// games/arkanoid/sprites.ts — SPRITES y EXPLOSION_FRAMES de spritesheet.js (coordenadas idénticas)

// games/arkanoid/theme.ts
export type Palette = {
  bg: string;
  paddle: string;
  ball: string;
  bricks: Record<BrickColor, string>;
  glow: number; // shadowBlur; 0 en CLÁSICO
  text: string;
};
export const PALETTES: Record<ArkanoidTheme, Palette>;
```

Convenciones:

- Canvas 800×600; la franja `y = 0..56` queda vacía (sin HUD).
- `stats`: `{ score, lives, level }`; `onStats` solo cuando cambia alguno. En `menu` se emite `{ 0, 3, nivel elegido }` al empezar.
- Bola perdida (`y > 600`): `lives--`; con 0 vidas `mode = "gameover"` y `onGameOver(score)`; si no, `ready`.
- Sin bloques vivos: `level++`, `createBricks(level)`, pala centrada, explosiones vaciadas, `mode = "ready"`.
- `dt` en segundos con clamp `1/30` (como la referencia).
- Input por `KeyboardEvent.code` sobre `window`: `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` (mantenidas) mueven la pala; `Space` empieza/lanza; en `menu` `ArrowUp`/`ArrowDown` mueven la selección en ciclo y `Enter` confirma; `KeyM` alterna silencio. Se ignora `event.repeat` para pulsaciones (como `input.js`).
- `preventDefault` solo en flechas y `Space`; nunca si `event.target` es `input`/`textarea` (ahí se ignora el evento entero).
- En pausa o game over el motor no avanza ni procesa pulsaciones; `keyup` sí actualiza teclas mantenidas para que la pala no quede “pegada”. Al reanudar se vacían las pulsaciones pendientes.
- Menú y pista `ESPACIO PARA LANZAR` en `bold monospace`, colores de la paleta; sin GAME OVER ni score en canvas.
- CLÁSICO: `Image` con `src = "/games/arkanoid/spritesheet-breakout.png"`; mientras no carga se dibuja con la paleta NEÓN sin glow. Explosión = frame `floor(t / 150 × 4)`; `gray` reutiliza los de `red`.
- NEÓN: bloques como rectángulos con color de paleta y `shadowBlur = glow` (reset a 0 tras dibujar); explosión = rectángulo que crece y se desvanece en 150 ms.
- Sonido: `new Audio("/games/arkanoid/sounds/…")` creado en `create`; cada reproducción clona el nodo y `play().catch(() => {})`. Con `muted` no suena. `destroy()` pausa los clones en curso.
- `restart()`: score 0, vidas 3, nivel 1, `mode = "menu"`, `menuIndex = 0`; conserva tema y silencio.
- Números del HUD con `toLocaleString("es-ES")` (ya lo hace `GamePlayer`).
- Nada se escribe en localStorage/sessionStorage.

## Plan de implementación

Antes de los pasos 3 y 7, leer en `node_modules/next/dist/docs/` lo relativo a Client Components, `cacheComponents` y `01-app/03-api-reference/03-file-conventions/public-folder.md`.

1. **Migración** (`.claude/skills/add-game/checklist.md` §1): `list_tables` + `list_migrations`; crear `supabase/migrations/20261023000100_arkanoid.sql` con el SQL de Modelo de datos; aplicar con MCP `apply_migration`; `npm run db:types`; `get_advisors` (security) sin avisos nuevos. Solo datos: `docs/data-dictionary.md` no cambia (revisar aviso del drift hook). En el mismo paso: `lib/home.ts` ticker `"Bloque Buster"` → `"Arkanoid"` y `.cover-bricks` → `.cover-arkanoid` provisional en `app/globals.css`. `grep -rn -i "bloque\|buster\|cover-bricks" app components lib games` vacío (salvo `database.types.ts` si aplica). Build pasa; `/games/arkanoid` muestra el detalle con el juego simulado.
2. **Portada** (`checklist.md` §2): rediseñar `.cover-arkanoid` (+ `::before`/`::after`) con `/frontend-design`, coherente con las demás portadas (gradientes CSS, sin imágenes). Verificar en `/games` y `/games/arkanoid`.
3. **Assets**: copiar `assets/spritesheet-breakout.png` a `public/games/arkanoid/spritesheet-breakout.png` y `assets/sounds/*.mp3` a `public/games/arkanoid/sounds/` (origen: `references/started-games/04 - arkanoid/`). Abrir las URLs en `npm run dev` y comprobar 200.
4. Crear `games/arkanoid/config.ts` y `games/arkanoid/levels.ts` (`.claude/skills/add-game/contract.md` § Reglas del motor: port fiel de constantes y mapas).
5. Crear `games/arkanoid/entities.ts`: utilidades puras portadas de `entities.js`, con `ballSpeed` topada en nivel 10 y `createBricks` en ciclo. Sin dibujo ni globals.
6. Crear `games/arkanoid/sprites.ts` (coordenadas de `spritesheet.js`) y `games/arkanoid/theme.ts` (`PALETTES` NEÓN/CLÁSICO y funciones de dibujo de pala, bola, bloques, daño `gray` y explosiones que reciben `ctx`, `Palette` e imagen opcional).
7. Crear `games/arkanoid/engine.ts` (`contract.md` § Reglas del motor): `createArkanoid` con loop rAF, modos `menu`/`ready`/`playing`/`gameover`, ciclo de niveles, vidas, puntuación, input, sonido + `M`, carga del spritesheet, dibujo y `pause`/`resume`/`restart`/`setTheme`/`destroy`.
8. Registrar `arkanoid` en `games/registry.ts` (800×600, NEÓN/CLÁSICO). Sin cambios en `GamePlayer` ni `game-canvas.tsx`. `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra `arkanoid` con `saves_scores = true`, `cat = ARCADE`, `color = cyan`, `sort_order = 1`; `database.types.ts` regenerado.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] `/games/bloque-buster` devuelve la 404 temática y `grep -rn -i "bloque\|buster\|cover-bricks" app components lib games` no devuelve resultados.
- [ ] `/games` y `/games/arkanoid` muestran card/detalle con la portada nueva y los textos nuevos; JUGAR AHORA navega a `/games/arkanoid/play`.
- [ ] El canvas llena la pantalla del CRT y arranca en el menú `ARKANOID` con `NIVEL 1`…`NIVEL 5`.
- [ ] `↑`/`↓` mueven la selección en ciclo; `Enter` empieza en el nivel elegido (HUD Nivel = ese número); `Espacio` empieza en el 01.
- [ ] En `ready` la bola sigue a la pala y se ve `ESPACIO PARA LANZAR`; `Espacio` la lanza.
- [ ] `←`/`→` y `A`/`D` mueven la pala dentro de los límites; la página no hace scroll con flechas ni `Espacio`.
- [ ] La bola rebota en paredes, en el techo bajo la franja vacía de 56 px, en la pala (ángulo según punto de impacto) y en los bloques.
- [ ] Romper un bloque de color suma 10; un `gray` de 2 golpes suma 20 y uno de 3 suma 30 al romperse; los golpes intermedios cambian tinte/grietas y no suman.
- [ ] Al romper un bloque se ve la explosión en ambos temas.
- [ ] Suenan rebote y rotura; `M` los silencia y vuelve a activarlos.
- [ ] Al vaciar el muro el Nivel sube, aparece el siguiente mapa y la bola queda en la pala; tras el nivel 05 llega el 06 con el mapa del nivel 1.
- [ ] La bola es más rápida en cada nivel hasta el 10 y no acelera más en el 11.
- [ ] Perder la bola resta una vida en el HUD (`♥ ♥ ♥` → `♥ ♥`) y vuelve a `ready`; con 0 vidas se abre el modal FIN DEL JUEGO con la puntuación real; FIN también lo abre a mitad de partida.
- [ ] El canvas no dibuja score, vidas, nivel ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA; en pausa las teclas no mueven la pala ni lanzan la bola.
- [ ] Escribir en el input del modal (incluido espacio y `M`) no afecta al juego.
- [ ] JUGAR DE NUEVO vuelve al menú inicial con score 0, vidas 3, nivel 01.
- [ ] ESTILO alterna NEÓN ↔ CLÁSICO sin reiniciar la partida; CLÁSICO usa el spritesheet; al recargar arranca en NEÓN.
- [ ] SALIR y volver no duplica loops (la bola no se acelera) ni listeners ni sonidos.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=arkanoid` con la fila; Mejor global y Partidas actualizados en `/games/arkanoid`.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids y Tetris conservan sus temas y criterios de SPEC 04/06; los 5 juegos simulados restantes siguen con la arena simulada, sin botón ESTILO y sin leaderboard.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** reemplazar `bloque-buster` por `arkanoid`. Misma temática; evita dos juegos de ladrillos.
- **No:** fila nueva. Duplicaría el juego en el catálogo.
- **No:** redirect de `/games/bloque-buster`. Sin usuarios aún (criterio de SPEC 04).
- **Sí:** conservar `cat`, `color` y `sort_order`. Sin migración de enums.
- **Sí:** portada nueva con `/frontend-design`; se elimina `.cover-bricks`.
- **Sí:** temas NEÓN (vectorial, default) y CLÁSICO (spritesheet). Encaja con la estética de la plataforma y conserva el aspecto original.
- **Sí:** assets en `public/games/arkanoid/`. Servidos estáticos por Next sin import.
- **Sí:** ciclo infinito de los 5 mapas. Decisión del usuario; sustituye a `¡GANASTE!`.
- **Sí:** tope de velocidad en el nivel 10. Evita que la bola atraviese bloques de 24 px a velocidades altas.
- **No:** subpasos de física. Innecesarios con el tope.
- **Sí:** mantener la franja de 56 px y `offsetY = 70`. Física idéntica a la referencia.
- **Sí:** `dt` con clamp `1/30` en vez del `0.05` del contrato. Port fiel; reduce tunneling.
- **Sí:** pista `ESPACIO PARA LANZAR` y menú inicial en canvas. Excepción documentada al contrato: forman parte de la mecánica (lanzamiento y nivel inicial), no son HUD ni GAME OVER.
- **No:** arranque inmediato como asteroids/tetris. El menú inicial permite elegir nivel.
- **Sí:** selector de nivel solo en el menú inicial. `P`/`Escape` son de la plataforma.
- **No:** menú de partida con Esc, tecla `L` o botón NIVEL en el HUD. Conflicto con la pausa o nueva capacidad del contrato.
- **Sí:** pasar directo a `ready` al limpiar un nivel. Sin overlay de texto grande.
- **Sí:** sonido con tecla `M` en el motor. Sin cambios en `GamePlayer`; no se persiste.
- **No:** botón SONIDO en el HUD React. Nueva capacidad del contrato.
- **Sí:** explosiones y grietas de `gray`. Pedido explícito.
- **Sí:** mantener CHECK de `score` ≤ 1.000.000. Un ciclo de 5 niveles suma unos pocos miles de puntos.

## Riesgos

| Riesgo                                                             | Mitigación                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Autoplay bloqueado antes de la primera tecla                       | `play().catch(() => {})`; el primer sonido llega tras `Espacio`/`Enter`, que ya es interacción. |
| Spritesheet aún no cargado al cambiar a CLÁSICO                    | Fallback a dibujo vectorial sin glow hasta `onload`.                                            |
| Doble montaje (Strict Mode) duplica loops, listeners o sonidos     | `destroy()` cancela rAF, quita listeners y pausa clones; criterio SALIR/volver.                 |
| `preventDefault` de `Espacio` o `M` rompe el input de iniciales    | Ignorar targets `input`/`textarea`; motor detenido en game over.                                |
| Tecla mantenida durante la pausa deja la pala moviéndose al volver | `keyup` siempre actualiza teclas mantenidas; pulsaciones pendientes se vacían al reanudar.      |
| `shadowBlur` de NEÓN con hasta 100 bloques penaliza rendimiento    | Reset a 0 tras cada bloque; verificar fluidez en el mapa 5.                                     |
| Menú en canvas confunde con la pausa de la plataforma              | `P`/`Escape` siguen pausando también en el menú; overlay EN PAUSA encima.                       |

## Lo que **no** está en esta spec

- Menú de partida propio (Esc).
- Pantalla `¡GANASTE!` y overlay de nivel completado.
- HUD y GAME OVER en canvas.
- Botón de sonido en el HUD y persistencia del silencio.
- Persistencia del tema.
- Controles táctiles o con ratón.
- Récords locales.
- Redirect de `/games/bloque-buster`.

Cada uno, si llega, va en su propia spec.
