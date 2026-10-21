# SPEC 03 — Menú de partida y velocidad por nivel

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-19
> **Objetivo:** Añadir un menú (Esc) para continuar, reiniciar el nivel o elegir cualquiera de los 5 niveles, con puntaje y vidas reiniciados, y hacer que la bola sea más rápida en cada nivel.

## Alcance

**Dentro:**

- Nuevo modo `options`: menú que se abre con Esc desde `ready`, `playing` y `paused`.
- Opciones del menú en partida: `Continuar`, `Reiniciar nivel`, `Seleccionar nivel`.
- `Reiniciar nivel`: vuelve a empezar el nivel actual con puntaje 0 y vidas `CONFIG.LIVES`, sin importar el nivel ni el puntaje acumulado.
- `Seleccionar nivel`: submenú con los 5 niveles, siempre disponibles; al confirmar, empieza ese nivel con puntaje 0 y vidas `CONFIG.LIVES`.
- Cerrar el menú (Esc o `Continuar`) vuelve al modo desde el que se abrió: `ready` a `ready`, `playing` a `playing`, `paused` a `paused`.
- Con el menú abierto nada se mueve: ni bola, ni pala, ni explosiones.
- Menú de inicio (`menu`) con `Empezar` y `Seleccionar nivel`; Espacio sigue empezando el nivel 1.
- Navegación con flechas ↑↓ y Enter; Esc retrocede o cierra.
- Velocidad de la bola creciente por nivel: +8 % por nivel sobre `CONFIG.BALL.speed`.
- La rapidez de la bola es constante dentro de un nivel.

**Fuera de alcance (specs futuras):**

- Persistencia de nivel máximo o de configuración (`localStorage`).
- Niveles bloqueados o desbloqueo por progreso.
- Control del menú con mouse o táctil.
- Aceleración de la bola dentro del nivel (por bloques rotos o por tiempo).
- Tabla de velocidades por nivel configurable por separado.
- Ajustes de sonido, mute o música en el menú.
- Menú disponible en `levelclear`, `gameover` y `won`.
- Código de desarrollador para saltar niveles.

## Modelo de datos

```js
// src/config.js — se añade
CONFIG.BALL.speedStep = 0.08; // incremento por nivel sobre CONFIG.BALL.speed

// src/entities.js — nueva función
// ballSpeed(level) = CONFIG.BALL.speed * (1 + CONFIG.BALL.speedStep * level)   // level 0-based
// nivel 1 = 380, nivel 2 = 410.4, nivel 3 = 440.8, nivel 4 = 471.2, nivel 5 = 501.6 px/s
```

```js
// src/game.js — state se amplía
state.mode  // + 'options'
state.menu = {
  screen: 'main',  // 'main' | 'levels'
  index: 0,        // opción resaltada de la pantalla actual
  from: 'ready',   // modo al que se vuelve al cerrar: 'ready' | 'playing' | 'paused'
};
```

```js
// src/menu.js — opciones (strings fijos)
const MENU_START = ['Empezar', 'Seleccionar nivel'];                         // en state.mode === 'menu'
const MENU_GAME  = ['Continuar', 'Reiniciar nivel', 'Seleccionar nivel'];    // en state.mode === 'options'
// pantalla 'levels': una opción por entrada de LEVELS, con su LEVELS[i].name
```

Convenciones:

- `startGame(levelIndex)` en `src/game.js` es el único punto de arranque: pone `score = 0`, `lives = CONFIG.LIVES`, `state.level = levelIndex`, regenera bloques, pala y explosiones, coloca la bola en la pala y pasa a `ready`.
- `resetGame()` de la SPEC 01 pasa a llamar a `startGame(0)`.
- La rapidez de la bola al lanzar y al rebotar en la pala usa `ballSpeed(state.level)`; `hypot(vx, vy)` es igual a ese valor durante todo el nivel.
- Teclas: `ArrowUp` y `ArrowDown` mueven la selección (con vuelta circular), `Enter` confirma, `Escape` retrocede de `levels` a `main` y cierra desde `main`.
- En el menú de inicio, `Escape` no hace nada desde `main` y retrocede desde `levels`.
- `P` se ignora mientras `state.mode === 'options'`.
- Al abrir `Seleccionar nivel`, la opción resaltada es el nivel actual.
- `ArrowUp` y `ArrowDown` se añaden a `PREVENT_DEFAULT` en `src/input.js` para que no desplacen la página.

Archivos:

- Nuevo: `src/menu.js` (opciones, navegación y dibujo del menú), cargado en `index.html` después de `src/entities.js` y antes de `src/game.js`.
- Modificados: `index.html`, `src/config.js`, `src/input.js`, `src/entities.js` (`ballSpeed`, `launchBall` y `collideBallPaddle` reciben la rapidez), `src/game.js` (`startGame`, modo `options`, manejo de teclas).

## Plan de implementación

1. Añadir `CONFIG.BALL.speedStep` y `ballSpeed(level)` en `src/entities.js`; `launchBall` y `collideBallPaddle` reciben la rapidez como parámetro y `src/game.js` pasa `ballSpeed(state.level)`. Prueba: la bola del nivel 1 sigue a 380 px/s y la del nivel 2 va a 410.4 px/s.
2. Crear `startGame(levelIndex)` en `src/game.js` y hacer que `resetGame()` la use con 0; `startNextLevel()` no cambia. Prueba: `gameover` y `won` reinician igual que antes.
3. Crear `src/menu.js` con las opciones y la navegación (índice con vuelta circular), añadir `ArrowUp` y `ArrowDown` a `PREVENT_DEFAULT` y cargar el script en `index.html`. Prueba: sin errores en consola y el juego se comporta como antes.
4. Añadir el modo `options`: Esc abre el menú desde `ready`, `playing` y `paused` guardando `state.menu.from`; se dibuja encima del juego; `Continuar` y Esc vuelven a `from`; `Reiniciar nivel` llama a `startGame(state.level)`. Prueba: abrir desde `playing` congela todo y al cerrar sigue en `playing`.
5. Añadir la pantalla `levels` en `options`: lista los 5 niveles, Enter llama a `startGame(i)`, Esc vuelve a `main`. Prueba: elegir el nivel 4 desde el nivel 1 empieza el nivel 4 con puntaje 0 y 3 vidas.
6. Convertir el menú de inicio (`menu`) a las opciones `Empezar` / `Seleccionar nivel` con el mismo componente; Espacio sigue empezando el nivel 1. Prueba: elegir un nivel desde el inicio empieza ese nivel en `ready`.

## Criterios de aceptación

- [ ] Esc abre el menú desde `ready`, `playing` y `paused`, y no hace nada en `levelclear`, `gameover` ni `won`.
- [ ] El menú en partida muestra `Continuar`, `Reiniciar nivel` y `Seleccionar nivel`.
- [ ] Con el menú abierto, la bola, la pala y las explosiones no se mueven.
- [ ] `Continuar` y Esc desde `ready` vuelven a `ready`, desde `playing` a `playing` y desde `paused` a `paused`.
- [ ] Las flechas ↑↓ mueven la selección con vuelta circular y Enter la confirma.
- [ ] `Reiniciar nivel` deja el puntaje en 0 y las vidas en `CONFIG.LIVES`, sin importar el puntaje, las vidas o el nivel previos.
- [ ] `Reiniciar nivel` restaura todos los bloques del nivel actual con su `hp` inicial y deja la bola sobre la pala en `ready`.
- [ ] `Seleccionar nivel` lista exactamente los 5 niveles, todos elegibles desde el primer momento.
- [ ] Elegir el nivel N empieza ese nivel con puntaje 0, vidas `CONFIG.LIVES`, bloques del mapa N y modo `ready`.
- [ ] Esc en la pantalla de niveles vuelve al menú principal sin empezar ninguna partida.
- [ ] `P` no tiene efecto con el menú abierto.
- [ ] El menú de inicio muestra `Empezar` y `Seleccionar nivel`; `Empezar` y Espacio empiezan el nivel 1.
- [ ] Elegir un nivel desde el menú de inicio empieza ese nivel con puntaje 0 y vidas `CONFIG.LIVES`.
- [ ] La rapidez de la bola (`hypot(vx, vy)`) es 380, 410.4, 440.8, 471.2 y 501.6 px/s en los niveles 1 a 5, con tolerancia de 0.1.
- [ ] La rapidez de la bola no cambia dentro de un nivel, ni tras rebotar en la pala, bloques o paredes.
- [ ] La bola de un nivel recién cargado con `levelclear` o con el selector usa la rapidez de ese nivel.
- [ ] `ArrowUp` y `ArrowDown` no desplazan la página.
- [ ] Reiniciar tras `gameover` o `won` sigue empezando en el nivel 1 con puntaje 0 y vidas `CONFIG.LIVES`.
- [ ] El proyecto sigue sin dependencias externas ni módulos ES.

## Decisiones

- **Sí:** reabrir las exclusiones de la SPEC 02 sobre el selector de nivel y la aceleración de la bola. Decisión del usuario; esta spec las sustituye.
- **Sí:** la rapidez constante entre niveles de la SPEC 02 se reemplaza por rapidez constante dentro de cada nivel y creciente entre niveles. Es consecuencia directa de este cambio.
- **Sí:** un único menú con Esc, en partida y desde el inicio. Decisión del usuario.
- **No:** menú solo en pausa o solo en el inicio. Menos cobertura.
- **Sí:** reiniciar o elegir nivel pone puntaje 0 y vidas `CONFIG.LIVES`. Decisión del usuario; partida limpia sin importar el nivel de origen.
- **No:** conservar vidas al reiniciar. Permite reintentar sin coste.
- **Sí:** los 5 niveles siempre elegibles, sin persistencia. Decisión del usuario; evita abrir `localStorage` en esta spec.
- **No:** niveles bloqueados por progreso. Requieren guardar el nivel máximo.
- **Sí:** +8 % por nivel sobre 380 px/s (nivel 5 ≈ 501.6 px/s). Decisión del usuario; sube la dificultad sin hacer injugable el nivel 5.
- **No:** +12 % por nivel ni tabla fija por nivel. Más agresivo, o más números que mantener.
- **Sí:** cerrar el menú desde `playing` vuelve a `playing`. Decisión del usuario; el juego se reanuda de inmediato.
- **Sí:** navegación con ↑↓ y Enter. Decisión del usuario.
- **Sí:** menú solo en `menu`, `ready`, `playing` y `paused`. Decisión del usuario; las otras pantallas ya tienen su acción con Espacio.
- **Sí:** un único `startGame(levelIndex)` para reiniciar y elegir nivel. Evita lógica duplicada entre `resetGame` y el menú.
- **Sí:** Espacio sigue empezando el nivel 1 en el menú de inicio. Conserva el comportamiento de la SPEC 01.
- **No:** código de desarrollador para saltar niveles. El selector cubre esa necesidad.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| A 501.6 px/s la bola atraviesa bloques o la pala | Con `MAX_DT = 1/30` el paso máximo es 16.7 px, menor que la bola (14 px) más el bloque (24 px). Si aparece un túnel, mover en subpasos como indica la SPEC 01. |
| Abrir el menú desde `playing` deja teclas "pulsadas" que mueven la pala al cerrar | Limpiar `pressed` al abrir y cerrar el menú; `keys` se actualiza con `keyup`. |
| Enter o Espacio en el menú lanzan la bola por la misma pulsación | Consumir la pulsación en el menú y llamar a `clearPressed()` antes de volver al juego. |
| El nivel 5 a velocidad alta resulta injustificablemente difícil | Ajustar `CONFIG.BALL.speedStep` sin tocar la lógica. |
| Rebote en pala con `speed` por parámetro olvida actualizar una llamada | El criterio de aceptación comprueba `hypot(vx, vy)` en los 5 niveles tras lanzar y tras rebotar en la pala. |

## Qué **no** está en esta spec

- Persistencia o niveles bloqueados.
- Menú con mouse o táctil.
- Aceleración de la bola dentro del nivel.
- Ajustes de sonido o música.
- Menú en `levelclear`, `gameover` y `won`.
- Código de desarrollador para saltar niveles.
