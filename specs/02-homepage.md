# SPEC 02 — Homepage y biblioteca en /games

> **Estado:** Borrador
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-21
> **Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` a `/` y mover biblioteca, detalle y reproductor bajo `/games`.

## Alcance

**Dentro:**

- Homepage en `/` con todas las secciones de `home.jsx`: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA" (6 mini-cards), stats, "ACTIVIDAD EN VIVO" (ticker + top 5), "PRECIOS" + FAQ y CTA final.
- Animación `reveal` al hacer scroll con `IntersectionObserver`; con `prefers-reduced-motion: reduce` las secciones aparecen sin animar.
- Biblioteca (hero + `<Library />`) movida de `/` a `/games`.
- Detalle y reproductor movidos de `/juegos/[id]` y `/juegos/[id]/jugar` a `/games/[id]` y `/games/[id]/jugar`; `/juegos` desaparece.
- Navbar con links Inicio (`/`), Biblioteca (`/games`) y Salón de la Fama (`/salon`), en desktop y panel móvil.
- Links de retorno (VOLVER AL VAULT, 404, salón, submit e invitado del login) apuntan a `/games`.
- CSS de las secciones HOME PAGE, ACTIVITY y PRICING de `references/templates/home-about/styles.css` añadido a `app/globals.css`.

**Fuera (specs futuras):**

- Página Acerca de / Contacto (`about.jsx`) y su link en la navbar.
- Redirects de `/juegos/*` a `/games/*`.
- Stats, ticker y top jugadores con datos reales.
- Abrir `/login` directamente en la tab Crear Cuenta.
- GAMEPAD y Theme variants de `styles.css`.

## Modelo de datos

```ts
// lib/home.ts — mock literal de home.jsx, textos idénticos
export type NeonColor = "cyan" | "magenta" | "green" | "yellow";

export type Feature = { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: NeonColor };
export type Stat = { n: string; u: string; s: string };                       // "12+", "JUEGOS", "Y CONTANDO"
export type TickerRow = { player: string; game: string; score: number; time: string; color: NeonColor };
export type TopRow = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];  // 4
export const STATS: Stat[];        // 3
export const TICKER: TickerRow[];  // 7
export const TOP_TODAY: TopRow[];  // 5
export const PRICING_PERKS: string[]; // 6
export const FAQS: Faq[];          // 3
```

Convenciones:

- Mini-cards: `GAMES.slice(0, 6)` de `lib/games.ts`; usan `cover`, `title` y `cat`.
- Números con `toLocaleString("es-ES")`.
- Sin estado persistente.

## Plan de implementación

1. Mover `app/juegos/` a `app/games/`. Actualizar `PageProps<"/games/[id]">`, `PageProps<"/games/[id]/jugar">` y hrefs en `app/games/[id]/page.tsx`, `components/game-card.tsx`, `components/game-player.tsx`. `npm run build` pasa.
2. Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero + `<Library />`) y su `metadata`. Dejar `app/page.tsx` como placeholder mínimo.
3. Cambiar links de retorno `/` → `/games` en `app/games/[id]/page.tsx`, `components/game-player.tsx`, `app/not-found.tsx`, `components/hall-of-fame.tsx` y `router.push` de `components/auth-form.tsx`.
4. Actualizar `components/nav.tsx`: link Inicio (activo solo en `/`), Biblioteca → `/games` (activa en `/games` y `/games/*`), Salón; mismos links en el panel móvil.
5. Copiar a `app/globals.css` las secciones HOME PAGE (líneas 930–1070), ACTIVITY y PRICING (1621–1744) de `references/templates/home-about/styles.css`. Añadir regla `prefers-reduced-motion` que deja `.reveal` visible sin transición.
6. Crear `lib/home.ts` con los datos del modelo.
7. Crear `components/home/` con: `floating-silhouettes.tsx` (SVG), `feature-icon.tsx` (SVG), `mini-card.tsx` (`<Link href="/games/<id>">`), `reveal.tsx` (client, `IntersectionObserver`, añade `.in`, `unobserve` al entrar).
8. Reemplazar `app/page.tsx` por la homepage (server) con hero y secciones 01–04 + CTA final. CTAs: EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA → `/games`; CREAR CUENTA y EMPEZAR GRATIS → `/login`; VER SALÓN → `/salon`. Añadir `metadata`.

Antes de los pasos 1, 2 y 8, leer en `node_modules/next/dist/docs/` lo relativo a typed routes, `metadata` y `cacheComponents`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra el hero "EL ARCADE CLÁSICO ESTÁ DE VUELTA" con siluetas animadas.
- [ ] `/` muestra en orden: // 01 ¿POR QUÉ ARCADE VAULT?, // 02 JUEGOS DISPONIBLES AHORA, stats, // 03 ACTIVIDAD EN VIVO, // 04 PRECIOS y ¿LISTO PARA JUGAR?.
- [ ] La sección // 02 muestra exactamente 6 mini-cards; click en una navega a `/games/<id>`.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA navegan a `/games`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS navegan a `/login`; VER SALÓN navega a `/salon`.
- [ ] Las secciones con `.reveal` aparecen al entrar en viewport; con reduced-motion activo son visibles sin animación.
- [ ] `/games` muestra hero y 8 cards; búsqueda y chips funcionan como en SPEC 01.
- [ ] `/games/caida` muestra el detalle; JUGAR AHORA navega a `/games/caida/jugar`; SALIR vuelve a `/games/caida`.
- [ ] `/juegos/caida` devuelve la 404 temática.
- [ ] VOLVER AL VAULT (detalle y reproductor), el botón de la 404 y el del salón navegan a `/games`.
- [ ] ENTRAR AL VAULT y JUGAR COMO INVITADO navegan a `/games`.
- [ ] Navbar: Inicio activo en `/`; Biblioteca activa en `/games` y `/games/*`; Salón activo en `/salon`; el logo navega a `/`.
- [ ] El panel móvil muestra Inicio, Biblioteca, Salón de la Fama e Iniciar Sesión.
- [ ] No existe link "Acerca de".
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** todo bajo `/games` (`/games`, `/games/[id]`, `/games/[id]/jugar`). URLs coherentes.
- **No:** mantener `/juegos/[id]`. Mezcla de idiomas en la jerarquía.
- **No:** redirects desde `/juegos`. Proyecto sin usuarios ni enlaces externos aún.
- **Sí:** navbar Inicio + Biblioteca + Salón. Igual al template sin Acerca de.
- **No:** link "Acerca de". `about.jsx` queda fuera de esta spec.
- **Sí:** todas las secciones de `home.jsx`. Fidelidad 1:1.
- **Sí:** mock literal en `lib/home.ts` (incluye "12+ JUEGOS" aunque hay 8). Fidelidad al template; datos reales en otra spec.
- **No:** derivar stats y ticker de `GAMES`/`seededScores`.
- **Sí:** retornos a `/games`. Significan "volver a la biblioteca".
- **Sí:** CTAs de cuenta a `/login` sin query. No toca `auth-form`.
- **No:** `/login?tab=registro`. Requiere `searchParams` + Suspense.
- **Sí:** CSS copiado a `app/globals.css`. Misma convención que SPEC 01.
- **No:** Tailwind utilities.
- **Sí:** `reveal` en componente client aislado; homepage server. Minimiza JS de cliente.
- **Sí:** respetar `prefers-reduced-motion`. Accesibilidad.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Typed routes fallan si queda algún href a `/juegos` | `grep -rn "/juegos" app components` vacío antes del build. |
| `.reveal` con `opacity: 0` deja secciones invisibles si el JS no corre | Server render sin `.in`; el observer corre al hidratar. Reduced-motion las muestra siempre. |
| Clases del CSS nuevo chocan con las existentes de `globals.css` | Copiar solo las secciones indicadas; revisar duplicados de selectores antes de pegar. |
| `min-height: calc(100vh - 60px)` del hero depende de la altura de la navbar | Verificar visualmente en desktop y <840px. |

## Lo que **no** está en esta spec

- Página Acerca de / Contacto.
- Redirects `/juegos/*` → `/games/*`.
- Datos reales en stats, ticker y top.
- Tab Crear Cuenta por query.
- Estilos GAMEPAD y Theme variants.

Cada uno, si llega, va en su propia spec.
