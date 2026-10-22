# SPEC 02 — Niveles progresivos

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-19
> **Objetivo:** Al limpiar todos los bloques destructibles se avanza a un nivel nuevo, hasta 5 niveles, con más bloques, bloques `gray` resistentes y disposiciones distintas.

## Alcance

**Dentro:**

- 5 niveles definidos a mano en `src/levels.js` como mapas de texto.
- Más bloques por nivel: la cantidad crece estrictamente de un nivel al siguiente (el nivel 1 conserva los 60 bloques de la SPEC 01).
- Bloques `gray` resistentes con 2 o 3 golpes (sprite `block_gray` existente), con señal visual de golpes restantes (tono y grietas), sin números.
- Disposiciones distintas por nivel (huecos, columnas vacías, formas), dentro de la rejilla de 10 columnas.
- Nuevo estado `levelclear`: pantalla "Nivel N completado" tras limpiar un nivel; Espacio carga el siguiente y pasa a `ready`.
- Puntaje y vidas se conservan entre niveles; la velocidad de la bola no cambia.
- Al limpiar el nivel 5, estado `won` (victoria final) de la SPEC 01.
- HUD con el número de nivel actual.
- Reiniciar tras `gameover` o `won` vuelve al nivel 1 con puntaje y vidas iniciales.

**Fuera de alcance (specs futuras):**

- Niveles infinitos o generación procedural.
- Bloques indestructibles.
- Power-ups.
- Aceleración de la bola por nivel o por bloques rotos.
- High score y persistencia (`localStorage`).
- Selector de nivel o contraseñas.
- Música por nivel o fondos distintos.

## Modelo de datos

```js
// src/levels.js — un mapa por nivel; cada string es una fila (10 caracteres), de arriba hacia abajo
const LEVELS = [
  { name: 'Nivel 1', map: ['rrrrrrrrrr', 'cccccccccc', /* ... */] },
  // ...hasta 5 niveles
];
// Leyenda: '.' vacío | r red | c cyan | g green | m magenta | y yellow | h hotpink
//          '2' gray con 2 golpes | '3' gray con 3 golpes
```

```js
// src/config.js — se añade
CONFIG.BRICKS.maxRows = 10;      // filas máximas por mapa
CONFIG.POINTS_PER_HIT_GRAY = 10; // puntos por golpe de HP; romper un gray de N golpes suma 10 * N
CONFIG.GRAY_LOOK = {             // apariencia según hp restante
  3: { tint: 'rgba(0,0,0,0.35)',       cracks: 0 }, // oscuro, intacto
  2: { tint: null,                     cracks: 1 }, // medio, 1 grieta
  1: { tint: 'rgba(255,255,255,0.30)', cracks: 2 }, // claro, 2 grietas
};
CONFIG.CRACKS = {                // polilíneas fijas, coordenadas relativas al bloque (0-1)
  color: 'rgba(0,0,0,0.7)', width: 2,
  lines: [/* [[x, y], [x, y], ...] por grieta */],
};

// src/game.js — state se amplía
state.mode  // + 'levelclear'
state.level // índice 0-based en LEVELS
// cada bloque pasa a: { x, y, w, h, color, alive, hp, maxHp }
```

Convenciones:

- Los bloques de color normal tienen `hp = maxHp = 1` y suman `CONFIG.POINTS_PER_BRICK` (10).
- Un golpe resta 1 a `hp`; con `hp = 0` el bloque pasa a `alive = false`, suena `break-sound.mp3` y se dibuja la explosión.
- Un golpe que no destruye suena `ball-bounce.mp3` y no dispara explosión.
- Un `gray` se dibuja con `drawSprite(ctx, 'block_gray', ...)`; encima, un `fillRect` con `GRAY_LOOK[hp].tint` si no es `null`.
- Encima se trazan las primeras `GRAY_LOOK[hp].cracks` polilíneas de `CONFIG.CRACKS.lines`.
- Las grietas son fijas (no aleatorias por frame) para que no parpadeen.
- La apariencia depende solo de `hp`: un `gray` de 2 golpes intacto se ve igual que uno de 3 golpes tras un impacto.
- No se muestran números ni texto sobre los bloques.
- Posición de cada bloque: `offsetX + col * (w + gap)`, `offsetY + fila * (h + gap)`, igual que en la SPEC 01.
- El nivel termina cuando no queda ningún bloque con `alive = true`.

Archivos:

- Nuevo: `src/levels.js`, cargado en `index.html` después de `src/config.js` y antes de `src/entities.js`.
- Modificados: `index.html`, `src/config.js`, `src/entities.js` (`createBricks` lee un mapa), `src/game.js` (estados, colisión con `hp`, HUD y textos).

## Plan de implementación

1. Crear `src/levels.js` con `LEVELS` (el nivel 1 replica los 60 bloques actuales) y cargarlo en `index.html`. Prueba: el juego funciona igual que en la SPEC 01 y no hay errores en consola.
2. Cambiar `createBricks` en `src/entities.js` para construir los bloques desde `LEVELS[state.level].map`, con `hp` y `maxHp`. Prueba: el nivel 1 se ve idéntico.
3. Ajustar la colisión bola-bloque en `src/game.js` para restar `hp`; destruir, puntuar, sonar y explotar solo con `hp = 0`. Prueba: un `gray` temporal en el mapa necesita 2 golpes.
4. Dibujar los `gray` con tono y grietas según `hp`, usando `CONFIG.GRAY_LOOK` y `CONFIG.CRACKS`. Prueba: un `gray` de 3 golpes pasa de oscuro intacto a medio con 1 grieta y a claro con 2 grietas.
5. Añadir el estado `levelclear`: sin bloques vivos y `state.level < LEVELS.length - 1` pasa a `levelclear` con el texto "Nivel N completado — Espacio para continuar"; Espacio incrementa `state.level`, regenera bloques y pasa a `ready`.
6. En el último nivel, sin bloques vivos pasa a `won`; el reinicio desde `gameover`/`won` pone `state.level = 0`.
7. Mostrar "Nivel N" en el HUD.
8. Diseñar los niveles 2 a 5 con cantidad creciente de bloques, `gray` de 2 y 3 golpes y disposiciones distintas. Prueba: jugar los 5 niveles seguidos.

## Criterios de aceptación

- [ ] El nivel 1 tiene 60 bloques y ningún `gray`.
- [ ] Existen exactamente 5 niveles en `LEVELS`.
- [ ] Cada nivel tiene más bloques que el anterior.
- [ ] Los niveles 2 a 5 contienen al menos un `gray`, y al menos un nivel contiene `gray` de 3 golpes.
- [ ] Dos niveles consecutivos no comparten el mismo mapa.
- [ ] Ningún mapa excede 10 columnas ni `CONFIG.BRICKS.maxRows` filas, y ningún bloque queda fuera del canvas.
- [ ] Un `gray` de N golpes necesita exactamente N impactos para desaparecer.
- [ ] Un impacto que no destruye el bloque rebota la bola y suena `ball-bounce.mp3`, sin explosión ni `break-sound.mp3`.
- [ ] Destruir un `gray` de N golpes suma exactamente `10 * N` puntos.
- [ ] Un `gray` con `hp` 3, 2 y 1 se ve con tono oscuro, medio y claro, respectivamente.
- [ ] Un `gray` con `hp` 3, 2 y 1 muestra 0, 1 y 2 grietas, respectivamente.
- [ ] Un `gray` de 2 golpes y uno de 3 golpes se distinguen a simple vista antes del primer impacto.
- [ ] Las grietas no cambian de forma entre frames.
- [ ] Ningún bloque muestra números ni texto.
- [ ] Al destruir el último bloque del nivel 1 al 4 aparece `levelclear` con el número de nivel.
- [ ] Espacio en `levelclear` carga el siguiente nivel y pasa a `ready`, con la bola sobre la pala.
- [ ] Puntaje y vidas no cambian al pasar de nivel.
- [ ] `hypot(vx, vy)` de la bola es igual en los 5 niveles.
- [ ] Al destruir el último bloque del nivel 5 aparece `won`.
- [ ] Espacio en `gameover` o `won` reinicia en el nivel 1 con puntaje 0, vidas `CONFIG.LIVES` y bloques del nivel 1.
- [ ] El HUD muestra el nivel actual, el puntaje y las vidas.
- [ ] Perder la bola en un nivel avanzado no reinicia el nivel ni sus bloques.
- [ ] P sigue pausando y reanudando; `levelclear` no se puede pausar.
- [ ] El proyecto sigue sin dependencias externas ni módulos ES.

## Decisiones

- **Sí:** 5 niveles y victoria final tras el último. Decisión del usuario; cantidad cerrada y verificable.
- **No:** niveles infinitos. Requieren generación procedural y balance; spec futura.
- **Sí:** mapas a mano en `src/levels.js`, un string por fila. Decisión del usuario; control total de la disposición.
- **No:** patrones por fórmula. Menos control sobre el diseño de cada nivel.
- **Sí:** `gray` con 2 o 3 golpes y sprite existente. Decisión del usuario; reutiliza el asset ya disponible.
- **No:** bloques indestructibles. Complican la condición de fin de nivel; spec futura.
- **Sí:** puntaje y vidas se conservan entre niveles. Decisión del usuario.
- **No:** acelerar la bola por nivel. Decisión del usuario; la dificultad sube solo con bloques y resistencia.
- **Sí:** pantalla `levelclear` con Espacio para continuar. Decisión del usuario; da una pausa antes del siguiente nivel.
- **Sí:** puntos del `gray` = `10 * N`. Premia la resistencia sin añadir una tabla de puntajes.
- **Sí:** tono + grietas según `hp` restante como indicador de daño. Decisión del usuario; distingue 2 y 3 golpes desde el inicio y no requiere sprites nuevos.
- **No:** opacidad, marcos concéntricos ni números. La opacidad no distingue el `hp` inicial, los marcos se leen como conteo y el usuario descartó los números.
- **Sí:** grietas fijas en `CONFIG.CRACKS`. Evitan parpadeo y aleatoriedad.
- **Sí:** máximo de 10 filas por mapa. Deja espacio libre entre los bloques y la pala (`offsetY` 70, paso de fila 28 px).
- **Sí:** la pala y la bola vuelven a su posición inicial en cada nivel nuevo. Es el comportamiento de `ready`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un mapa con filas de largo distinto desalinea los bloques | `createBricks` ignora caracteres fuera de las 10 columnas y el criterio de aceptación exige filas de 10 caracteres. |
| Carácter desconocido en un mapa | Tratarlo como `.` (vacío). |
| Bola atascada entre `gray` en un nivel denso | Se mantiene la mitigación de `vy` mínimo de la SPEC 01. |
| Un `gray` golpeado varias veces en el mismo frame pierde más de 1 `hp` | Resolver un solo bloque por subpaso de movimiento, como en la SPEC 01. |
| Tono claro de `hp` 1 poco visible sobre el fondo | Ajustar el alpha de `tint` en `CONFIG.GRAY_LOOK` sin tocar la lógica. |
| Nivel imposible de limpiar por bloques inalcanzables | Todos los bloques son destructibles y quedan dentro del canvas; probar los 5 niveles en el paso 8. |

## Qué **no** está en esta spec

- Niveles infinitos o procedurales.
- Bloques indestructibles.
- Power-ups.
- Aceleración de la bola.
- High score y persistencia.
- Selector de nivel.
