# SPEC 03 — Infraestructura de Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-22
> **Objetivo:** Conectar la app Next.js al proyecto remoto de Supabase (`bffywagyecastmrxbnem`) con clientes tipados de servidor y navegador, variables de entorno y tipos generados, sin cambios visibles.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`; `supabase` (CLI) como devDependency.
- `lib/supabase/client.ts`: `createClient()` para Client Components (`createBrowserClient`).
- `lib/supabase/server.ts`: `createClient()` async para Server Components, Server Actions y Route Handlers (`createServerClient` + `cookies()` de `next/headers`).
- `lib/supabase/database.types.ts` generado desde el proyecto remoto; ambos clientes tipados con `Database`.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`.
- `.env.example` commiteado con ambas claves vacías; excepción `!.env.example` en `.gitignore`.
- Script `npm run db:types`.
- Sección "Supabase" en `CLAUDE.md` (env, clientes, script de tipos).

**Fuera (specs futuras):**

- `proxy.ts` y refresco de sesión (`updateSession`).
- Autenticación real en `/login`, sesión en navbar, logout.
- Tablas (`profiles`, `scores`, `games`), RLS y migraciones.
- Guardar puntuaciones y salón con datos reales.
- Supabase CLI local / Docker.
- Página o ruta de health check.
- Service role key y clientes admin.

## Modelo de datos

Sin tablas nuevas: el esquema `public` queda vacío. Solo se introducen tipos:

```ts
// lib/supabase/database.types.ts — generado, no editar a mano
export type Database = {
  public: {
    Tables: {};
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  }; /* … */
};

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;
```

Convenciones:

- Variables leídas con `process.env.NEXT_PUBLIC_SUPABASE_URL!` y `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!`.
- `server.ts`: `setAll` en `try/catch` vacío (Server Components no pueden escribir cookies; lo resolverá el proxy de la spec de auth).
- Un cliente nuevo por request en servidor; nunca un singleton global.
- Nada se persiste en localStorage.

## Plan de implementación

1. `npm install @supabase/supabase-js @supabase/ssr` y `npm install -D supabase`. `npm run build` pasa.
2. Crear `.env.local` con URL y publishable key (obtenidas con MCP `get_project_url` / `get_publishable_keys`). Crear `.env.example` con las claves vacías y añadir `!.env.example` a `.gitignore`. `git status` muestra `.env.example` y no `.env.local`.
3. Añadir a `package.json` el script `"db:types": "supabase gen types typescript --project-id bffywagyecastmrxbnem > lib/supabase/database.types.ts"`. Ejecutarlo (requiere `npx supabase login`).
4. Crear `lib/supabase/client.ts` con `createBrowserClient<Database>`.
5. Crear `lib/supabase/server.ts` con `createServerClient<Database>` y `await cookies()`.
6. Actualizar `CLAUDE.md`: stack (Supabase), env vars, ubicación de clientes, `npm run db:types`. `npm run lint` y `npm run build` pasan.

Antes de los pasos 4 y 5, leer en `node_modules/next/dist/docs/` lo relativo a `cookies()` y `cacheComponents` (APIs dinámicas), y la guía oficial de `@supabase/ssr` para Next.js.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`.
- [ ] `npm run db:types` regenera `lib/supabase/database.types.ts` sin errores y exporta `Database`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` exportan `createClient` tipado con `Database`.
- [ ] `.env.example` está versionado con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacías; `.env.local` no aparece en `git status`.
- [ ] Ningún archivo versionado contiene la URL o la key reales.
- [ ] No existe `proxy.ts` ni `middleware.ts`.
- [ ] No se crean tablas: MCP `list_tables` sobre `public` devuelve vacío.
- [ ] Las rutas `/`, `/games`, `/games/caida`, `/games/caida/play`, `/hall-of-fame` y `/login` se ven y comportan igual que en SPEC 02.
- [ ] `CLAUDE.md` documenta env vars, clientes y `npm run db:types`.

## Decisiones

- **Sí:** spec solo de infraestructura. Auth y scores son dominios distintos; cada uno con su spec.
- **No:** auth + scores en esta spec. Demasiado grande.
- **Sí:** `@supabase/ssr` (cookies). Patrón oficial para App Router.
- **No:** solo `supabase-js` en cliente. No sirve para Server Components.
- **Sí:** clientes en `lib/supabase/`. Encaja con `lib/` existente.
- **No:** `utils/supabase/`. Carpeta nueva innecesaria.
- **Sí:** proyecto remoto `bffywagyecastmrxbnem` (el de `.mcp.json`).
- **No:** Supabase CLI local con Docker. Complejidad sin necesidad aún.
- **Sí:** publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Reemplazo actual de la anon key.
- **No:** service role key. Sin necesidad de bypass de RLS.
- **Sí:** `.env.local` + `.env.example` versionado. Documenta variables sin filtrar valores.
- **No:** añadir variables al `.env` existente.
- **Sí:** tipos con script npm y Supabase CLI. Reproducible.
- **No:** tipos pegados desde MCP `generate_typescript_types`.
- **Sí:** `proxy.ts` diferido a la spec de auth. Sin sesión no hay nada que refrescar.
- **Sí:** verificación sin UI (build + tipos). No se añade código desechable.
- **No:** página `/health` ni leer `GAMES` desde Supabase.
- **Sí:** esquema vacío. Tablas llegan con su spec.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `cookies()` es API dinámica y `cacheComponents` exige `<Suspense>` donde se use | Esta spec no llama al cliente server en ninguna página; documentarlo en `CLAUDE.md` para specs siguientes. |
| `supabase gen types` falla sin login de CLI                                     | Ejecutar `npx supabase login` antes (usuario con `! npx supabase login`).                                  |
| `.gitignore` con `.env*` ignora `.env.example`                                  | Añadir `!.env.example` y verificar con `git status`.                                                       |
| Tipos con esquema vacío generan `{}` que ESLint marca (`no-empty-object-type`)  | Excluir `lib/supabase/database.types.ts` en `eslint.config.mjs` y `.prettierignore`.                       |
| Key filtrada en commit                                                          | Criterio de aceptación: grep de URL/key en archivos versionados vacío.                                     |

## Lo que **no** está en esta spec

- Proxy y refresco de sesión.
- Autenticación real.
- Tablas, RLS y migraciones.
- Persistencia de puntuaciones.
- Supabase local.
- Health check.

Cada uno, si llega, va en su propia spec.
