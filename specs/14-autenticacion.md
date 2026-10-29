# SPEC 14 — Registro, login y autenticación con Supabase Auth

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 03, SPEC 05
> **Fecha:** 2026-10-28
> **Objetivo:** Dar lógica real a la pantalla de `/login` con Supabase Auth: registro con confirmación por correo, inicio de sesión con email+contraseña o Google/GitHub, recuperación de contraseña, sesión visible en el nav con cierre de sesión y refresco de tokens vía `proxy.ts`, manteniendo todo el sitio accesible sin cuenta. Las puntuaciones guardadas con sesión almacenan además el `user_id` y el display name actual del usuario.

## Por qué esta spec

`/login` solo tiene UI (`components/auth-form.tsx` navega a `/games` sin autenticar) y `lib/supabase/server.ts` ya anticipa el refresco de sesión en un `proxy.ts` que no existe. Esta spec cierra ese hueco con el patrón oficial de `@supabase/ssr` para Next.js (proxy + `getClaims`, rutas `/auth/confirm` y `/auth/callback`), compatible con `cacheComponents` (toda lectura de sesión en servidor va detrás de `<Suspense>`; la del nav se hace en cliente).

## Alcance

**Dentro:**

- `proxy.ts` (raíz) + `lib/supabase/proxy.ts` (`updateSession` con `getClaims`): refresco de tokens en cada request.
- Registro email+contraseña con nombre de usuario (display name en `user_metadata`) y confirmación de email **activada** (pantalla «revisa tu correo»).
- Login email+contraseña con errores visibles en el formulario.
- OAuth Google y GitHub (botones ya presentes en la UI) vía `signInWithOAuth` + `app/auth/callback/route.ts`.
- Ruta `app/auth/confirm/route.ts` (`verifyOtp` con `token_hash`) para confirmación de registro y recuperación.
- Recuperación de contraseña: vista «olvidé mi contraseña» en el formulario + página `/reset-password` para definir la nueva.
- Nav (escritorio y panel móvil): con sesión muestra el display name y botón SALIR (`signOut`); sin sesión, el enlace «Iniciar Sesión» actual. `/login` con sesión redirige a `/games`.
- Migración en `scores`: columnas nuevas `user_id` (FK a `auth.users`) y `display_name` (snapshot del nombre), con RLS que impide fijar un `user_id` ajeno.
- `saveScore`: con sesión guarda `user_id` y display name actual leídos **en servidor**, y deriva las iniciales del display name saneado ignorando lo que llegue del cliente; sin sesión, comportamiento actual (ambas columnas `null`).
- `GamePlayer`: con sesión, el campo de iniciales del modal de fin de partida se muestra **bloqueado** con el display name saneado; sin sesión sigue editable con `INVITADO`.
- Nada se vuelve obligatorio: «JUGAR COMO INVITADO» y todas las rutas públicas se mantienen.

**Fuera (specs futuras):**

- Tabla `profiles` (unicidad de username, login por username).
- Leaderboards por usuario y mostrar el nombre «vivo» en el salón de la fama (los scores guardan un snapshot; la lectura sigue usando `initials`).
- Magic link y otros proveedores OAuth.
- Rutas protegidas o redirecciones obligatorias a `/login`.
- Página de cuenta/perfil (cambiar nombre, email o contraseña desde dentro).
- Borrado de cuenta.

## Prerrequisitos manuales (dashboard de Supabase, proyecto `bffywagyecastmrxbnem`)

El agente no puede hacerlos; deben estar listos antes de probar cada flujo:

1. **Auth → Providers:** activar **Google** (credenciales en Google Cloud Console) y **GitHub** (OAuth App). Callback en ambos proveedores: `https://bffywagyecastmrxbnem.supabase.co/auth/v1/callback`. Email+contraseña no depende de este paso.
2. **Auth → URL Configuration:** Site URL `http://localhost:3000`; añadir la URL de producción a Redirect URLs cuando exista.
3. **Auth → Email Templates:**
   - _Confirm signup_: sustituir `{{ .ConfirmationURL }}` por `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
   - _Reset password_: sustituir `{{ .ConfirmationURL }}` por `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
   - (Opcional) traducir el texto de las plantillas al español.
4. **Confirm email:** dejar activado (valor por defecto).

## Modelo de datos

Sin tablas nuevas. La sesión vive en cookies gestionadas por `@supabase/ssr` y el usuario en `auth.users` (gestionada por Supabase).

- Display name: `user_metadata.display_name`, enviado en `signUp({ options: { data: { display_name } } })`. **Solo para mostrar**: `user_metadata` es editable por el propio usuario y nunca se usa para autorización ni en RLS.
- Resolución del nombre (helper único `lib/user-name.ts`, usado por nav, `GamePlayer` y `saveScore`): `display_name ?? full_name ?? name ?? user_name ?? parte local del email` (trim en cada paso). Los proveedores OAuth no rellenan `display_name`; el email como último recurso garantiza que con sesión siempre hay nombre (lo exige el check de `scores`).

### Migración `scores` (`supabase/migrations/<timestamp>_scores_user.sql`)

Única migración de la spec, aplicada con MCP `apply_migration` y seguida de `npm run db:types` y actualización de `docs/data-dictionary.md`:

```sql
alter table public.scores
  add column user_id uuid references auth.users (id) on delete set null,
  add column display_name varchar(40),
  add constraint scores_user_has_name check (user_id is null or display_name is not null);

drop policy "scores_insert" on public.scores;
create policy "scores_insert" on public.scores
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id and g.saves_scores)
    and (user_id is null or user_id = (select auth.uid()))
  );
```

- Columnas nullable, sin backfill: los scores existentes y los de invitados quedan con ambas a `null`.
- `on delete set null` solo anula `user_id`; `display_name` sobrevive como snapshot si la cuenta se borra (de ahí que el check sea unidireccional).
- RLS: `anon` nunca puede fijar `user_id` (su `auth.uid()` es `null`); `authenticated` solo el suyo. `display_name` no participa en autorización.
- Vista `game_stats` y lecturas (`getTopScores`) sin cambios: el leaderboard sigue mostrando `initials`.
- Estado de los formularios (Server Actions + `useActionState`):

```ts
// app/login/actions.ts
export type AuthState = {
  error?: string; // mensaje de error a pintar en el form
  message?: string; // p. ej. «Revisa tu correo para confirmar la cuenta»
};
```

- Saneado de iniciales (misma función en `saveScore` y `GamePlayer`): display name → mayúsculas, espacios a `_`, se eliminan caracteres fuera de `[A-Z0-9_]`, recorte a 10. Si el resultado no cumple `^[A-Z0-9_]{3,10}$`, se usa `INVITADO`. Con sesión, `saveScore` la aplica **en servidor** sobre el display name de la sesión (que también guarda tal cual en `display_name`, recortado a 40) e ignora las iniciales que lleguen del cliente.

## Archivos

**Nuevos:**

- `proxy.ts` — convención de Next 16: exporta `proxy(request)` que llama a `updateSession`, con `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes.
- `lib/supabase/proxy.ts` — `updateSession(request)`: `createServerClient` sobre cookies de request/response + `supabase.auth.getClaims()` para refrescar el token.
- `app/login/actions.ts` — Server Actions: `signUp`, `signIn`, `signInWithProvider("google" | "github")` (obtiene `origin` de `headers()` y redirige a `data.url`), `signOut`, `requestPasswordReset`, `updatePassword`.
- `app/auth/confirm/route.ts` — GET: `verifyOtp({ type, token_hash })`; redirige a `next` (solo rutas internas; por defecto `/games`); con error, a `/login?error=confirm`.
- `app/auth/callback/route.ts` — GET: `exchangeCodeForSession(code)`; redirige a `/games`; con error, a `/login?error=oauth`.
- `app/reset-password/page.tsx` + `components/reset-password-form.tsx` — formulario de nueva contraseña (`updatePassword`), reutilizando las clases `auth-card`/`field`/`btn` existentes.
- `supabase/migrations/<timestamp>_scores_user.sql` — columnas `user_id` y `display_name` en `scores` + política `scores_insert` nueva (ver Modelo de datos).
- `lib/user-name.ts` — resolución del display name con fallback para OAuth (ver Modelo de datos).

**Modificados:**

- `components/auth-form.tsx` — conecta tabs a `signIn`/`signUp` con `useActionState` (error, mensaje, pending); el campo Usuario pasa a la pestaña CREAR CUENTA (login es email+contraseña); enlace «¿Olvidaste tu contraseña?» que muestra la vista de recuperación; botones GOOGLE/GITHUB como forms de `signInWithProvider`; muestra los errores de `/login?error=…`.
- `app/login/page.tsx` — lee sesión en servidor detrás de `<Suspense>`; con sesión, `redirect("/games")`; sin ella, renderiza `AuthForm`.
- `components/nav.tsx` — lee sesión en cliente (`createClient()` de `lib/supabase/client.ts`: `getSession()` inicial + `onAuthStateChange`); pinta display name + SALIR (form con `signOut`) o «Iniciar Sesión», en nav y panel móvil.
- `components/game-player.tsx` — al montar, lee la sesión en cliente; con sesión fija `name` al display name saneado y muestra el campo bloqueado (readonly).
- `app/games/[id]/play/actions.ts` — `saveScore` lee la sesión (`getClaims`); con sesión inserta `user_id` (claim `sub`) y `display_name`, y deriva `initials` en servidor.
- `lib/supabase/database.types.ts` — regenerado con `npm run db:types` tras la migración.
- `docs/data-dictionary.md` — columnas nuevas de `scores` y política `scores_insert` actualizada.

**Sin cambios:** `lib/supabase/{client,server,public}.ts`, `lib/scores.ts` (`getTopScores`), vista `game_stats`, `app/globals.css` (salvo ajuste mínimo si la vista de recuperación lo exige).

## Plan de implementación

1. `lib/supabase/proxy.ts` con `updateSession` y `proxy.ts` raíz con su `matcher`. Verificación: el sitio entero sigue navegando igual.
2. `app/login/actions.ts` (`signIn`, `signUp`, `signOut`, `AuthState`) y cableado de `auth-form.tsx` (tabs reales, errores, «revisa tu correo» tras registrarse). Verificación: login con usuario inexistente muestra error; registro envía el correo.
3. `app/auth/confirm/route.ts`. Verificación: el enlace del correo de confirmación inicia sesión y acaba en `/games`.
4. OAuth: `signInWithProvider` + `app/auth/callback/route.ts` + botones GOOGLE/GITHUB reales. Verificación: ciclo completo con un proveedor configurado.
5. Recuperación: vista «olvidé mi contraseña» + `requestPasswordReset` + `/reset-password` con `updatePassword`. Verificación: ciclo completo de reset.
6. Sesión en UI: `nav.tsx` (nombre + SALIR / «Iniciar Sesión») y redirección de `/login` con sesión.
7. `game-player.tsx`: con sesión, campo de iniciales bloqueado con el display name saneado.
8. Migración `scores_user` con MCP `apply_migration` + `npm run db:types` + `docs/data-dictionary.md`; `saveScore` con identidad de servidor. Verificación: un score con sesión guarda `user_id` y `display_name`; como invitado, ambas `null`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Crear cuenta con usuario, email y contraseña muestra «revisa tu correo» y no deja sesión iniciada.
- [ ] El enlace del correo de confirmación pasa por `/auth/confirm`, deja sesión iniciada y redirige a `/games`.
- [ ] Iniciar sesión con credenciales válidas redirige a `/games`; con inválidas muestra el error en el formulario sin salir de `/login`.
- [ ] Los botones GOOGLE y GITHUB completan login vía `/auth/callback` (con los proveedores configurados en el dashboard).
- [ ] «¿Olvidaste tu contraseña?» envía el correo; su enlace acaba en `/reset-password`; definir la nueva contraseña deja sesión iniciada y el siguiente login funciona con ella.
- [ ] Con sesión, el nav (escritorio y móvil) muestra el display name y SALIR; SALIR cierra sesión y vuelve «Iniciar Sesión».
- [ ] Con sesión, visitar `/login` redirige a `/games`.
- [ ] `/auth/confirm` y `/auth/callback` con token/código inválido o ausente redirigen a `/login` con mensaje de error visible (nunca error 500).
- [ ] En fin de partida con sesión, el campo de iniciales aparece bloqueado con el display name saneado (`^[A-Z0-9_]{3,10}$`); sin sesión, editable con `INVITADO`.
- [ ] Un score guardado con sesión tiene `user_id` del usuario y su display name actual en `display_name`; como invitado, ambas columnas `null` y el flujo actual intacto.
- [ ] Un insert en `scores` con un `user_id` ajeno es rechazado por RLS.
- [ ] Sin service role key; la única migración es la de `scores` (`user_id` + `display_name`) y `database.types.ts` solo cambia por `npm run db:types`.

## Decisiones

- **Sí:** `proxy.ts` + `getClaims` para refrescar sesión. Patrón oficial actual de `@supabase/ssr` en Next.js; `lib/supabase/server.ts` ya lo anticipa en su comentario de `setAll`.
- **Sí:** Server Actions para todo el flujo (consistente con `saveScore`); `useActionState` para errores y pending.
- **Sí:** confirmación de email activada, con plantillas `token_hash` → `/auth/confirm` (flujo SSR). Elección del usuario frente a la sesión inmediata.
- **Sí:** display name en `user_metadata`. Sin tabla ni migración; nunca se usa para autorización (es editable por el usuario).
- **Sí:** sesión del nav leída en **cliente** con `onAuthStateChange`. No toca el static shell del layout con `cacheComponents` y se actualiza sola tras login/logout. **No:** slot server con `<Suspense>` dentro de `RootLayout` — más invasivo y bloquea parte del shell.
- **Sí:** recuperación de contraseña dentro de esta spec (decisión del usuario), reutilizando `/auth/confirm` con `type=recovery`.
- **Sí:** fallback de nombre para OAuth (decisión del usuario durante la implementación): `display_name ?? full_name ?? name ?? user_name ?? email local`, en `lib/user-name.ts`, sin escrituras en `user_metadata`. **No:** normalizar `display_name` con `updateUser` en el callback.
- **Sí:** `user_id` + `display_name` en `scores` (decisión del usuario). Nombre **fijo** con sesión (campo bloqueado), `display_name` como snapshot tal cual y `initials` derivadas del saneado **en servidor** — el cliente no decide la identidad. El leaderboard sigue leyendo `initials`; mostrar el nombre completo queda para una spec futura.
- **No:** tabla `profiles` con username único y login por username. Spec futura.
- **No:** magic link ni rutas protegidas. El arcade sigue siendo público; la sesión solo aporta identidad.
- **No:** login por usuario+contraseña (la UI actual lo sugería). Supabase autentica por email; el campo Usuario pasa a ser el display name del registro.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Proveedores OAuth sin configurar al implementar                            | Email+contraseña no depende de ellos; el error de Supabase se muestra en `/login`. Prerrequisito 1 documentado. |
| Plantillas de email sin actualizar → el enlace no pasa por `/auth/confirm` | Prerrequisito 3 bloqueante; los criterios de registro y reset lo detectan de inmediato.                         |
| `cookies()` fuera de `<Suspense>` con `cacheComponents` rompe el build     | Toda lectura de sesión en servidor va detrás de `<Suspense>` (`/login`); nav y `GamePlayer` leen en cliente.    |
| `matcher` del proxy demasiado amplio penaliza assets                       | Matcher estándar de Supabase que excluye `_next/static`, `_next/image`, favicon e imágenes.                     |
| Parpadeo de «Iniciar Sesión» en el nav mientras resuelve la sesión         | Aceptado: milisegundos y solo tras login; alternativa server descartada en Decisiones.                          |
| Correos de Supabase en inglés por defecto                                  | Prerrequisito 3 opcional: traducir plantillas en el dashboard.                                                  |
| Migración sobre `scores` con datos reales                                  | Columnas nullable y sin backfill: las filas existentes quedan intactas con `user_id`/`display_name` a `null`.   |

## Lo que **no** está en esta spec

- Tabla `profiles` ni unicidad de username.
- Leaderboards por usuario y mostrar `display_name` en el salón de la fama.
- Magic link, más proveedores OAuth, página de perfil o borrado de cuenta.
- Proteger rutas tras login.

Cada uno, si llega, va en su propia spec.
