# SPEC 11 — Controles táctiles en móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-10-26
> **Objetivo:** Que Asteroids, Arkanoid, Snake y Tetris sean jugables de principio a fin en móviles y tablets táctiles mediante un mando virtual en pantalla, sin modificar los motores.

## Por qué

Los motores solo leen `KeyboardEvent.code` sobre `window` (contrato SPEC 04). En un móvil no hay teclado: los juegos cargan pero no se pueden controlar. Un mando React que emite `KeyboardEvent` sintéticos en `window` reutiliza el input existente de los 4 motores sin ampliar su contrato de input.

## Alcance

**Dentro:**

- Tipo `TouchControls` en `games/types.ts` y campo opcional `controls` en `EngineDef`.
- `controls` declarado en las 4 entradas de `ENGINES` (`games/registry.ts`), con el layout de la tabla "Mando por juego".
- Componente nuevo `components/touch-controls.tsx`: cruceta a la izquierda y hasta 3 botones de acción a la derecha.
- Cada botón emite `keydown` al tocar y `keyup` al soltar, cancelar o perder la captura del puntero. Multitáctil (cruceta + botón a la vez).
- Botones con `repeat: true`: tras 170 ms emiten `keydown` con `repeat: true` cada 50 ms mientras se mantienen.
- El mando solo es visible con `@media (pointer: coarse)`. En escritorio no se renderiza visualmente (`display: none`).
- Al pausar, terminar la partida o desmontar, el mando emite `keyup` de todas las teclas mantenidas. En pausa/fin se muestra atenuado y no emite.
- Contenedor nuevo `.player-stage` en `GamePlayer` que agrupa `.crt` y el mando.
- Layout vertical: CRT a ancho completo, mando debajo.
- Layout horizontal (`pointer: coarse` y `orientation: landscape`): cruceta a la izquierda, CRT centrado, botones a la derecha. La altura del CRT no supera `100dvh`.
- Bloqueo de gestos dentro de `.player-stage`: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` cancelado en los botones. Doble toque no hace zoom ni scroll.
- Pausa automática: `visibilitychange` con `document.hidden` pone `paused = true` si la partida no ha terminado. No reanuda sola.
- Botón `PANTALLA` en `.hud-actions`: `requestFullscreen()` sobre `.player-stage`; con pantalla completa activa muestra `SALIR PANTALLA` y llama a `document.exitFullscreen()`. Solo se muestra si `document.fullscreenEnabled` (se lee en un efecto para no romper la hidratación).
- HUD responsive: a 360 px de ancho, stats y botones caben sin scroll horizontal (`.hud-actions` con `flex-wrap`, botones más compactos).
- Modal FIN DEL JUEGO usable con teclado virtual: input con `font-size` ≥16px (evita el zoom de iOS), `autoCapitalize="characters"`, `autoComplete="off"`, `enterKeyHint="done"`.
- Objetivos táctiles ≥48×48 px.

**Fuera (para futuras specs):**

- Gestos por juego (swipe, arrastrar pala, zonas táctiles del canvas).
- Cambios en `games/<slug>/engine.ts`, `entities.ts` o cualquier archivo de motor.
- Vibración háptica (`navigator.vibrate`).
- Mando visible en escritorio o botón para forzarlo; personalizar o mover botones.
- Persistir preferencias del mando o de pantalla completa.
- Bloqueo de orientación (`screen.orientation.lock`).
- Controles táctiles para los juegos simulados (sin entrada en `ENGINES`).
- Soporte de gamepad físico (Gamepad API).
- Cambios en viñeta/scanlines del CRT.

## Modelo de datos

```ts
// games/types.ts
export type TouchKey = {
  code: string; // KeyboardEvent.code emitido
  label: string; // texto visible en el botón
  repeat?: boolean; // autorrepetición al mantener
};

export type TouchControls = {
  dpad: Partial<Record<"up" | "down" | "left" | "right", TouchKey>>;
  buttons: TouchKey[]; // 0–3, se pintan a la derecha en este orden
};

export type EngineDef = {
  // …campos existentes sin cambios
  controls?: TouchControls; // sin controls = sin mando táctil
};
```

Evento sintético emitido en `window`:

```ts
new KeyboardEvent(type, {
  code,
  key: code,
  repeat,
  bubbles: true,
  cancelable: true,
});
```

Una dirección ausente de `dpad` se pinta deshabilitada (hueco visible, sin evento).

## Mando por juego

| Juego     | ↑                 | ↓                    | ←                    | →                     | Botones                                      |
| --------- | ----------------- | -------------------- | -------------------- | --------------------- | -------------------------------------------- |
| asteroids | `ArrowUp` (▲)     | —                    | `ArrowLeft`          | `ArrowRight`          | DISPARO `Space`                              |
| arkanoid  | `ArrowUp`         | `ArrowDown`          | `ArrowLeft`          | `ArrowRight`          | LANZAR `Space`, NIVEL `Enter`, SONIDO `KeyM` |
| snake     | `ArrowUp`         | `ArrowDown`          | `ArrowLeft`          | `ArrowRight`          | INICIO `Space`                               |
| tetris    | `ArrowUp` (girar) | `ArrowDown` (repeat) | `ArrowLeft` (repeat) | `ArrowRight` (repeat) | CAÍDA `Space`, GIRAR `KeyX`                  |

Las etiquetas de la cruceta son flechas (`▲ ▼ ◀ ▶`); las de botones, el texto de la tabla.

## Plan de implementación

1. `games/types.ts`: añadir `TouchKey`, `TouchControls` y `EngineDef.controls?`. En `.claude/skills/add-game/contract.md`: mismo tipo y regla "el motor acepta `KeyboardEvent` sintéticos (no filtra `isTrusted`); cada juego declara `controls`". `npm run lint` y `npm run build` pasan; sin cambio visible.
2. `games/registry.ts`: declarar `controls` en las 4 entradas según la tabla. Sin cambio visible.
3. `components/touch-controls.tsx`: componente cliente con props `controls: TouchControls` y `disabled: boolean`. Pointer events por botón con `setPointerCapture`; `keydown`/`keyup` sintéticos; timers de repeat; `keyup` de todo lo mantenido al pasar a `disabled` y al desmontar.
4. `app/globals.css`: estilos `.player-stage`, `.touch-controls`, `.touch-dpad`, `.touch-btn` (≥48 px, estética neón del sitio, estado `:active` y atenuado). `display: none` fuera de `pointer: coarse`. Layout vertical y horizontal. `touch-action`/`user-select`/`-webkit-touch-callout` en `.player-stage`.
5. `components/game-player.tsx`: envolver `.crt` + `<TouchControls>` en `.player-stage` (con `ref`); renderizar el mando solo si `engine?.controls`; `disabled={paused || over}`.
6. `components/game-player.tsx`: efecto `visibilitychange` → `setPaused(true)` si `!over`.
7. `components/game-player.tsx`: botón `PANTALLA`/`SALIR PANTALLA` con `fullscreenEnabled` leído en efecto y estado sincronizado con `fullscreenchange`.
8. `app/globals.css` + `components/game-player.tsx`: HUD compacto a ≤720 px (wrap de `.hud-actions`, botones y stats más pequeños, `.crt` con menos padding) y atributos/tamaño de fuente del input del modal.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Ningún archivo bajo `games/asteroids/`, `games/arkanoid/`, `games/snake/` ni `games/tetris/` cambia.
- [ ] En escritorio (ratón) el mando no se ve y el teclado funciona igual que antes en los 4 juegos.
- [ ] En emulación táctil de Chrome DevTools (iPhone 12, 390×844) el mando aparece bajo el CRT en vertical.
- [ ] En la misma emulación girada (844×390) la cruceta queda a la izquierda, los botones a la derecha y el CRT entero es visible sin scroll vertical.
- [ ] Asteroids: mantener ◀/▶ rota, mantener ▲ empuja, DISPARO dispara; rotar y disparar a la vez funciona.
- [ ] Arkanoid: en el menú ▲/▼ cambia el nivel y NIVEL lo inicia; LANZAR inicia en nivel 1 y suelta la bola; mantener ◀/▶ mueve la pala; SONIDO alterna el sonido.
- [ ] Snake: INICIO o una flecha arranca; cada toque de flecha gira una vez.
- [ ] Tetris: mantener ◀/▶/▼ mueve repetidamente tras ~170 ms; ▲ y GIRAR rotan una vez por toque; CAÍDA hace hard drop.
- [ ] Soltar el dedo fuera del botón detiene la acción (sin teclas "pegadas").
- [ ] Pulsar PAUSA con ◀ mantenido y reanudar: la pala/nave no sigue moviéndose.
- [ ] En pausa y con el modal abierto el mando se ve atenuado y no actúa.
- [ ] Tocar y arrastrar sobre el CRT o el mando no hace scroll de la página; doble toque no hace zoom.
- [ ] Cambiar de pestaña durante una partida la deja en EN PAUSA al volver.
- [ ] PANTALLA pone `.player-stage` a pantalla completa (Chrome Android/escritorio) y SALIR PANTALLA la cierra; en un navegador sin `fullscreenEnabled` el botón no aparece.
- [ ] A 360 px de ancho el reproductor no tiene scroll horizontal y todos los botones del HUD son visibles.
- [ ] En el modal, el input de iniciales no provoca zoom en iOS y GUARDAR PUNTUACIÓN funciona con el teclado virtual.
- [ ] Los juegos simulados no muestran mando y siguen funcionando.

## Decisiones

- **Sí:** mando virtual que emite `KeyboardEvent` sintéticos en `window`. Reutiliza el input de los 4 motores sin tocarlos.
- **No:** gestos por juego (swipe, arrastrar pala). Más naturales, pero amplían el contrato y requieren listeners pointer en cada motor.
- **No:** híbrido (mando + arrastre en Arkanoid). Rompería la regla de motores intactos.
- **Sí:** layout en `EngineDef.controls`. Vive junto al resto de metadatos del juego; un juego nuevo declara su mando en el registro.
- **No:** archivo de layouts aparte por slug. Duplicaría la fuente de verdad del registro.
- **Sí:** visibilidad por `@media (pointer: coarse)`. Sin JS de detección; los portátiles táctiles con ratón principal no lo ven.
- **No:** botón para forzar el mando ni mando siempre visible.
- **Sí:** autorrepetición solo en botones con `repeat: true` (Tetris ◀ ▶ ▼), 170 ms + 50 ms. Imita el teclado; Snake y Arkanoid ignoran `e.repeat` igualmente.
- **No:** háptica. `navigator.vibrate` no existe en iOS.
- **Sí:** NIVEL (`Enter`) y SONIDO (`KeyM`) en Arkanoid. Paridad con el teclado.
- **Sí:** vertical y horizontal. **No:** bloqueo de orientación ni aviso GIRA EL DISPOSITIVO.
- **Sí:** pantalla completa sobre `.player-stage` (incluye mando). **No:** fallback en iPhone Safari (sin Fullscreen API en elementos); el botón se oculta.
- **Sí:** pausa en `visibilitychange` sin reanudar sola. Evita perder vidas al bloquear el móvil.
- **No:** `user-scalable=no` en el viewport. Rompe accesibilidad; el zoom se evita con `touch-action` solo en `.player-stage`.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tecla "pegada" si se pierde `pointerup` (dedo sale, llamada entrante) | `setPointerCapture` + `keyup` en `pointercancel`/`lostpointercapture`, al pasar a `disabled` y al desmontar.           |
| Un motor futuro filtre `event.isTrusted`                              | Documentado: el contrato exige aceptar eventos sintéticos de `window`.                                                 |
| En horizontal el CRT queda diminuto en móviles bajos                  | CRT limitado por `100dvh` y padding del `.crt` reducido en `pointer: coarse`; pantalla completa disponible en Android. |
| Probar en dispositivo real desde la LAN bloqueado por Next 16         | `npm run dev -- -H 0.0.0.0` y, si avisa de origen, `allowedDevOrigins` solo en local (no versionado).                  |

## Qué **no** entra en esta spec

- Gestos por juego y cambios en los motores.
- Háptica, gamepad físico, bloqueo de orientación.
- Mando en escritorio, personalizable o persistido.
- Mando para juegos simulados.

Cada uno, si llega, va en su propia spec.
