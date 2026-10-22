# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-15
> **Objetivo:** Crear un Arkanoid jugable (1 nivel, 3 vidas, puntaje) en HTML, CSS y JS sin dependencias, usando los assets existentes.

## Alcance

**Dentro:**

- `index.html` con un `<canvas>` de 800x600 que se abre con doble clic (sin servidor ni bundler).
- Pantalla de menú de inicio y estados `menu`, `ready`, `playing`, `paused`, `gameover`, `won`.
- Pala controlada solo con teclado (flechas o A/D).
- Bola con velocidad constante y ángulo según el punto de impacto en la pala.
- 60 bloques (10 columnas x 6 filas), una fila por color.
- 3 vidas, puntaje (10 por bloque) y HUD en canvas.
- Sonidos de rebote y rotura, y animación de explosión al romper un bloque.
- Reinicio de partida tras `gameover` o `won`.

**Fuera de alcance (specs futuras):**

- Múltiples niveles.
- Power-ups, bloques resistentes (`gray`) o indestructibles.
- High score y persistencia (`localStorage`).
- Control con mouse o táctil.
- Aceleración de la bola por bloques rotos.
- Música de fondo, ajustes de volumen, mute.
- Versión móvil / responsive.

## Modelo de datos

```js
// src/config.js — constantes globales
const CONFIG = {
  WIDTH: 800, HEIGHT: 600,
  PADDLE: { w: 100, h: 20, speed: 520, y: 560 },   // px/s
  BALL: { size: 14, speed: 380, maxAngle: 60 },     // px/s, grados desde la vertical
  BRICKS: { cols: 10, rows: 6, w: 70, h: 24, gap: 4, offsetX: 32, offsetY: 70,
            colors: ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink'] },
  LIVES: 3,
  POINTS_PER_BRICK: 10,
};

// src/game.js — estado
const state = {
  mode: 'menu',            // 'menu' | 'ready' | 'playing' | 'paused' | 'gameover' | 'won'
  score: 0,
  lives: CONFIG.LIVES,
  paddle: { x, y, w, h },
  ball: { x, y, vx, vy, size },
  bricks: [/* { x, y, w, h, color, alive } */],
  explosions: [/* { x, y, w, h, color, t } */],  // t = ms transcurridos
};
```

Convenciones:

- Origen en la esquina superior izquierda; posiciones en píxeles del canvas.
- Velocidades en px/s; el loop usa delta-time (`requestAnimationFrame`).
- Los bloques usan sprites `block_<color>` y las explosiones `drawFrame` con `EXPLOSION_FRAMES`, duración `EXPLOSION_DURATION`.

Archivos nuevos (scripts clásicos, sin módulos ES, cargados en este orden tras `assets/spritesheet.js`):

- `index.html`, `style.css`
- `src/config.js` — `CONFIG`.
- `src/input.js` — estado de teclas (`keys`) y eventos.
- `src/entities.js` — creación y actualización de pala, bola y bloques.
- `src/game.js` — loop, estados, colisiones, audio, HUD y arranque.

## Plan de implementación

1. Crear `index.html`, `style.css` y `src/config.js`; cargar scripts en orden y dibujar canvas 800x600 centrado con fondo. Prueba: abrir el HTML y ver el canvas sin errores en consola.
2. Crear `src/game.js` con el loop (`requestAnimationFrame`, delta-time) y `loadSpritesheet`; mostrar el menú de inicio ("Arkanoid — Espacio para empezar").
3. Crear `src/input.js` y la pala en `src/entities.js`: movimiento con flechas/A-D, limitada a los bordes. Prueba: Espacio pasa de `menu` a `ready` y la pala se mueve.
4. Añadir la bola: en `ready` sigue a la pala; Espacio la lanza; rebota en paredes y techo con velocidad constante.
5. Colisión bola-pala con ángulo según el punto de impacto (centro = vertical, extremos = `maxAngle`).
6. Generar los 60 bloques y dibujarlos con `drawSprite`; colisión bola-bloque (rebote por eje de menor penetración), bloque `alive = false`, +10 puntos.
7. Vidas y estados: bola cae bajo el canvas → -1 vida y vuelve a `ready`; 0 vidas → `gameover`; sin bloques vivos → `won`; Espacio en `gameover`/`won` reinicia a `ready`; P alterna `paused`/`playing`.
8. HUD (puntaje y vidas) y textos de cada estado en canvas.
9. Audio y efectos: `ball-bounce.mp3` en rebotes (paredes, pala, bloque), `break-sound.mp3` al romper, y animación de explosión con `drawFrame`.

## Criterios de aceptación

- [ ] Abrir `index.html` con doble clic carga el juego sin errores en la consola.
- [ ] Se ve el menú de inicio; Espacio pasa a `ready`.
- [ ] Flechas y A/D mueven la pala y esta no sale del canvas.
- [ ] En `ready` la bola sigue a la pala; Espacio la lanza.
- [ ] La bola rebota en paredes, techo y pala sin atravesarlos.
- [ ] Golpear la pala a la izquierda del centro desvía la bola a la izquierda, y a la derecha, a la derecha.
- [ ] La rapidez de la bola (`hypot(vx, vy)`) es constante durante toda la partida.
- [ ] Se muestran 60 bloques en 6 filas de colores distintos.
- [ ] Un bloque golpeado desaparece, suma exactamente 10 puntos y la bola rebota.
- [ ] Al romper un bloque suena `break-sound.mp3` y se reproduce la explosión.
- [ ] Los rebotes en pala, paredes y bloques reproducen `ball-bounce.mp3`.
- [ ] Perder la bola resta 1 vida y vuelve a `ready`; el HUD muestra el valor correcto.
- [ ] Con 0 vidas aparece `gameover`; con 0 bloques vivos aparece `won`.
- [ ] Espacio en `gameover` o `won` reinicia puntaje, vidas y bloques.
- [ ] P pausa y reanuda; en pausa nada se mueve.
- [ ] El proyecto no usa dependencias externas ni módulos ES.

## Decisiones

- **Sí:** scripts clásicos en 4 archivos (`config`, `input`, `entities`, `game`). Coherente con `assets/spritesheet.js` y permite abrir con `file://` (los módulos ES fallan por CORS).
- **No:** un archivo por entidad. Granularidad excesiva para un MVP.
- **Sí:** canvas 800x600 con 10x6 bloques. Decisión del usuario.
- **Sí:** solo teclado. Decisión del usuario; mouse queda fuera.
- **Sí:** ángulo de rebote según punto de impacto y velocidad constante. Control del jugador, comportamiento clásico.
- **No:** aceleración de la bola. Más tuning; spec futura.
- **Sí:** menú de inicio y pausa. Decisión del usuario.
- **No:** bloques `gray` ni resistentes. Añaden lógica fuera del MVP.
- **No:** high score. Evita persistencia en esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Autoplay bloqueado en audio hasta interacción | El primer sonido ocurre tras pulsar Espacio; ignorar errores de `play()`. |
| Bola atraviesa pala o bloques a delta-time grande | Limitar `dt` (p. ej. máx. 1/30 s) y mover en subpasos si hace falta. |
| Bola atascada en rebotes horizontales infinitos | Forzar un `vy` mínimo tras cada rebote en pala/paredes. |
| `loadSpritesheet` aún no cargó | `drawSprite` no hace nada hasta cargar; el loop arranca en el callback. |

## Qué **no** está en esta spec

- Múltiples niveles.
- Power-ups y bloques especiales.
- High score y persistencia.
- Mouse, táctil o móvil.
- Música, mute y ajustes de volumen.
