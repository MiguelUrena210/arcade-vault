# SPEC 10 — Skins claras y oscuras por juego

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-10-26
> **Objetivo:** Que cada juego jugable (Asteroids, Arkanoid, Snake, Tetris) tenga ≥3 skins, con ≥1 de fondo claro y ≥1 de fondo oscuro, contraste WCAG ≥3:1 en cada elemento jugable (texto ≥4.5:1) y sin colores hardcodeados que rompan en fondo claro.

## Auditoría (estado actual)

Luminancia relativa WCAG del fondo: clara si L > 0.5. Contraste = ratio WCAG contra el fondo.

| Juego     | Skins                      | Claras              | Oscuras | Contraste mínimo                            | Cumple |
| --------- | -------------------------- | ------------------- | ------- | ------------------------------------------- | ------ |
| asteroids | neon, classic              | 0                   | 2       | 5.47 (asteroide `#ff006e` en NEÓN)          | ✘      |
| arkanoid  | neon, classic              | 0                   | 2       | 4.84 (ladrillo `#e03a3a` en CLÁSICO)        | ✘      |
| snake     | neon, classic              | 1 (CLÁSICO, L 0.58) | 1       | **2.51** (cuerpo `#4a75e8` sobre `#aad751`) | ✘      |
| tetris    | neon, retro, pastel, pixel | 0                   | 4       | 4.30 (J `#5c6bc0` en PIXEL)                 | ✘      |

Problemas detectados:

- Tetris: todas las skins usan la constante `BACKGROUND = "#000"`; no hay fondo por skin real.
- Tetris `engine.ts` `drawNext`: etiqueta `NEXT` con `rgba(255, 255, 255, 0.6)` literal (invisible en fondo claro).
- Arkanoid `engine.ts` `drawMenu`: pista inferior con `rgba(255, 255, 255, 0.6)` literal; la opción seleccionada usa `pal.bricks.yellow` como color de texto.
- Arkanoid `engine.ts` `themeOf` y `theme.ts` `paletteFor`: cualquier id distinto de `classic` cae en `neon` (no admite un tercer tema).
- Arkanoid CLÁSICO depende de `arkanoid.png`; sin cargar usa colores NEÓN sin glow (`FALLBACK`). Correcto, se mantiene.
- Arkanoid `CONFIG.GRAY_LOOK`/`CONFIG.CRACKS`: tintes y grietas se dibujan sobre el ladrillo, no sobre el fondo; válidos en claro y oscuro.
- Snake `theme.ts` `drawFruit`: fallback `#ff006e` literal (2.29:1 sobre el damero de CLÁSICO).
- Snake CLÁSICO: cuerpo `#4a75e8` a 2.51:1 sobre `#aad751` y 2.36:1 sobre `#a2d149`.
- Snake `engine.ts` `themeOf` y `theme.ts` `drawBoard`/`segment`: ramas por `theme === "classic"`; no admiten un tercer tema.
- Asteroids: sin literales fuera de la paleta; `ctx.lineWidth = 1.5` fijo en nave y asteroides.
- Global (fuera de alcance): `.crt-screen::before` (viñeta) y `::after` (scanlines `multiply`) oscurecen bordes y franjas en skins claras.

## Alcance

**Dentro:**

- **Asteroids:** skin nueva `notebook` / CUADERNO (clara). `Palette` gana `grid` y `lineWidth`.
- **Arkanoid:** skin nueva `poster` / PÓSTER (clara). `Palette` gana `accent`, `hint` y `brickStroke`; se generalizan `themeOf` y `paletteFor`.
- **Snake:** skin nueva `amber` / ÁMBAR (oscura) y ajuste de colores de CLÁSICO para pasar 3:1. `Palette` gana `fruit`, `board` y `segment`; las ramas por id pasan a ser por paleta.
- **Tetris:** skin nueva `toy` / JUGUETE (clara). `Skin` gana `text`; la etiqueta NEXT usa `skin.text`.
- Registro: cada skin nueva se añade **al final** de `ENGINES[slug].themes`; el primer tema (`neon`) sigue siendo el default y los ids existentes no cambian.
- El botón ESTILO recorre todos los temas en caliente vía `setTheme`, sin reiniciar la partida.

**Fuera:**

- Persistir el tema elegido (localStorage) y selector de temas distinto del botón ESTILO.
- Cambios en `components/`, `app/globals.css` (viñeta/scanlines del CRT) y en las portadas.
- Assets nuevos (spritesheets, fuentes, imágenes). Todas las skins nuevas son vectoriales.
- Recolorear los sprites de `arkanoid.png` y `fruits.png`.
- Rediseñar las skins existentes salvo el ajuste de contraste de Snake CLÁSICO.

## Skins por juego

| Juego     | id         | Label    | Fondo  | Concepto                                                                      |
| --------- | ---------- | -------- | ------ | ----------------------------------------------------------------------------- |
| asteroids | `neon`     | NEÓN     | oscura | (existente, default) vectores cian/magenta con glow.                          |
| asteroids | `classic`  | CLÁSICO  | oscura | (existente) vectores blancos de máquina de 1979.                              |
| asteroids | `notebook` | CUADERNO | clara  | Garabato a bolígrafo en papel cuadriculado: tinta azul, balas de boli rojo.   |
| arkanoid  | `neon`     | NEÓN     | oscura | (existente, default).                                                         |
| arkanoid  | `classic`  | CLÁSICO  | oscura | (existente) spritesheet original.                                             |
| arkanoid  | `poster`   | PÓSTER   | clara  | Cartel serigrafiado: tintas planas saturadas con contorno negro sobre marfil. |
| snake     | `neon`     | NEÓN     | oscura | (existente, default).                                                         |
| snake     | `classic`  | CLÁSICO  | clara  | (existente, colores ajustados) damero verde, serpiente azul redondeada.       |
| snake     | `amber`    | ÁMBAR    | oscura | Terminal de fósforo ámbar: segmentos como bloques de celda separados.         |
| tetris    | `neon`     | NEÓN     | oscura | (existente, default).                                                         |
| tetris    | `retro`    | RETRO    | oscura | (existente).                                                                  |
| tetris    | `pastel`   | PASTEL   | oscura | (existente).                                                                  |
| tetris    | `pixel`    | PIXEL    | oscura | (existente).                                                                  |
| tetris    | `toy`      | JUGUETE  | clara  | Piezas de construcción de juguete: colores sólidos, contorno y tachuela.      |

Resultado: asteroids 3 (1 clara), arkanoid 3 (1 clara), snake 3 (1 clara), tetris 5 (1 clara).

## Modelo de datos

### Asteroids — `games/asteroids/theme.ts`

```ts
export type AsteroidsTheme = "neon" | "classic" | "notebook";

export type Palette = {
  bg: string;
  grid: string | null; // líneas de cuadrícula cada 40 px; null = sin cuadrícula
  ship: string;
  flame: string;
  bullet: string;
  asteroid: string;
  particle: string; // "r,g,b"
  lineWidth: number; // trazo de nave y asteroides
  glow: number;
};
```

`neon` y `classic` reciben `grid: null`, `lineWidth: 1.5` (sin cambio visual).

**`notebook` (clara, fondo L 0.880):**

| Clave       | Valor                     | Contraste vs fondo |
| ----------- | ------------------------- | ------------------ |
| `bg`        | `#f5f1e6`                 | —                  |
| `grid`      | `rgba(29, 58, 138, 0.10)` | decorativo         |
| `ship`      | `#1d3a8a`                 | 9.18               |
| `flame`     | `rgba(200, 16, 46, 0.85)` | 4.42 (compuesto)   |
| `bullet`    | `#c8102e`                 | 5.21               |
| `asteroid`  | `#2b2b2b`                 | 12.5               |
| `particle`  | `"29,58,138"`             | 9.18 (alpha 1)     |
| `lineWidth` | `2`                       | —                  |
| `glow`      | `0`                       | —                  |

`engine.ts` `draw()`: tras rellenar `bg`, si `palette.grid` dibuja líneas verticales y horizontales cada 40 px (`lineWidth = 1`). `entities.ts`: `Ship.draw` y `Asteroid.draw` usan `palette.lineWidth` en lugar de `1.5`.

### Arkanoid — `games/arkanoid/theme.ts`

```ts
export type ArkanoidTheme = "neon" | "classic" | "poster";

export type Palette = {
  bg: string;
  paddle: string;
  ball: string;
  bricks: Record<BrickColor, string>;
  brickStroke: string | null; // contorno de ladrillo vectorial; null = sin contorno
  glow: number;
  text: string; // título, niveles y "ESPACIO PARA LANZAR"
  accent: string; // nivel seleccionado en el menú (antes bricks.yellow)
  hint: string; // pista inferior del menú (antes rgba blanco literal)
};
```

Valores nuevos de las skins existentes (sin cambio visual): `neon` → `brickStroke: null`, `accent: "#f5ff00"`, `hint: "rgba(255, 255, 255, 0.6)"`; `classic` → `brickStroke: null`, `accent: "#e6d83a"`, `hint: "rgba(255, 255, 255, 0.6)"`. `FALLBACK` sigue siendo `{ ...PALETTES.neon, glow: 0 }`.

**`poster` (clara, fondo L 0.827), vectorial:**

| Clave            | Valor     | Contraste vs fondo |
| ---------------- | --------- | ------------------ |
| `bg`             | `#f2ead8` | —                  |
| `paddle`         | `#263238` | 11.0               |
| `ball`           | `#1a1a1a` | 14.5               |
| `bricks.red`     | `#c62828` | 4.69               |
| `bricks.cyan`    | `#00838f` | 3.78               |
| `bricks.green`   | `#2e7d32` | 4.28               |
| `bricks.magenta` | `#8e24aa` | 5.88               |
| `bricks.yellow`  | `#a66a00` | 3.74               |
| `bricks.hotpink` | `#d81b60` | 4.13               |
| `bricks.gray`    | `#6d6d6d` | 4.32               |
| `brickStroke`    | `#1a1a1a` | 14.5               |
| `glow`           | `0`       | —                  |
| `text`           | `#1a1a1a` | 14.5               |
| `accent`         | `#c62828` | 4.69               |
| `hint`           | `#4a4a4a` | 7.40               |

Cambios estructurales:

- `paletteFor(theme, sheetReady)`: `classic` sin hoja → `FALLBACK`; resto → `PALETTES[theme]`.
- `engine.ts` `themeOf(id)`: devuelve `id` si es clave de `PALETTES`, si no `"neon"`. `ensureSheet()` y `spriteSheet` solo para `classic` (como hoy).
- `drawBricks` (rama vectorial): si `pal.brickStroke`, `strokeRect` de 2 px sobre el ladrillo tras el relleno, sin glow.
- `drawMenu`: opción seleccionada con `pal.accent`; pista inferior con `pal.hint`.

### Snake — `games/snake/theme.ts`

```ts
export type SnakeTheme = "neon" | "classic" | "amber";

export type Palette = {
  bg: string;
  bgAlt: string; // segundo color del damero o color de línea de la grilla
  board: "grid" | "checker";
  segment: "rect" | "round" | "block"; // block = celdas separadas, sin conectores
  snake: string;
  head: string;
  eye: string;
  fruit: string; // fallback mientras no carga fruits.png
  glow: number;
  text: string;
};
```

- `drawBoard`, `segment` y `drawSnake` dejan de recibir `theme` y ramifican por `p.board` / `p.segment`. `block`: cada celda se dibuja como cuadrado con `INSET = 5` y sin el rectángulo puente entre celdas consecutivas.
- `drawFruit(ctx, fruit, sheet, p)`: el fallback usa `p.fruit`.
- `engine.ts` `themeOf(id)`: devuelve `id` si es clave de `PALETTES`, si no `"neon"`.

`neon`: `board: "grid"`, `segment: "rect"`, `fruit: "#ff006e"` (5.30), resto igual.

**`classic` (clara, fondo L 0.577) — ajuste de contraste:**

| Clave     | Antes               | Después   | Contraste vs `bg` / vs `bgAlt`  |
| --------- | ------------------- | --------- | ------------------------------- |
| `bg`      | `#aad751`           | `#aad751` | —                               |
| `bgAlt`   | `#a2d149`           | `#a2d149` | —                               |
| `board`   | —                   | `checker` | —                               |
| `segment` | —                   | `round`   | —                               |
| `snake`   | `#4a75e8`           | `#2f56c4` | 3.86 / 3.62 (antes 2.51 / 2.36) |
| `head`    | `#3d63c9`           | `#2445a8` | 5.03 / 4.72                     |
| `eye`     | `#fff`              | `#fff`    | 8.43 vs cabeza                  |
| `fruit`   | (`#ff006e` literal) | `#c2185b` | 3.51 / 3.29 (antes 2.29)        |
| `glow`    | `0`                 | `0`       | —                               |
| `text`    | `#1f3b0a`           | `#1f3b0a` | 7.43 / 6.96                     |

**`amber` (oscura, fondo L 0.004):**

| Clave     | Valor                     | Contraste vs fondo |
| --------- | ------------------------- | ------------------ |
| `bg`      | `#140c00`                 | —                  |
| `bgAlt`   | `rgba(255, 176, 0, 0.08)` | decorativo         |
| `board`   | `grid`                    | —                  |
| `segment` | `block`                   | —                  |
| `snake`   | `#ffb000`                 | 10.6               |
| `head`    | `#ffd27a`                 | 13.6               |
| `eye`     | `#140c00`                 | 13.6 vs cabeza     |
| `fruit`   | `#ff5a1f`                 | 6.22               |
| `glow`    | `4` (atenuado)            | —                  |
| `text`    | `#ffb000`                 | 10.6               |

### Tetris — `games/tetris/theme.ts`

```ts
export type TetrisTheme = "neon" | "retro" | "pastel" | "pixel" | "toy";

export type Skin = {
  label: string;
  colors: string[]; // [sin uso, I, O, T, S, Z, J, L]
  background: string;
  grid: string; // grilla, borde del pozo y marco de NEXT
  text: string; // etiqueta NEXT (antes rgba blanco literal en engine.ts)
  drawBlock(ctx, px, py, size, color, alpha): void;
};
```

Skins existentes: `text: "rgba(255, 255, 255, 0.6)"` (7.4:1 sobre `#000`, sin cambio visual). `engine.ts` `drawNext` usa `skin.text`.

**`toy` (clara, fondo L 0.872):**

| Clave        | Valor                 | Contraste vs fondo |
| ------------ | --------------------- | ------------------ |
| `background` | `#f3f0e8`             | —                  |
| `grid`       | `rgba(0, 0, 0, 0.10)` | decorativo         |
| `text`       | `#3a3a3a`             | 9.99               |
| I            | `#0277bd`             | 4.21               |
| O            | `#9c7100`             | 3.86               |
| T            | `#7b1fa2`             | 7.20               |
| S            | `#2e7d32`             | 4.50               |
| Z            | `#c62828`             | 4.94               |
| J            | `#283593`             | 9.12               |
| L            | `#e65100`             | 3.33               |

`drawBlock` de `toy` (sin glow): relleno `color` en `px+1, py+1, size-2, size-2`; contorno 1 px `rgba(0, 0, 0, 0.35)`; tachuela central (círculo de radio `size * 0.22`) con relleno `color`, borde superior-izquierdo `rgba(255, 255, 255, 0.45)` y sombra inferior-derecha `rgba(0, 0, 0, 0.25)`. Respeta `alpha` (pieza fantasma a 0.2).

Convenciones (todas las skins nuevas):

- Glow solo en skins oscuras (`amber` con `glow: 4`); claras con `glow: 0` y `shadowBlur` a 0 tras dibujar.
- Todo color proviene de la paleta/skin; ningún literal de color nuevo en `engine.ts`/`entities.ts`.
- La pieza fantasma de Tetris (alpha 0.2), partículas en desvanecimiento y explosiones son ayudas transitorias: el contraste se mide a alpha 1.
- Sin assets nuevos; Canvas 2D 800×600; sin HUD, menús nuevos, GAME OVER, sonido ni localStorage.

## Archivos a tocar

- `games/asteroids/theme.ts`, `games/asteroids/engine.ts` (cuadrícula), `games/asteroids/entities.ts` (`lineWidth`).
- `games/arkanoid/theme.ts`, `games/arkanoid/engine.ts` (`themeOf`, `drawMenu`).
- `games/snake/theme.ts`, `games/snake/engine.ts` (`themeOf`, llamadas a `drawBoard`/`drawSnake`/`drawFruit`).
- `games/tetris/theme.ts`, `games/tetris/engine.ts` (`drawNext`).
- `games/registry.ts`: añadir al final `{ id: "notebook", label: "CUADERNO" }`, `{ id: "poster", label: "PÓSTER" }`, `{ id: "amber", label: "ÁMBAR" }`, `{ id: "toy", label: "JUGUETE" }`.

## Plan de implementación

1. **Tetris:** añadir `text` a `Skin` y a las 4 skins; `drawNext` con `skin.text`; skin `toy`; registrar. Verificar que NEÓN/RETRO/PASTEL/PIXEL se ven igual.
2. **Asteroids:** `grid` y `lineWidth` en `Palette`; cuadrícula en `draw()`; `lineWidth` en `Ship`/`Asteroid`; skin `notebook`; registrar.
3. **Arkanoid:** `brickStroke`, `accent`, `hint` en `Palette`; generalizar `themeOf`/`paletteFor`; contorno en `drawBricks`; `drawMenu` con `accent`/`hint`; skin `poster`; registrar.
4. **Snake:** `board`, `segment`, `fruit` en `Palette`; quitar ramas por id; segmento `block`; ajuste de CLÁSICO; skin `amber`; generalizar `themeOf`; registrar.
5. `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] `ENGINES`: asteroids 3 temas, arkanoid 3, snake 3, tetris 5; cada id coincide con una clave de `PALETTES`/`SKINS` y del tipo `<Juego>Theme`.
- [ ] Cada juego tiene ≥1 skin con fondo de L > 0.5 y ≥1 con L ≤ 0.5 (según tablas de esta spec).
- [ ] Contrastes de las tablas: todo elemento jugable ≥3:1 contra el fondo (y contra `bgAlt` en Snake CLÁSICO); texto en canvas (hint de Snake, menú y "ESPACIO PARA LANZAR" de Arkanoid, NEXT de Tetris) ≥4.5:1.
- [ ] El primer tema de cada juego sigue siendo `neon` y la página arranca en NEÓN; ids existentes sin cambios.
- [ ] NEÓN/CLÁSICO de Asteroids y Arkanoid y NEÓN/RETRO/PASTEL/PIXEL de Tetris se ven igual que antes; Snake CLÁSICO solo cambia los tonos de serpiente/cabeza y el fallback de fruta.
- [ ] El botón ESTILO recorre todos los temas en orden (p. ej. NEÓN → CLÁSICO → CUADERNO → NEÓN) sin reiniciar la partida ni perder score, nivel o vidas.
- [ ] Skins claras sin glow (`shadowBlur` 0); `amber` con glow 4.
- [ ] `grep -n "rgba(255, 255, 255, 0.6)" games/*/engine.ts` sin resultados; `grep -n '#ff006e' games/snake/theme.ts` solo en `PALETTES.neon`.
- [ ] Arkanoid PÓSTER: ladrillos con contorno negro, menú legible (nivel seleccionado en rojo, pista gris oscuro), ladrillos gray con tinte y grietas visibles; no carga `arkanoid.png` si nunca se elige CLÁSICO.
- [ ] Arkanoid CLÁSICO sin hoja cargada sigue usando colores NEÓN sin glow.
- [ ] Snake ÁMBAR: segmentos como bloques separados por celda; con `fruits.png` bloqueado se ve el círculo `#ff5a1f`.
- [ ] Asteroids CUADERNO: cuadrícula tenue, nave y asteroides con trazo de 2 px; la llama del propulsor se ve.
- [ ] Tetris JUGUETE: piezas con tachuela, pieza fantasma visible, etiqueta NEXT legible.
- [ ] Sin assets nuevos, sin escritura en localStorage, sin cambios en `components/` ni `app/`.

## Decisiones

- **Sí:** una sola skin nueva por juego. Cumple ≥3 y clara/oscura con el menor cambio.
- **Sí:** skins nuevas al final de `themes`. No altera el default ni el orden conocido de ESTILO.
- **Sí:** ajustar colores de Snake CLÁSICO. Es el único elemento existente bajo 3:1; el id y el concepto no cambian.
- **No:** convertir PASTEL de Tetris en clara. Sus colores pastel no alcanzan 3:1 sobre fondo claro.
- **Sí:** Snake ÁMBAR oscura (no clara). Snake ya tiene CLÁSICO claro; ÁMBAR aporta un concepto nuevo (monocromo fósforo, bloques).
- **Sí:** colores de paleta en vez de literales (`accent`, `hint`, `text`, `fruit`). Requisito para fondos claros.
- **Sí:** ramificar dibujo por propiedades de paleta (`board`, `segment`, `brickStroke`, `grid`), no por id. Escala a nuevas skins sin `if (theme === …)`.
- **No:** recolorear sprites (`arkanoid.png`, `fruits.png`). Requeriría assets nuevos.

## Riesgos

| Riesgo                                                                                          | Mitigación                                                                 |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Viñeta y scanlines del CRT oscurecen bordes en skins claras                                     | Aceptado en esta spec; ajuste de `.crt-screen` en otra spec si molesta.    |
| Sprites de `fruits.png` (p. ej. plátano amarillo) con poco contraste sobre el damero de CLÁSICO | Limitación del asset; fuera de alcance. El fallback sí cumple 3:1.         |
| Ladrillos `cyan`/`yellow` de PÓSTER cerca del límite (3.7:1)                                    | Contorno negro de 2 px (14.5:1) refuerza el borde.                         |
| Pieza L de JUGUETE a 3.33:1                                                                     | Contorno `rgba(0,0,0,0.35)` en cada bloque.                                |
| Cambiar firmas de `drawBoard`/`drawSnake`/`drawFruit` rompe llamadas                            | Solo se llaman desde `games/snake/engine.ts`; `npm run build` lo verifica. |
| `themeOf` antiguo devuelve `neon` para ids nuevos                                               | Generalizar con `id in PALETTES`; criterio ESTILO recorre todos los temas. |

## Lo que **no** está en esta spec

- Persistencia del tema elegido.
- Ajustes de `.crt-screen` para skins claras.
- Variantes de sprites o assets nuevos.
- Skins para juegos simulados.

Cada uno, si llega, va en su propia spec.
