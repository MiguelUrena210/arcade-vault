# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por puntos. Estado actual: scaffold de Create Next App (solo `app/layout.tsx`, `app/page.tsx`, `app/globals.css`). Se sigue Spec Driven Design (`/spec` y `/spec-impl`) con las skills de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y servidor de producción
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No hay test runner configurado.

## Stack y configuración

- Next.js 16.4.2 (App Router, `app/`), React 19.3, TypeScript strict, Tailwind v4 (`@import "tailwindcss"` en `globals.css`).
- Alias de imports: `@/*` → raíz del repo.
- `next.config.ts` activa `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`; Tailwind se procesa con `@tailwindcss/turbopack` vía `turbopack.rules` para `*.css`.
- `RootLayout` usa el tipo global `LayoutProps<"/">` (typed routes de Next, sin import).

## Next.js: versión con cambios incompatibles

Esta versión difiere de lo conocido. Antes de escribir código, leer la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) y respetar avisos de deprecación. `cacheComponents` cambia el modelo de caché/renderizado: consultar sus docs antes de usar fetch, `use cache` o APIs dinámicas.
