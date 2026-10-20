# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Borrador
> **Depende de:** —
> **Fecha:** 2026-10-20
> **Objetivo:** Implementar en Next.js las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor simulado, login y salón de la fama) solo a nivel visual, con datos mock y sin juegos reales.

## Alcance

**Dentro:**

- Navbar sticky con logo, links (Biblioteca, Salón de la Fama), contador de créditos estático, botón "Iniciar Sesión" y panel móvil (hamburguesa).
- Footer `© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0` en el layout.
- Biblioteca (`/`): hero, búsqueda por nombre, chips de categoría, grid de 8 cards con tilt 3D y estado "NO HAY RESULTADOS".
- Detalle (`/juegos/[id]`): portada CSS, tags, descripción, stat-strip, botones JUGAR AHORA / VOLVER AL VAULT y leaderboard de 10 filas.
- Reproductor simulado (`/juegos/[id]/jugar`): HUD, CRT con arena decorativa animada, puntuación que sube sola, PAUSA/REANUDAR, FIN, SALIR y modal FIN DEL JUEGO.
- Login (`/login`): tabs Iniciar Sesión / Crear Cuenta, campos, botón invitado, botones sociales; todo sin efecto real salvo navegar a `/`.
- Salón de la Fama (`/salon?juego=id`): tabs por juego, podio top 3 y tabla de 12 filas.
- 404 temática (`app/not-found.tsx`) para ids inexistentes.
- Datos mock tipados en `lib/games.ts` y `lib/scores.ts`.

**Fuera (specs futuras):**

- Juegos jugables reales.
- Autenticación real, sesión de usuario y fila "TU MEJOR MARCA" del salón.
- Persistencia de puntuaciones (localStorage o backend).
- Créditos/monedas funcionales.
- Login social (Google/GitHub).
- Migración de estilos a utilidades Tailwind.

## Modelo de datos

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  id: string;          // slug, p.ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: `cover-${string}`; // clase CSS existente en globals.css
  color: GameColor;
  best: number;
  plays: string;       // "12.4K"
};

export const GAMES: Game[];                    // los 8 juegos de data.jsx, textos idénticos
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;

// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // port 1:1 del template (determinista)
```

Convenciones:

- Semillas iguales al template: detalle `id.length * 17 + 3` (10 filas); salón `id.length * 23 + 7` (12 filas).
- Números formateados con `toLocaleString("es-ES")`.
- Sin estado persistente: nada se guarda entre sesiones.

## Plan de implementación

1. Crear `lib/games.ts` y `lib/scores.ts` con tipos y datos portados de `references/templates/data.jsx`. `npm run lint` pasa.
2. Crear `components/nav.tsx` (client, `usePathname` para link activo; Biblioteca activa en `/` y `/juegos/*`) con panel móvil. Añadir nav y footer en `app/layout.tsx` dentro de `.av-app`, envolviendo `children` en `<main className="av-main">`.
3. Crear `components/game-card.tsx` (client, tilt con `onMouseMove`) y `components/library.tsx` (client, búsqueda + chips con `useState`). Reemplazar `app/page.tsx` por hero + `<Library />`.
4. Crear `app/juegos/[id]/page.tsx` (server): `getGame` → `notFound()` si no existe; `generateStaticParams` con los 8 ids; leaderboard con `seededScores`. Crear `app/not-found.tsx` temático con botón a `/`.
5. Crear `app/juegos/[id]/jugar/page.tsx` (server, valida id) + `components/game-player.tsx` (client): HUD, CRT con `.game-arena`, intervalo de puntuación (220 ms), subida de nivel, pausa, modal FIN con input de iniciales (máx. 10, mayúsculas, default `INVITADO`); "GUARDAR PUNTUACIÓN" solo muestra el toast, no persiste.
6. Crear `app/login/page.tsx` + `components/auth-form.tsx` (client): tabs, campo email solo en Crear Cuenta, submit e invitado hacen `router.push("/")`; sociales sin acción.
7. Crear `app/salon/page.tsx` + `components/hall-of-fame.tsx`: lee `searchParams.juego` (default primer juego, id inválido → primer juego), tabs como `<Link href="/salon?juego=...">`, podio y tabla con animación `rise`. Envolver la parte dinámica en `<Suspense>` según docs de `cacheComponents`.
8. Ajustar `metadata` por página (título por juego en detalle). `npm run build` sin errores.

Antes de los pasos 4, 5 y 7, leer en `node_modules/next/dist/docs/` lo relativo a `params`/`searchParams` (Promise), `generateStaticParams`, `notFound` y `cacheComponents`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra hero y 8 cards; escribir "ser" deja solo SERPENTINA.
- [ ] Chip PUZZLE deja solo CAÍDA; búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Click en una card o en JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/caida` muestra título, stat-strip y leaderboard de 10 filas con top 3 en oro/plata/bronce.
- [ ] `/juegos/xyz` muestra la 404 temática con botón que vuelve a `/`.
- [ ] JUGAR AHORA navega a `/juegos/<id>/jugar`; la puntuación sube sola.
- [ ] PAUSA congela la puntuación y muestra "EN PAUSA"; REANUDAR la reanuda.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN muestra "▸ PUNTUACIÓN GUARDADA_"; JUGAR DE NUEVO reinicia a 0, 3 vidas, nivel 01.
- [ ] SALIR vuelve al detalle; VOLVER AL VAULT va a `/`.
- [ ] `/login`: tab CREAR CUENTA muestra campo de correo; ENTRAR AL VAULT y JUGAR COMO INVITADO navegan a `/`.
- [ ] `/salon` muestra BLOQUE BUSTER por defecto; click en tab CAÍDA cambia la URL a `/salon?juego=caida` y el podio/tabla.
- [ ] El link activo de la navbar corresponde a la ruta actual.
- [ ] A <840px se ocultan los links y aparece la hamburguesa; el panel abre y cierra con el backdrop.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** rutas App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`). URLs reales y typed routes.
- **No:** SPA por hash como el template. Pierde enlaces y SSR.
- **Sí:** reproductor simulado igual al template. Valida el diseño del HUD y modal antes de tener juegos.
- **Sí:** sin persistencia; login y guardar puntuación son solo visuales. Auth y scores merecen su propia spec.
- **No:** `av_user` / `av_scores` en localStorage. Se reemplazarán por persistencia real.
- **Sí:** reusar las clases de `app/globals.css` (ya contienen el CSS del template). Fidelidad 1:1.
- **No:** reescribir a utilidades Tailwind en este MVP.
- **Sí:** `lib/games.ts` + `lib/scores.ts` tipados.
- **Sí:** salón con `?juego=id`, enlazable.
- **Sí:** filtros de biblioteca en estado client. Simplicidad.
- **Sí:** `notFound()` + `app/not-found.tsx` temático y `generateStaticParams` para los 8 ids.
- **Sí:** componentes en `components/` (kebab-case). Convención estándar con alias `@/`.
- **Sí:** fila "TU MEJOR MARCA" del salón fuera; depende de usuario logueado.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents` exige `<Suspense>` al leer `searchParams`/`params` dinámicos | Leer docs en `node_modules/next/dist/docs/` antes de los pasos 4, 5 y 7; envolver la parte dinámica en `<Suspense>`. |
| Mismatch de hidratación por `toLocaleString` o datos aleatorios | `seededScores` es determinista; `Math.random` solo dentro de `useEffect` del reproductor. |
| Tilt de cards por JS pisa el `transform` de `.card:hover` | Port 1:1 del template; resetear `style.transform` en `onMouseLeave`. |

## Lo que **no** está en esta spec

- Juegos reales.
- Autenticación y sesión.
- Persistencia de puntuaciones.
- Créditos funcionales.
- Login social.
- Migración a Tailwind utilities.

Cada uno, si llega, va en su propia spec.
