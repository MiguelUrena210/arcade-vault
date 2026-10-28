# SPEC 12 — Skins claras y oscuras por juego (Hora Punta)

> **Estado:** Aprobado
> **Depende de:** SPEC 09, SPEC 10
> **Fecha:** 2026-10-28
> **Objetivo:** Que Hora Punta (`frogger`) tenga ≥3 skins, con ≥1 de fondo claro y ≥1 de fondo oscuro, contraste WCAG ≥3:1 en cada elemento jugable (texto ≥4.5:1) y sin colores hardcodeados ni ramas `classic: boolean` que impidan un tercer tema. Asteroids, Arkanoid, Snake y Tetris ya cumplen (SPEC 10, implementada).

## Auditoría (estado actual)

Luminancia relativa WCAG del fondo: clara si L > 0.5. Contraste = ratio WCAG contra el fondo.

| Juego     | Skins                           | Claras | Oscuras | Contraste mínimo                                | Cumple |
| --------- | ------------------------------- | ------ | ------- | ----------------------------------------------- | ------ |
| asteroids | neon, classic, notebook         | 1      | 2       | ≥3:1 (SPEC 10)                                  | ✔      |
| arkanoid  | neon, classic, poster           | 1      | 2       | ≥3:1 (SPEC 10)                                  | ✔      |
| snake     | neon, classic, amber            | 1      | 2       | ≥3:1 (SPEC 10)                                  | ✔      |
| tetris    | neon, retro, pastel, pixel, toy | 1      | 4       | ≥3:1 (SPEC 10)                                  | ✔      |
| frogger   | neon, classic                   | 0      | 2       | **1.68** (rana `#35c23a` sobre acera `#8a6fd6`) | ✘      |

Frogger aún no está en `ENGINES` (paso 7 de SPEC 09); se audita `games/frogger/theme.ts` contra los temas que registrará SPEC 09 (`neon` default, `classic`).

Problemas detectados en frogger (`games/frogger/theme.ts`):

- Solo 2 skins y ambas oscuras: NEÓN `#0a0a14` (L 0.003) y CLÁSICO `#4a4a52` (L 0.070).
- CLÁSICO: coche `#ff5d5d` a **2.92:1** sobre el asfalto `#4a4a52` (<3:1).
- CLÁSICO: rana `#35c23a` a **1.68:1** sobre la acera/mediana `#8a6fd6`, donde la rana se detiene (<3:1).
- `drawBoard`/`drawTraffic` ramifican por parámetro `classic: boolean`, no por paleta: no admiten un tercer tema.
- Literales fuera de la paleta: `#f2c21e` (línea central doble), `#1c1c22` (ruedas), `rgba(255, 255, 255, 0.35)` (parabrisas), `rgba(10, 10, 20, 0.85)` (carrocería NEÓN), `#ffffff` (faros), `rgba(0, 0, 0, 0.35)` (pista de la barra de tiempo).
- `drawFrog`: la pupila usa `p.bg`; sobre fondo claro la pupila sería clara sobre ojo claro (invisible).
- NEÓN cumple contraste en todos los elementos (mínimo 5.14, coche `#ff006e`).

## Alcance

**Dentro (solo frogger):**

- Skin nueva `diorama` / DIORAMA (clara): tercera skin y única de fondo claro.
- Ajuste de contraste de CLÁSICO: coche `#ff5d5d` → `#ff6b6b` y acera `#8a6fd6` → `#3d2f73` (ids y concepto intactos).
- `Palette` gana `medianLine`, `vehicleStyle`, `vehicleBody`, `headlight`, `wheel`, `windshield`, `frogPupil` y `timerTrack`; los literales pasan a la paleta y las ramas por `classic: boolean` pasan a ser por propiedades de paleta.
- Registro: `{ id: "diorama", label: "DIORAMA" }` **al final** de `ENGINES.frogger.themes`; `neon` sigue siendo el primero (default) y los ids existentes no cambian.
- `themeOf(id)` del motor: `id` si es clave de `PALETTES`, si no `"neon"` (compatible con SPEC 09 § Modelo de datos).
- El botón ESTILO recorre los 3 temas en caliente vía `setTheme`, sin reiniciar la partida.

**Fuera:**

- Asteroids, Arkanoid, Snake y Tetris (cumplen por SPEC 10).
- Persistir el tema, assets nuevos, cambios en `components/`, `app/` y `.crt-screen`.
- Rediseñar NEÓN (queda idéntica) o cambiar jugabilidad/HUD de SPEC 09.

## Skins de frogger

| id        | Label   | Fondo  | Concepto                                                                                     |
| --------- | ------- | ------ | -------------------------------------------------------------------------------------------- |
| `neon`    | NEÓN    | oscura | (existente, default) autopista nocturna: contornos luminosos, faros y rana verde neón.       |
| `classic` | CLÁSICO | oscura | (existente, colores ajustados) arcade 1981: asfalto gris, vehículos planos con ruedas.       |
| `diorama` | DIORAMA | clara  | Maqueta de cartulina recortada: carretera beige, tintas planas con ruedas oscuras, sin glow. |

Resultado: frogger 3 skins (1 clara, 2 oscuras).

## Modelo de datos — `games/frogger/theme.ts`

```ts
export type HoraPuntaTheme = "neon" | "classic" | "diorama";

export type Palette = {
  bg: string; // asfalto
  sidewalk: string; // acera y mediana
  hedge: string; // seto de la meta
  home: string; // madriguera libre
  laneLine: string; // líneas discontinuas
  medianLine: string | null; // línea central doble en la mediana; null = sin línea
  frog: string;
  frogEye: string;
  frogPupil: string; // antes p.bg literal en drawFrog
  vehicles: Record<VehicleKind, string>;
  vehicleStyle: "outline" | "flat"; // antes rama por `classic: boolean`
  vehicleBody: string; // relleno interior en estilo outline (antes rgba(10,10,20,0.85))
  headlight: string; // faros en estilo outline (antes #ffffff)
  wheel: string; // ruedas en estilo flat (antes #1c1c22)
  windshield: string; // parabrisas en estilo flat (antes rgba(255,255,255,0.35))
  timer: string;
  timerLow: string; // < 5 s
  timerTrack: string; // pista de la barra (antes rgba(0,0,0,0.35))
  glow: number; // shadowBlur; 0 en CLÁSICO y DIORAMA
  text: string;
};
```

Cambios estructurales:

- `drawBoard(ctx, p, homes)` y `drawTraffic(ctx, p, lanes)` pierden el parámetro `classic` y ramifican por `p.vehicleStyle`, `p.medianLine` y `p.glow` (glow de líneas solo si `p.glow > 0`; grosor de línea discontinua: 4 en `flat`, 3 en `outline` → pasa a depender de `p.vehicleStyle`).
- `drawFrog`: la pupila usa `p.frogPupil` en lugar de `p.bg`.
- `drawTimerBar`: la pista usa `p.timerTrack`.
- `engine.ts` (paso 6 de SPEC 09): `themeOf(id)` devuelve `id` si `id in PALETTES`, si no `"neon"`; `setTheme` cambia la paleta en caliente sin reiniciar.

### `neon` (oscura, fondo L 0.003) — sin cambio visual

Valores nuevos: `medianLine: null`, `vehicleStyle: "outline"`, `vehicleBody: "rgba(10, 10, 20, 0.85)"`, `headlight: "#ffffff"`, `wheel: "#1c1c22"`, `windshield: "rgba(255, 255, 255, 0.35)"`, `frogPupil: "#0a0a14"`, `timerTrack: "rgba(0, 0, 0, 0.35)"`. Resto igual. Contrastes actuales (vs `#0a0a14`): rana `#00ff88` 14.70, carril `#00f5ff` 14.54, moto 14.54, coche `#ff006e` 5.14, camión `#ffd60a` 13.95, timer 14.70, timerLow `#ff3355` 5.50, texto `#eaffff` 18.99. Todos ≥3:1 (texto ≥4.5:1).

### `classic` (oscura, fondo L 0.070) — ajuste de contraste

| Clave        | Antes     | Después   | Contraste vs fondo              |
| ------------ | --------- | --------- | ------------------------------- |
| `bg`         | `#4a4a52` | `#4a4a52` | —                               |
| `sidewalk`   | `#8a6fd6` | `#3d2f73` | rana 4.82 vs acera (antes 1.68) |
| `hedge`      | `#1e9e3c` | `#1e9e3c` | decorativo                      |
| `home`       | `#0d0d12` | `#0d0d12` | rana 8.24 vs madriguera         |
| `laneLine`   | `#e8e8e8` | `#e8e8e8` | 7.16                            |
| `medianLine` | (literal) | `#f2c21e` | decorativo                      |
| `frog`       | `#35c23a` | `#35c23a` | 3.73                            |
| `frogEye`    | `#ffffff` | `#ffffff` | detalle                         |
| `frogPupil`  | (`p.bg`)  | `#4a4a52` | detalle (sin cambio visual)     |
| moto         | `#ffd23f` | `#ffd23f` | 6.07                            |
| coche        | `#ff5d5d` | `#ff6b6b` | 3.16 (antes 2.92)               |
| camión       | `#d9d9e6` | `#d9d9e6` | 6.27                            |
| `timer`      | `#35c23a` | `#35c23a` | 3.73 (≥5 vs pista)              |
| `timerLow`   | `#e03030` | `#e03030` | ≥3 vs pista                     |
| `glow`       | `0`       | `0`       | —                               |
| `text`       | `#ffffff` | `#ffffff` | 8.78                            |

`vehicleStyle: "flat"`, `vehicleBody: "rgba(10, 10, 20, 0.85)"` (sin uso en flat), `headlight: "#ffffff"`, `wheel: "#1c1c22"`, `windshield: "rgba(255, 255, 255, 0.35)"`, `timerTrack: "rgba(0, 0, 0, 0.35)"`. La acera sigue siendo violeta (más oscura); el resto de CLÁSICO no cambia.

### `diorama` (clara, fondo L 0.687)

| Clave          | Valor                        | Contraste vs fondo               |
| -------------- | ---------------------------- | -------------------------------- |
| `bg`           | `#dcd8cc`                    | —                                |
| `sidewalk`     | `#efe9da`                    | rana 6.50 vs acera               |
| `hedge`        | `#7cb342`                    | decorativo                       |
| `home`         | `#f4efe2`                    | rana 6.85 vs madriguera          |
| `laneLine`     | `#4a4a4a`                    | 6.22                             |
| `medianLine`   | `#b8860b`                    | decorativo                       |
| `frog`         | `#1b5e20`                    | 5.52                             |
| `frogEye`      | `#fffdf5`                    | detalle (8.0 vs rana)            |
| `frogPupil`    | `#1a1a1a`                    | detalle                          |
| `vehicles`     | moto `#1565c0`               | 4.03                             |
|                | coche `#c62828`              | 3.95                             |
|                | camión `#5d4037`             | 6.54                             |
| `vehicleStyle` | `"flat"`                     | —                                |
| `vehicleBody`  | `"rgba(10, 10, 20, 0.85)"`   | sin uso en flat                  |
| `headlight`    | `#262626`                    | sin uso en flat                  |
| `wheel`        | `#262626`                    | 10.62                            |
| `windshield`   | `"rgba(255, 255, 255, 0.5)"` | decorativo (resalta sobre tinta) |
| `timer`        | `#1b5e20`                    | 5.52                             |
| `timerLow`     | `#b71c1c`                    | 4.61                             |
| `timerTrack`   | `"rgba(0, 0, 0, 0.15)"`      | decorativo                       |
| `glow`         | `0`                          | —                                |
| `text`         | `#262626`                    | 10.62                            |

Convenciones (como SPEC 10): glow solo en la skin oscura NEÓN; DIORAMA y CLÁSICO con `glow: 0` y `shadowBlur` a 0 tras dibujar; todo color proviene de la paleta, ningún literal de color en `drawBoard`/`drawTraffic`/`drawFrog`/`drawTimerBar`; sin assets nuevos; Canvas 2D 800×600; sin HUD, menús, GAME OVER, sonido ni localStorage.

## Archivos a tocar

- `games/frogger/theme.ts`: tipo `HoraPuntaTheme`, `Palette` ampliada, skin `diorama`, ajuste de `classic`, ramas por paleta.
- `games/frogger/engine.ts` (existente tras el paso 6 de SPEC 09): `themeOf` generalizado (`id in PALETTES`), llamadas a `drawBoard`/`drawTraffic` sin el parámetro `classic`.
- `games/registry.ts`: añadir `{ id: "diorama", label: "DIORAMA" }` al final de `ENGINES.frogger.themes`.

## Plan de implementación

1. Ampliar `Palette` y mover los literales de `theme.ts` a `PALETTES` (`neon` y `classic` sin cambio visual salvo coche y acera de CLÁSICO).
2. Ramificar `drawBoard`/`drawTraffic`/`drawFrog`/`drawTimerBar` por propiedades de paleta; eliminar el parámetro `classic`.
3. Añadir la skin `diorama`.
4. Actualizar `engine.ts` (`themeOf`, llamadas) y `games/registry.ts`.
5. `npm run lint` y `npm run build`.

Esta spec se implementa **después** de completar SPEC 09 (requiere `engine.ts` y la entrada `frogger` en `ENGINES`).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] `ENGINES.frogger.themes` = `neon`, `classic`, `diorama` (en ese orden); cada id es clave de `PALETTES` y de `HoraPuntaTheme`.
- [ ] Frogger tiene ≥1 skin con fondo L > 0.5 (`diorama`, L 0.687) y ≥2 con L ≤ 0.5 (`neon`, `classic`).
- [ ] Contrastes de las tablas: rana, vehículos, líneas de carril y barra de tiempo ≥3:1 contra su superficie (asfalto, acera o madriguera); texto de pista ≥4.5:1 en las 3 skins.
- [ ] El primer tema sigue siendo `neon` y la página arranca en NEÓN; ids existentes sin cambios.
- [ ] NEÓN se ve igual que antes; CLÁSICO solo cambia el coche (`#ff6b6b`) y la acera/mediana (`#3d2f73`).
- [ ] El botón ESTILO recorre NEÓN → CLÁSICO → DIORAMA → NEÓN vía `setTheme` sin reiniciar la partida ni perder score, vidas o tiempo.
- [ ] DIORAMA sin glow (`shadowBlur` 0 en tablero, vehículos, rana y texto).
- [ ] `grep -n '#f2c21e\|#1c1c22\|rgba(10, 10, 20\|rgba(0, 0, 0, 0.35)' games/frogger/theme.ts` solo dentro de `PALETTES`; sin parámetro `classic` en las firmas de dibujo.
- [ ] En DIORAMA la pupila de la rana es visible (`frogPupil` oscuro sobre ojo claro) y las madrigueras libres se distinguen (borde `frog` sobre `home` claro).
- [ ] Sin assets nuevos, sin escritura en localStorage, sin cambios en `components/` ni `app/`.

## Decisiones

- **Sí:** una sola skin nueva (`diorama`). Cumple ≥3 y clara/oscura con el menor cambio, como en SPEC 10.
- **Sí:** `diorama` al final de `themes`. No altera el default ni el orden de ESTILO.
- **Sí:** ajustar coche y acera de CLÁSICO. Son los únicos elementos bajo 3:1; el id y el concepto (arcade 1981, acera violeta) no cambian. Oscurecer la acera (4.82:1 con la rana) es la única vía: aclarar la rana hasta 3:1 sobre `#8a6fd6` la volvería casi blanca.
- **Sí:** ramificar por `vehicleStyle`/`medianLine` en vez de `classic: boolean`. Escala a nuevas skins sin `if (classic)` (mismo criterio que SPEC 10 con `board`/`segment` de Snake).
- **Sí:** DIORAMA reutiliza el estilo `flat` con otra paleta. Concepto propio (maqueta de cartulina diurna vs arcade nocturno) sin ramas de dibujo nuevas.
- **No:** nueva rama de dibujo exclusiva para DIORAMA. El estilo plano con ruedas ya transmite el concepto; menos código que mantener.
- **No:** tocar los otros 4 juegos. Auditados y conformes tras SPEC 10.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| SPEC 09 sigue en implementación; `engine.ts` aún no existe                 | Esta spec depende de SPEC 09; se implementa cuando `frogger` esté registrado. |
| Acera de CLÁSICO más oscura queda cerca del asfalto en luminancia (1.06:1) | El tono violeta saturado la distingue por matiz; es zona segura, no jugable.  |
| Coche de CLÁSICO a 3.16:1, cerca del límite                                | Franja de parabrisas blanca (`windshield`) refuerza la silueta.               |
| Viñeta y scanlines del CRT oscurecen bordes en DIORAMA                     | Aceptado, igual que en SPEC 10; ajuste de `.crt-screen` fuera de alcance.     |
| Quitar el parámetro `classic` rompe llamadas                               | Solo las hará `games/frogger/engine.ts`; `npm run build` lo verifica.         |

## Lo que **no** está en esta spec

- Skins adicionales para asteroids, arkanoid, snake o tetris.
- Persistencia del tema elegido y ajustes de `.crt-screen`.
- Sprites o assets para frogger.

Cada uno, si llega, va en su propia spec.
