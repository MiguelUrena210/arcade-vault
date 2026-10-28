# Juegos implementados

Resumen de los juegos jugables de Arcade Vault. Datos de `public.games` y `public.game_stats` consultados el 2026-10-23 (proyecto `bffywagyecastmrxbnem`).

## Catálogo

| `sort_order` | `id` | `slug`        | Título      | `cat`   | `color` | Motor | `saves_scores` | Mejor  | Partidas |
| ------------ | ---- | ------------- | ----------- | ------- | ------- | ----- | -------------- | ------ | -------- |
| 1            | 1    | `arkanoid`    | ARKANOID    | ARCADE  | cyan    | ✅    | ✅             | 260    | 1        |
| 2            | 2    | `tetris`      | TETRIS      | PUZZLE  | magenta | ✅    | ✅             | 11 236 | 1        |
| 3            | 3    | `snake`       | SNAKE       | ARCADE  | green   | ✅    | ✅             | 90     | 1        |
| 4            | 4    | `gloton`      | GLOTÓN      | ARCADE  | yellow  | —     | —              | —      | 0        |
| 5            | 5    | `invasores`   | INVASORES   | SHOOTER | green   | —     | —              | —      | 0        |
| 6            | 6    | `asteroids`   | ASTEROIDS   | SHOOTER | yellow  | ✅    | ✅             | 440    | 1        |
| 7            | 7    | `frogger`     | FROGGER     | ARCADE  | green   | ✅    | ✅             | —      | 0        |
| 8            | 8    | `duelo-pixel` | DUELO PIXEL | VERSUS  | cyan    | —     | —              | —      | 0        |

Juegos reales: 5 de 8. Los que no tienen motor en `games/registry.ts` se simulan en `GamePlayer`.

## Comunes a los 4 juegos

- Motor en `games/<slug>/` registrado en `games/registry.ts` (`EngineDef`, contrato en `games/types.ts`).
- Canvas interno 800×600 dentro de `.crt-screen`.
- HUD React (Puntuación, Vidas, Nivel), pausa (`P`/`Escape`), FIN, JUGAR DE NUEVO y modal FIN DEL JUEGO gestionados por `GamePlayer`.
- Puntuación guardada vía Server Action `saveScore` (`app/games/[id]/play/actions.ts`): iniciales `^[A-Z0-9_]{3,10}$`, score entero 0–1 000 000.
- Botón ESTILO cambia el tema en caliente; el primero de `themes` es el default; no se persiste.

## Asteroids

- Spec: `specs/04-asteroids.md`. Origen: `references/started-games/02 - asteroids/`.
- Temas: NEÓN, CLÁSICO.
- Controles: `←`/`→` rotar, `↑` propulsar, `Espacio` disparar.
- Reglas: wrap toroidal; asteroides grandes → medianos → pequeños (20/50/100 pts); 3 vidas; invencibilidad 3 s y respawn 2 s; nivel `N` con `3 + N` asteroides; cooldown de disparo 0,2 s.

## Tetris

- Spec: `specs/06-tetris.md`. Origen: `references/started-games/03 - tetris/`.
- Temas: NEÓN, RETRO, PASTEL, PIXEL.
- Controles: `←`/`→` mover, `↓` soft drop (+1/fila), `↑`/`X` rotar, `Espacio` hard drop (+2/celda).
- Reglas: pozo 10×20, 7 piezas, wall kicks, pieza fantasma y vista NEXT; líneas `[100, 300, 500, 800] × nivel`; nivel `floor(lines / 10) + 1`; caída `max(100, 1000 − (nivel − 1) × 90)` ms. Vidas fija en 1.

## Arkanoid

- Spec: `specs/07-arkanoid.md`. Origen: `references/started-games/04 - arkanoid/`.
- Temas: NEÓN (vectorial), CLÁSICO (spritesheet).
- Controles: `←`/`→` o `A`/`D` mover, `Espacio` lanzar, `M` silenciar; menú inicial con `↑`/`↓` + `Enter` para elegir nivel 1–5.
- Reglas: 10 pts por bloque; grises de 2–3 golpes valen `10 × hp`; 5 mapas en ciclo infinito; bola a 380 px/s, +8 % por nivel hasta el 10; 3 vidas.
- Único juego con sonido (`public/games/arkanoid/`).

## Frogger

- Spec: `specs/09-hora-punta.md`. Motor propio (sin juego de referencia ni assets).
- Temas: NEÓN, CLÁSICO.
- Controles: flechas o `W`/`A`/`S`/`D` saltan 1 celda; `Espacio` o una flecha para empezar (`↓`/`S` inician sin mover).
- Reglas: grilla 20×15 (celdas de 40 px); 12 carriles de tráfico y mediana segura (fila 7); 5 madrigueras; 10 pts por fila nueva, 50 + 10/s por madriguera, 1000 por nivel; 30 s por cruce; 3 vidas, +1 cada 10 000 (máx. 5); velocidad ×1 + 0,1 × (nivel − 1), tope ×1,9 en el nivel 10.

## Snake

- Spec: `specs/08-snake.md`. Motor propio (solo assets de `references/source-assets/snake-assets/`).
- Temas: NEÓN, CLÁSICO.
- Controles: flechas o `W`/`A`/`S`/`D`; `Espacio` o una flecha para empezar.
- Reglas: grilla 20×15 (celdas de 40 px); muros y cuerpo mortales; 10 pts por fruta (22 frutas del atlas); nivel `1 + floor(frutas / 5)`; tick `max(60, 140 − 10 × (N − 1))` ms. Vidas fija en 1.
