# SPEC 05 — Tabla de juegos y leaderboard en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 03, SPEC 04
> **Fecha:** 2026-10-22
> **Objetivo:** Mover el catálogo de juegos a una tabla `games` de Supabase y guardar/mostrar puntuaciones reales de Asteroids en un leaderboard (`scores`) leído por biblioteca, detalle y Salón de la Fama.

## Alcance

**Dentro:**

- Migraciones versionadas en `supabase/migrations/` aplicadas al proyecto remoto con MCP `apply_migration`.
- Diccionario de datos `docs/data-dictionary.md`, actualizado con cada migración.
- Tabla `games` sembrada con los 8 juegos actuales de `lib/games.ts`; pasa a ser la única fuente del catálogo.
- Tabla `scores` (iniciales + puntuación) con insert anónimo vía RLS, solo para juegos con `saves_scores = true` (solo `asteroids`).
- Vista `game_stats`: `best` = máx. score, `plays` = nº de scores guardados por juego.
- Cliente sin cookies `lib/supabase/public.ts` para lecturas con `'use cache'` + `cacheTag`.
- `lib/games.ts`: se elimina la constante `GAMES`; `getGames()` / `getGame(id)` async cacheadas, con `best`/`plays` de `game_stats`.
- `lib/scores.ts`: se elimina `seededScores`; `getTopScores(gameId)` devuelve top 10 (todas las partidas, score desc, empate por fecha asc).
- Consumidores migrados: `/` (home), `/games` (`Library` recibe `games` por props), `/games/[id]`, `/games/[id]/play`, `/hall-of-fame`.
- Estado vacío "SIN PUNTUACIONES AÚN" en sidebar del detalle y en Salón de la Fama; podio con huecos "—" si hay menos de 3 filas.
- `best` sin datos muestra `—`; `plays` sin datos muestra `0`.
- Server Action `saveScore` en `app/games/[id]/play/actions.ts`: valida, inserta con `lib/supabase/server.ts` y llama `updateTag`.
- Modal FIN DEL JUEGO (solo si `saves_scores`): GUARDANDO… deshabilitado, error con reintento, éxito con toast actual + enlace VER RANKING a `/hall-of-fame?game=<slug>`.
- `app/error.tsx` temático ("SEÑAL PERDIDA" + REINTENTAR) cuando falla la lectura de Supabase en `/`, `/games` y `/hall-of-fame`.
- `CLAUDE.md`: documentar `public.ts`, migraciones y tags de caché.

**Fuera (specs futuras):**

- Autenticación real, `profiles`, scores ligados a `auth.uid()`.
- Guardado real en los 7 juegos simulados (siguen con GUARDAR PUNTUACIÓN simulado).
- Anti-trampa server-side (validar partida, firmas, rate limit).
- Ranking "mejor por jugador", filtros por periodo, paginación más allá del top 10.
- Ticker de actividad de `lib/home.ts` con datos reales.
- Panel admin / borrado o moderación de scores.
- Realtime (suscripción a nuevos scores).
- Fallback a datos locales si Supabase cae.

## Modelo de datos

```sql
-- supabase/migrations/20261022000000_games_scores.sql: versión inicial (ids text), reemplazada por la siguiente.
-- supabase/migrations/20261022000100_games_scores_normalize.sql: esquema final.
create type public.game_category as enum ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS');
create type public.game_color as enum ('cyan', 'magenta', 'green', 'yellow');

create table public.games (
  id integer generated always as identity primary key,
  slug varchar(40) not null unique,
  title varchar(40) not null,
  short varchar(120) not null,
  long varchar(500) not null,
  cat public.game_category not null,
  cover varchar(40) not null check (cover like 'cover-%'),
  color public.game_color not null,
  sort_order integer not null,
  saves_scores boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.scores (
  id integer generated always as identity primary key,
  game_id integer not null references public.games(id) on delete cascade,
  initials varchar(10) not null check (initials ~ '^[A-Z0-9_]{3,10}$'),
  score integer not null check (score between 0 and 1000000),
  created_at timestamptz not null default now()
);
create index scores_game_rank_idx on public.scores (game_id, score desc, created_at asc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id, max(s.score) as best, count(s.id)::integer as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- RLS
alter table public.games enable row level security;
alter table public.scores enable row level security;
create policy "games_select" on public.games for select to anon, authenticated using (true);
create policy "scores_select" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert" on public.scores for insert to anon, authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.saves_scores));
-- sin policies de update/delete

-- seed: 8 filas con slug/title/short/long/cat/cover/color actuales de lib/games.ts,
-- sort_order 1..8 en el orden actual, saves_scores = true solo para 'asteroids'.
```

```ts
// lib/games.ts
export type Game = {
  id: number;
  slug: string; // ruta /games/<slug>
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: `cover-${string}`;
  color: GameColor;
  savesScores: boolean;
  best: number | null; // null → "—"
  plays: number;
};
export async function getGames(): Promise<Game[]>; // 'use cache'; cacheTag("games", "scores")
export async function getGame(slug: string): Promise<Game | undefined>; // filtra getGames() por slug
export const CATS; // sin cambios

// lib/scores.ts
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
}; // date "dd/mm/aaaa"
export async function getTopScores(
  gameId: number,
  limit = 10,
): Promise<ScoreRow[]>; // 'use cache'; cacheTag(`scores:${gameId}`)

// lib/supabase/public.ts
export function createPublicClient(): SupabaseClient<Database>; // supabase-js, publishable key, auth.persistSession=false

// app/games/[id]/play/actions.ts ('use server')
export async function saveScore(
  gameId: number,
  initials: string,
  score: number,
): Promise<{ ok: true } | { ok: false; error: string }>;
// on ok: updateTag(`scores:${gameId}`); updateTag("scores");
```

Convenciones:

- Tags de caché: `games`, `scores` (stats globales), `scores:<gameId>` (top por juego, `gameId` = `games.id`).
- Ids siempre `integer generated always as identity`; la URL usa `slug`. Strings como `varchar(n)`, nunca `text`. Catálogos cerrados como `enum`, no `CHECK ... in (...)`.
- Cada migración que cree o modifique tablas, vistas, enums o políticas actualiza `docs/data-dictionary.md`.
- `public.ts` solo dentro de `'use cache'`; nunca para escrituras. `server.ts` solo en la Server Action.
- `saveScore` revalida con la misma regex/rango que los CHECK antes de insertar.
- Números con `toLocaleString("es-ES")`, como hoy.
- Nada se escribe en localStorage.

## Plan de implementación

1. Crear `supabase/migrations/20261022000000_games_scores.sql` y `20261022000100_games_scores_normalize.sql` (enums, tablas con ids `integer` identity y `varchar`, índice, vista, RLS, seed). Aplicar con MCP `apply_migration`. Crear `docs/data-dictionary.md`. `npm run db:types`. MCP `get_advisors` (security) sin avisos sobre `games`/`scores`/`game_stats`. `npm run build` pasa.
2. Crear `lib/supabase/public.ts`. Actualizar `CLAUDE.md` (cliente público, migraciones, tags).
3. Reescribir `lib/games.ts` con `getGames`/`getGame` cacheadas y eliminar `GAMES`. Migrar `app/page.tsx`, `app/games/page.tsx` + `components/library.tsx` (prop `games`), `components/game-card.tsx` (`best` null → `—`), `app/games/[id]/page.tsx` y `app/games/[id]/play/page.tsx` (`generateStaticParams` async desde `getGames`). Build pasa; rutas iguales salvo best/plays.
4. Reescribir `lib/scores.ts` con `getTopScores`. Migrar sidebar de `app/games/[id]/page.tsx` y `components/hall-of-fame.tsx` (tabs desde `getGames`, default primer juego por `sort_order`, estado vacío, podio con huecos). `grep -rn "seededScores" app components lib` vacío.
5. Crear `app/games/[id]/play/actions.ts` con `saveScore`. Modificar `components/game-player.tsx`: si `game.savesScores`, el botón llama `saveScore` (GUARDANDO…/error+reintento/éxito+VER RANKING); si no, comportamiento simulado actual.
6. Crear `app/error.tsx` temático ("SEÑAL PERDIDA" + REINTENTAR con `retry`, la prop de reintento de esta versión de Next).
7. `npm run lint` y `npm run build` pasan; verificación manual de criterios.

Antes de los pasos 3–5, leer en `node_modules/next/dist/docs/` `use-cache.md`, `cacheTag.md`, `updateTag.md`, `generate-static-params` y Server Actions (`mutating-data`).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existen las dos migraciones en `supabase/migrations/` y MCP `list_migrations` las muestra aplicadas.
- [ ] `docs/data-dictionary.md` documenta `game_category`, `game_color`, `games`, `scores` y `game_stats` tal como están en la BD.
- [ ] Ninguna columna de `public` es `text`, todos los `id` son `integer` identity y `cat`/`color` son enums.
- [ ] MCP `list_tables` muestra `games` (8 filas) y `scores` con RLS activo.
- [ ] `lib/supabase/database.types.ts` incluye `games`, `scores` y `game_stats`.
- [ ] `grep -rn "GAMES\b\|seededScores" app components lib` no devuelve resultados.
- [ ] `/`, `/games`, `/games/<id>` y `/games/<id>/play` muestran los mismos 8 juegos, textos y portadas que antes.
- [ ] Con BD sin scores: cards y detalle muestran Mejor global `—` y Partidas `0`; detalle y Salón muestran "SIN PUNTUACIONES AÚN".
- [ ] Tras perder en `/games/asteroids/play` con iniciales `ABC`, GUARDAR PUNTUACIÓN muestra GUARDANDO…, luego "▸ PUNTUACIÓN GUARDADA_" y VER RANKING.
- [ ] VER RANKING abre `/hall-of-fame?game=asteroids` con la fila `ABC` y su score sin recargar manualmente; detalle de asteroids actualiza Mejor global y Partidas.
- [ ] Top 10 ordenado por score desc; con empate, el más antiguo primero.
- [ ] Iniciales `AB` o `A-B` muestran error en el modal y no insertan fila; el botón vuelve a estar activo.
- [ ] Insert directo con publishable key en `game_id` de `caida` o `score = 2000000` es rechazado por la BD.
- [ ] Update/delete en `scores` con publishable key no afecta filas.
- [ ] En `/games/caida/play` GUARDAR PUNTUACIÓN sigue simulado y no inserta filas.
- [ ] Con URL de Supabase inválida en `.env.local` (`next dev`), `/games` y `/hall-of-fame` muestran "SEÑAL PERDIDA" con REINTENTAR.
- [ ] No se escribe nada en localStorage.

## Decisiones

- **Sí:** `games` en Supabase como única fuente del catálogo. Permite FK y stats reales.
- **No:** tabla mínima solo para FK. Dos fuentes de verdad.
- **No:** fallback a constante local. Mismo motivo; error boundary en su lugar.
- **Sí:** scores anónimos con iniciales. Auth no existe aún.
- **No:** esperar a la spec de auth. Bloquea el leaderboard sin necesidad.
- **Sí:** solo `asteroids` guarda (`saves_scores`). Los simulados ensuciarían el ranking.
- **Sí:** top 10 de todas las partidas. Estilo arcade clásico; sin agregaciones.
- **No:** mejor por jugador. Iniciales no identifican a nadie sin auth.
- **Sí:** `best`/`plays` calculados en vista `game_stats`. Coherentes con el leaderboard.
- **No:** columnas estáticas `best`/`plays`. Números decorativos que contradicen el ranking.
- **Sí:** estado vacío real en juegos simulados; se elimina `seededScores`.
- **Sí:** `'use cache'` + `cacheTag` con cliente sin cookies. Compatible con `cacheComponents` y `generateStaticParams`.
- **No:** todo dinámico con `server.ts`. Un fetch por request y sin rutas estáticas.
- **Sí:** `updateTag` en la Server Action. Read-your-own-writes inmediato.
- **Sí:** migraciones en `supabase/migrations/` + MCP. SQL versionado y reproducible.
- **Sí:** CHECK de iniciales (`^[A-Z0-9_]{3,10}$`) y score (0–1.000.000) + validación en la action.
- **No:** anti-trampa server-side. Requiere auth/sesiones de partida; spec futura.
- **Sí:** ticker de home sigue simulado. Fuera de alcance.
- **Sí:** criterio de `error.tsx` acotado a `/`, `/games` y `/hall-of-fame`. En detalle y play el fallo ocurre en `generateStaticParams`, previo al boundary.
- **No:** capturar el error de `generateStaticParams` solo en desarrollo. Código extra solo para que una prueba manual en dev dé el resultado esperado; el build ya falla de forma visible.
- **Sí:** ids `integer` identity + columna `slug` para URLs. Convención de la BD.
- **No:** ids `text` ni `bigint`. Los slugs no son claves.
- **Sí:** `varchar(n)` en lugar de `text` y enums para `cat`/`color`. Convención de la BD.
- **Sí:** `docs/data-dictionary.md` mantenido en cada migración.

## Riesgos

| Riesgo                                                                                                                      | Mitigación                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Inserts anónimos falsificables con la publishable key                                                                       | CHECK de rango + RLS solo en `saves_scores`; aceptado hasta la spec de auth.                                                         |
| `next build` requiere Supabase accesible (`generateStaticParams`, prerender)                                                | Env en `.env.local`; fallo de build visible, no silencioso.                                                                          |
| Con Supabase caído, `/games/<slug>` y `/games/<slug>/play` fallan en `generateStaticParams` antes del boundary (500 en dev) | Aceptado: en producción `generateStaticParams` solo corre en el build, que falla de forma visible. `error.tsx` no cubre estas rutas. |
| `public.ts` usado fuera de `'use cache'` o `server.ts` dentro (error `next-request-in-use-cache`)                           | Convención documentada en `CLAUDE.md`; build + `next start` en verificación.                                                         |
| Caché obsoleta tras insertar                                                                                                | `updateTag` de `scores` y `scores:<gameId>` en la action.                                                                            |
| Vista sin `security_invoker` expone datos saltando RLS                                                                      | `with (security_invoker = true)` + `get_advisors`.                                                                                   |
| Seed desincronizado de los textos actuales                                                                                  | Copiar literal de `lib/games.ts` antes de eliminar `GAMES`; criterio de textos iguales.                                              |

## Lo que **no** está en esta spec

- Autenticación y scores por usuario.
- Guardado real en juegos simulados.
- Anti-trampa server-side.
- Ranking por jugador, periodos, paginación.
- Ticker real en home.
- Admin/moderación.
- Realtime.
- Fallback local del catálogo.

Cada uno, si llega, va en su propia spec.
