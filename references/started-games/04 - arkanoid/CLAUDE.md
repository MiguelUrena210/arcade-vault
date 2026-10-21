# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado

Arkanoid jugable en HTML, CSS y JS (**cero dependencias**). Specs 01 (MVP), 02 (5 niveles progresivos) y 03 (menú y velocidad por nivel) están `Implementado`. Sin build, linter ni tests: abrir `index.html` en el navegador.

## Arquitectura

Scripts clásicos (sin módulos ES), globals compartidos; el orden de carga en `index.html` importa: `assets/spritesheet.js`, `src/config.js`, `levels.js`, `input.js`, `entities.js`, `menu.js`, `game.js`. `style.css` solo estiliza el canvas.

- `src/config.js`: `CONFIG` (tamaño 800x600, pala, bola, bloques, vidas, puntos, apariencia/grietas del `gray`). Valores numéricos van aquí, no hardcodeados.
- `src/levels.js`: `LEVELS`, 5 niveles como mapas de texto de 10 columnas (`.` vacío, `r c g m y h` colores, `gray` resistente de 2-3 golpes).
- `src/input.js`: `keys` (teclas mantenidas), `pressed` (pulsaciones desde el último `clearPressed()`).
- `src/entities.js`: pala, bola (`ballSpeed(level)`: +8 % por nivel), bloques y colisiones.
- `src/menu.js`: estado y dibujo de menús (`menu` inicio, `options` en partida, selector de nivel).
- `src/game.js`: `state`, bucle (`update(dt)`/`draw()`, dt limitado a 1/30), sonidos, explosiones, HUD.
- Modos en `state.mode`: `menu | ready | playing | paused | options | levelclear | gameover | won`. Esc abre/cierra `options` y vuelve al modo de origen (`state.menu.from`).
- Specs en `specs/NN-slug.md`: fuente de verdad del comportamiento.

## Assets

- `assets/spritesheet-breakout.png`: spritesheet único. `assets/spritesheet.js` define las coordenadas (`sx, sy, sw, sh`) de cada sprite como globals (`SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION = 150` ms), sin módulos ES: cargarlo con `<script>` clásico antes del código del juego.
- API de dibujo (canvas 2D): `loadSpritesheet(cb)` (carga async, copia la imagen a un canvas offscreen; llamar antes de dibujar), `drawSprite(ctx, name, x, y, w, h)` (`name` = `paddle`, `ball` o `block_<color>`) y `drawFrame(ctx, frame, x, y, w, h)` (para frames de explosión). Ambos no hacen nada hasta que cargue. La ruta `assets/spritesheet-breakout.png` es relativa al HTML.
- Bloques y frames de explosión por color: red, cyan, green, magenta, yellow, hotpink, gray. Los frames de `gray` reutilizan los de `red` (mismas coordenadas).
- `assets/sounds/`: `ball-bounce.mp3`, `break-sound.mp3`.

## Skills del proyecto (`.claude/skills/`)

- `engineering/spec` y `engineering/spec-impl`: flujo spec-driven. `/spec` guarda specs en `specs/NN-slug.md`; `/spec-impl NN-slug` implementa una spec `Approved` en la rama `spec-NN-slug`, pausando para revisar diffs, sin commitear. Requieren repo git.
- `neko`: voz de gatito kawaii (activar con `/neko`); no aplica a código, commits ni docs.
