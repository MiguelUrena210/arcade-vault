# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por puntos. Estado actual: scaffold de Create Next App (solo `app/layout.tsx`, `app/page.tsx`, `app/globals.css`). Se sigue Spec Driven Design (`/spec` y `/spec-impl`) con las skills de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Skills

Usa la skill `/frontend-design` para diseño de UI/UX.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y servidor de producción
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run db:types` — regenera `lib/supabase/database.types.ts` desde el proyecto remoto (requiere `npx supabase login`)
- No hay test runner configurado.

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
- Convenciones de esquema: ids `integer generated always as identity` (las URLs usan una columna `slug`); strings `varchar(n)`, nunca `text`; catálogos cerrados como `enum`.
- `docs/data-dictionary.md` documenta el esquema `public`; se actualiza con cada migración. Los hooks `.claude/hooks/db-docs.sh` (tras `apply_migration`/DDL) y `db-drift.sh` (al iniciar sesión) avisan cuando la documentación queda desfasada.
- Tags de caché de lecturas: `games` (catálogo), `scores` (stats globales) y `scores:<gameId>` (top por juego, `gameId` = `games.id`). Las Server Actions de escritura los invalidan con `updateTag`.
- `cookies()` es API dinámica: con `cacheComponents`, `server.ts` solo puede usarse dentro de `<Suspense>`.
- `setAll` del cliente server ignora errores de escritura de cookies en Server Components; el refresco de sesión llegará con `proxy.ts` (spec de auth, aún no existe).
- Sin service role key ni clientes admin.

## Next.js: versión con cambios incompatibles

Esta versión difiere de lo conocido. Antes de escribir código, leer la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) y respetar avisos de deprecación. `cacheComponents` cambia el modelo de caché/renderizado: consultar sus docs antes de usar fetch, `use cache` o APIs dinámicas.
