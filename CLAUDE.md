# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por puntos. Se sigue Spec Driven Design: specs en `specs/` (01–08; 02 en `Aprobado`, resto `Implementado`).

Estado: home, biblioteca, detalle, reproductor y salón de la fama con datos de Supabase; juegos jugables con leaderboard: Asteroids, Tetris, Arkanoid y Snake (el resto del catálogo es simulado). Auth pendiente: `/login` solo tiene UI (`components/auth-form.tsx`), sin lógica ni `proxy.ts`.

## Skills

- `/spec` — escribe `specs/NN-slug.md` en `Borrador`; el usuario la pasa a `Aprobado`; `/spec-impl NN-slug` la implementa (crea rama `spec-NN-slug` sin preguntar, `AutoCreateBranch: true` en `specs/.spec-config.yml`) y la marca `Implementado`.
- `/add-game <carpeta de references/started-games | descripción>` — skill propia (`.claude/skills/add-game/`): `/spec` especializada para portar un juego canvas con leaderboard. Solo escribe la spec. Referencias: `contract.md` (motor y registro) y `checklist.md` (migración, portada, leaderboard).
- Agente `game-planner` (`.claude/agents/game-planner.md`): usar cuando se pregunte qué juego añadir. Analiza `games/registry.ts`, `specs/`, `references/started-games/` y el catálogo Supabase (solo SQL de lectura); filtra por diversidad de categoría, clásico y porteo fácil a Canvas 2D; rankea por puntuación competitiva, reutilización, complejidad S/M/L y riesgo. Devuelve top 3 + recomendación y el siguiente paso `/add-game`. No escribe specs ni código.
  - Solo escribe en `references/suggestions.md` (tabla `Fecha | Juego | Slug | Rank | Motivo | Estado`; estados `sugerido`/`aceptado`/`descartado`/`implementado`, reconciliados con registro y specs) y en `.claude/agent-memory/game-planner/MEMORY.md` (preferencias del usuario; `memory: project`). No re-sugiere juegos ya registrados.
  - Flujo: `game-planner` → `/add-game` → usuario aprueba → `/spec-impl`.
- Agente `game-jam` (`.claude/agents/game-jam.md`): `claude --agent game-jam` (agente principal; como subagente no puede lanzar workers). Dado un tema, pregunta opciones comunes y lanza 3 `game-jam-designer` (`.claude/agents/game-jam-designer.md`) en paralelo → `specs/game-jam/<slug>/spec.md` (`Propuesta`). El usuario elige una y se promueve a `specs/NN-slug.md` (`Borrador`); las propuestas quedan `Elegida`/`Descartada` y se registran en `specs/game-jam/README.md`.
  - Flujo: `game-jam` → usuario aprueba → `/spec-impl`.
- Agente `skin-designer` (`.claude/agents/skin-designer.md`): audita las skins de cada juego en `ENGINES` y exige ≥3 por juego, con ≥1 de fondo claro y ≥1 oscuro, contraste WCAG ≥3:1 (texto 4.5:1), ids y default existentes intactos. Si alguno falla, diseña las skins (paletas + contrastes) y escribe `specs/NN-skins.md` en `Borrador`. Solo escribe en `specs/`.
  - Flujo: `skin-designer` → usuario aprueba → `/spec-impl`.
- `/frontend-design` — diseño de UI/UX.
- `supabase` y `supabase-postgres-best-practices` — cargar antes de cualquier tarea Supabase, SQL o migración.
- Skills externas instaladas en `.agents/skills/` (`skills-lock.json`: `anthropics/skills`, `Klerith/fernando-skills`, `supabase/agent-skills`) y enlazadas por symlink en `.claude/skills/`. Instalar con `npx skills@latest add <repo>`.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y servidor de producción
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run db:types` — regenera `lib/supabase/database.types.ts` desde el proyecto remoto (requiere `npx supabase login`)
- No hay test runner configurado.

## Hooks y formato

- `.claude/hooks/format-lint.sh` (PostToolUse `Write|Edit`): Prettier (`.prettierrc.json`) + `eslint --fix` sobre `.ts/.tsx/.js/.jsx/.mjs`, solo Prettier en `.md`. Un error de ESLint bloquea. Excluye `references/`, `.claude/`, `node_modules/`, `.next/`.
- `db-docs.sh` y `db-drift.sh`: ver sección Supabase.
- `AGENTS.md` lo genera y restaura `next dev`: no editar, commitearlo si cambia.

## Estructura

- Rutas (`app/`): `/` (home), `/games` (biblioteca), `/games/[id]` (detalle + top), `/games/[id]/play` (reproductor; `actions.ts` con Server Action `saveScore`), `/hall-of-fame`, `/login`. `error.tsx` cubre fallos de lectura de Supabase; `not-found.tsx`. `[id]` es el `slug` del juego.
- `components/`: `nav`, `library`, `game-card`, `game-player`, `game-canvas`, `hall-of-fame`, `auth-form`, `home/*`.
- `lib/`: `games.ts` (`getGames`/`getGame`, `'use cache'`), `scores.ts` (`getTopScores`), `game-types.ts` (tipo `Game` y enums derivados de `Database`), `home.ts` (contenido estático de la home).
- `references/`: originales de solo lectura — juegos JS (`started-games/`), templates de diseño (`templates/`) y assets (`source-assets/`). Excepción: `suggestions.md`, escrito por `game-planner`.

## Motores de juego

- Un directorio por juego en `games/<slug>/` (`engine.ts`, `entities.ts`, `theme.ts`, `config.ts`, …). Contrato en `games/types.ts`: `EngineDef.create(canvas, { onStats, onGameOver }, theme)` → `EngineHandle` (`pause`, `resume`, `restart`, `destroy`, `setTheme?`).
- `games/registry.ts`: `ENGINES[games.slug]` → `create`, `width`/`height` (800×600), `themes` (el primero es el default). Un juego sin entrada en el registro se simula en `GamePlayer`.
- `GamePlayer` (`components/game-player.tsx`) gestiona HUD React, pausa (`P`/`Escape`), tema, modal de fin de juego y `saveScore`; `GameCanvas` monta/destruye el motor. El motor no dibuja HUD, menús ni GAME OVER, ni usa sonido o localStorage.
- Reglas completas del motor: `.claude/skills/add-game/contract.md`.

## Stack y configuración

- Next.js 16.4.2 (App Router, `app/`), React 19.3, TypeScript strict, Tailwind v4 (`@import "tailwindcss"` en `globals.css`).
- Alias de imports: `@/*` → raíz del repo.
- `next.config.ts` activa `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`; Tailwind se procesa con `@tailwindcss/turbopack` vía `turbopack.rules` para `*.css`.
- `RootLayout` usa el tipo global `LayoutProps<"/">` (typed routes de Next, sin import).
- Backend: Supabase (`@supabase/supabase-js`, `@supabase/ssr`; CLI `supabase` como devDependency).

## Supabase

- Proyecto remoto `bffywagyecastmrxbnem` (el de `.mcp.json`). Sin Supabase local ni Docker.
- Env en `.env.local` (no versionado): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `.env.example` versionado con las claves vacías.
- Clientes tipados con `Database`, en `lib/supabase/`:
  - `client.ts` — `createClient()` para Client Components (`createBrowserClient`).
  - `server.ts` — `await createClient()` para Server Components, Server Actions y Route Handlers (`createServerClient` + `cookies()`). Un cliente nuevo por request; nunca un singleton global.
  - `public.ts` — `createPublicClient()` (`supabase-js` sin cookies ni sesión) solo para lecturas públicas dentro de funciones `'use cache'`; nunca para escrituras. Dentro de `'use cache'` no se puede usar `server.ts` (lee `cookies()`).
- `lib/supabase/database.types.ts` es generado: no editar a mano, regenerar con `npm run db:types`.
- Migraciones SQL versionadas en `supabase/migrations/` (`AAAAMMDDHHMMSS_nombre.sql`) y aplicadas al remoto con MCP `apply_migration`; después `npm run db:types`.
- Esquema `public`: `games` (`slug`, `title`, `short`, `long`, `cat` enum `game_category`, `color` enum `game_color`, `cover`, `saves_scores`, `sort_order`), `scores` (`game_id`, `initials`, `score`, `created_at`) y vista `game_stats` (`security_invoker`; `best`, `plays` por juego). RLS: lectura pública (`anon`, `authenticated`); insert en `scores` solo si el juego tiene `saves_scores`. Un juego real nuevo = migración que pone `saves_scores = true` + entrada en `ENGINES`.
- `saveScore` valida iniciales `^[A-Z0-9_]{3,10}$` y score entero 0–1 000 000.
- Convenciones de esquema: ids `integer generated always as identity` (las URLs usan una columna `slug`); strings `varchar(n)`, nunca `text`; catálogos cerrados como `enum`.
- `docs/data-dictionary.md` documenta el esquema `public`; se actualiza con cada migración. Los hooks `.claude/hooks/db-docs.sh` (tras `apply_migration`/DDL) y `db-drift.sh` (al iniciar sesión) avisan cuando la documentación queda desfasada.
- Tags de caché de lecturas: `games` (catálogo), `scores` (stats globales) y `scores:<gameId>` (top por juego, `gameId` = `games.id`). Las Server Actions de escritura los invalidan con `updateTag`.
- `cookies()` es API dinámica: con `cacheComponents`, `server.ts` solo puede usarse dentro de `<Suspense>`.
- `setAll` del cliente server ignora errores de escritura de cookies en Server Components; el refresco de sesión llegará con `proxy.ts` (spec de auth, aún no existe).
- Sin service role key ni clientes admin.

## Next.js: versión con cambios incompatibles

Esta versión difiere de lo conocido. Antes de escribir código, leer la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) y respetar avisos de deprecación. `cacheComponents` cambia el modelo de caché/renderizado: consultar sus docs antes de usar fetch, `use cache` o APIs dinámicas.
