# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Tetris en JavaScript vanilla + Canvas 2D. Sin dependencias, sin build, sin tests ni linter. Idioma de UI y docs: español.

## Ejecutar

```bash
open index.html                 # directo
python3 -m http.server 8000     # recomendado → http://localhost:8000
```

No hay suite de tests: verificar cambios jugando en el navegador.

## Arquitectura

- `game.js`: toda la lógica, script clásico (no módulo) con `'use strict'` y estado global mutable (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`…). `init()` resetea todo y también es el handler de reinicio.
- Índice de tipo de pieza = valor de celda = índice en `Skins.active.colors` (1–8; `0` vacío). `PIECES[i]` guarda matrices ya rellenas con `i`, así que `merge()` copia el valor directamente al `board`.
- Rotación: `rotateCW` (transpuesta + reverso) + wall kicks en `tryRotate` (`[0,-1,1,-2,2]` columnas). No es SRS.
- Ciclo: `loop` (rAF) acumula `dt` → al superar `dropInterval` baja pieza o `lockPiece()` (`merge` → `clearLines` → `spawn`). `spawn` con colisión → `endGame()`.
- Puntuación/nivel en `clearLines`: `LINE_SCORES[n] * level`; nivel = `floor(lines/10)+1`; `dropInterval = max(100, 1000 - (level-1)*90)`. Hard drop +2/celda, soft drop +1/fila.
- `records.js` (cargado antes de `game.js`): módulo global `Records` (Top 5 + mejor combo + líneas máx en `localStorage['tetris.records']` = `{top:[{name,score,lines,level,combo,date}], bestCombo, maxLines}`, validado al parsear). Hooks en `game.js`: `Records.onInit()` (en `init`), `onLinesCleared(n)`/`onLockNoClear()` (en `clearLines`, combo = limpiezas consecutivas), `onGameOver(score, lines, level)` (en `endGame`), `showStart()` (arranque). Nombres siempre con `textContent`.
- Arranque: el juego no inicia solo; `#start-screen` muestra records y su botón "Jugar" llama a `init()`. Al cargar `gameOver = true` para que `keydown` no toque `current` indefinido.
- Game over: si entra en el top, input de nombre (`keydown` con `stopPropagation`; Enter guarda; Reiniciar sin confirmar guarda como "Anónimo").
- `skins.js` (cargado antes de `game.js`): `SKINS = {retro, neon, pastel, pixel}`, cada uno `{name, colors[0..8], background|null, grid|null, drawBlock(ctx, px, py, size, color, alpha)}`; `Skins.active` / `Skins.set(name)`. `drawBlock` de `game.js` delega en la skin activa (único punto de dibujo de bloques). Con `background` el canvas se rellena (`clearCanvas`); con `null` se usa el CSS del tema. Preferencia en `localStorage` clave `skin`; selector `#skin-select`. Skins con `shadowBlur` deben resetearlo a 0.
- `#overlay` solo para GAME OVER. Pausa (`P`/`Esc`) = `#pause-menu` gestionado por `pause-menu.js` (global `Pause`: `isOpen/cooling/startLevel/show/hide`; se carga antes de `game.js`). Con el menú abierto o en cooldown 150 ms tras cerrar, `keydown` ignora teclas de juego.
- Nivel inicial (`localStorage 'startLevel'`, 1–10): `init()` usa `level = Pause.startLevel()`; `clearLines` usa `max(startLevel, floor(lines/10)+1)`. Se aplica al reiniciar.

## Acoplamientos a mantener

- Canvas `#board` en `index.html` debe medir `COLS*BLOCK × ROWS*BLOCK` (300×600).
- `drawNext` asume preview 4×4 de 30px (`NB = 30`) ↔ `#next-canvas` 120×120.
- Controles listados en tres sitios: handler `keydown` de `game.js`, panel de `index.html` y tabla del README.
