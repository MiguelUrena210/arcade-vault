# SPEC 13 — Mando táctil de Hora Punta

> **Estado:** Aprobado
> **Depende de:** SPEC 11, SPEC 09
> **Fecha:** 2026-10-28
> **Objetivo:** Que Hora Punta (`frogger`) sea jugable de principio a fin en móvil declarando `controls` en su entrada de `ENGINES`, sin tocar el motor.

## Alcance

**Dentro:**

- Campo `controls` en `ENGINES.frogger` (`games/registry.ts`), reutilizando la constante `DPAD`.

**Fuera:**

- Cambios en `games/frogger/` (motor, entidades, config, tema).
- Cambios en `components/touch-controls.tsx`, `components/game-player.tsx` o `app/globals.css`.
- Gestos (swipe para saltar): irían en una spec aparte.
- Teclas WASD en el mando: duplican las flechas, una tecla por acción.

## Mando

| ↑             | ↓           | ←           | →            | Botones        |
| ------------- | ----------- | ----------- | ------------ | -------------- |
| `ArrowUp` (▲) | `ArrowDown` | `ArrowLeft` | `ArrowRight` | INICIO `Space` |

```ts
// games/registry.ts → ENGINES.frogger
controls: {
  dpad: DPAD,
  buttons: [{ code: "Space", label: "INICIO" }],
},
```

### Inventario del input (`games/frogger/engine.ts`)

| Tecla                 | Acción                                                     | Patrón                                              | `repeat` | En mando    |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------- | -------- | ----------- |
| `ArrowUp` / `KeyW`    | Salto de 1 celda arriba; en `ready` además inicia          | Pulsación única (solo `keydown`, filtra `e.repeat`) | No       | Sí (▲)      |
| `ArrowDown` / `KeyS`  | Salto de 1 celda abajo; en `ready` solo inicia (sin salto) | Pulsación única                                     | No       | Sí (▼)      |
| `ArrowLeft` / `KeyA`  | Salto de 1 celda a la izquierda; en `ready` inicia y salta | Pulsación única                                     | No       | Sí (◀)      |
| `ArrowRight` / `KeyD` | Salto de 1 celda a la derecha; en `ready` inicia y salta   | Pulsación única                                     | No       | Sí (▶)      |
| `Space`               | Inicia la partida en `ready` (sin mover la rana)           | Pulsación única                                     | No       | Sí (INICIO) |

Notas del motor:

- Solo hay listener `keydown` en `window`; `e.repeat` se descarta → mantener un botón no debe repetir: ningún `TouchKey` lleva `repeat`.
- El motor no filtra `isTrusted` y hace `preventDefault` solo en teclas del juego, salvo con `e.target` de texto: cumple el contrato de SPEC 11, sin bloqueos.
- Buffer de salto de 1 (`frog.queued`), que `resume()` limpia: la pausa no deja saltos pendientes.
- No hay más teclas: pausa (`P`/`Escape`) la gestiona `GamePlayer` y el reinicio tras GAME OVER va por el modal de la plataforma.

## Plan de implementación

1. `games/registry.ts`: añadir `controls` a `ENGINES.frogger` con el objeto de arriba (cruceta completa con `DPAD` y botón INICIO `Space`). Sin más cambios.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Ningún archivo de `games/frogger/` cambia.
- [ ] En emulación táctil de Chrome DevTools (iPhone 12), en vertical (390×844) y en horizontal (844×390), Hora Punta es jugable de principio a fin solo con el mando: iniciar, cruzar niveles y llegar a GAME OVER.
- [ ] En `ready`, tocar INICIO inicia la partida sin mover la rana; tocar ▲/◀/▶ inicia y salta; tocar ▼ solo inicia.
- [ ] En juego, cada toque de ▲ ▼ ◀ ▶ produce exactamente un salto de 1 celda; mantener un botón no repite el salto.
- [ ] Soltar el dedo fuera del botón o pulsar PAUSA con una dirección mantenida no deja teclas pegadas ni saltos al reanudar.
- [ ] En escritorio el mando no se ve y el teclado (flechas, WASD, `Space`) funciona igual que antes.

## Decisiones

- **Sí:** cruceta completa (`DPAD` entera). Las 4 direcciones se usan en partida.
- **Sí:** botón INICIO `Space`. Paridad con el motor y arranque sin salto accidental (▲ en `ready` inicia y además salta).
- **No:** `repeat` en ninguna tecla. El motor filtra `e.repeat`; la repetición no tendría efecto y confundiría.
- **No:** mapear WASD. Duplican las flechas; una tecla por acción (SPEC 11).
- **No:** botón de pausa o reinicio. Los cubre el HUD de `GamePlayer`.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| El jugador espera que mantener ▲ encadene saltos (como en otros juegos) | Comportamiento idéntico al teclado físico (el motor descarta `e.repeat`); un toque, un salto. |
| Toques rápidos consecutivos durante la animación de salto               | El buffer de 1 del motor ya los absorbe; sin cambios necesarios.                              |
