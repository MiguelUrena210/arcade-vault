# SPEC 15 — Endurecimiento de seguridad básico

> **Estado:** Aprobado
> **Depende de:** SPEC 03, SPEC 14
> **Fecha:** 2026-10-29
> **Objetivo:** Aplicar el checklist de `references/security/security-checklist.md`: headers de seguridad en Next.js, contraseña mínima de 8 caracteres, rate limit de registros por IP y limpieza de los warnings del panel de advisors de Supabase, verificando el RLS ya existente.

## Por qué esta spec

El checklist de seguridad detecta huecos tras implementar la autenticación (SPEC 14). El estado real, verificado contra el proyecto remoto `bffywagyecastmrxbnem` el 2026-10-29:

- **RLS**: ya habilitado en `games` y `scores` (`supabase/migrations/20261022000000_games_scores.sql`). Solo hay que verificarlo, no cambiarlo.
- **Advisors de seguridad**: 3 warnings — `public.rls_auto_enable()` es `SECURITY DEFINER` y ejecutable por `anon` y `authenticated` vía `/rest/v1/rpc/` (2 warnings), y _Leaked password protection_ está deshabilitado (1 warning).
- **Contraseña mínima**: Supabase Auth acepta 6 caracteres; el código (`auth-form.tsx`, `app/login/actions.ts`) también valida 6.
- **Headers**: `next.config.ts` no define ninguno.
- La configuración de Auth (longitud mínima, leaked protection, rate limits) no tiene tool MCP: se aplica con la **Management API** (`https://api.supabase.com/v1/projects/bffywagyecastmrxbnem/config/auth`) usando el access token del CLI (`npx supabase login`).

## Alcance

**Dentro:**

- Headers de seguridad en `next.config.ts` (`headers()` async, source `/(.*)`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Migración `supabase/migrations/<timestamp>_revoke_rls_auto_enable.sql` que revoca `EXECUTE` sobre `public.rls_auto_enable()` a `public`, `anon` y `authenticated` (se mantiene `service_role`). Cierra los 2 warnings de SECURITY DEFINER.
- Configuración de Supabase Auth vía Management API: `password_min_length: 8` y rate limit de sign-in/sign-up a **10 por 5 minutos por IP** (default: 30).
- Mínimo de 8 caracteres reflejado en el código: `minLength={8}` en los inputs de contraseña de alta/cambio de `components/auth-form.tsx`, validación `< 8` en `updatePassword` y mensaje de `weak_password` «mínimo 8 caracteres» en `app/login/actions.ts`.
- Verificación de RLS en `games` y `scores` y re-chequeo de advisors como criterios de aceptación.

**Fuera (specs futuras):**

- `Content-Security-Policy`: requiere nonces por request en Next.js y pruebas a fondo; spec propia.
- _Leaked password protection_ (HaveIBeenPwned): requiere plan Pro y el proyecto está en Free. Queda documentado como **pendiente de upgrade**; su warning seguirá apareciendo en advisors.
- Captcha en signup (Turnstile/hCaptcha).
- Rate limiting propio en Next.js (middleware/proxy).
- MFA.

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas. El único cambio en base de datos son permisos de función:

```sql
-- supabase/migrations/<timestamp>_revoke_rls_auto_enable.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

`rls_auto_enable()` es un event trigger de la plataforma (owner `postgres`, no nació de una migración del repo); revocar `EXECUTE` no afecta a su funcionamiento como trigger, solo impide invocarla por RPC.

## Plan de implementación

1. **Migración de revoke.** Crear `supabase/migrations/<timestamp>_revoke_rls_auto_enable.sql` con el `REVOKE` anterior y aplicarla con MCP `apply_migration`. Actualizar `docs/data-dictionary.md` si el hook `db-docs.sh` lo pide. Verificar: `get_advisors` (security) ya no muestra los 2 warnings de `rls_auto_enable`.
2. **Headers en `next.config.ts`.** Añadir `headers()` con los 5 headers para `/(.*)`. Consultar antes la doc de Next 16 en `node_modules/next/dist/docs/` (per CLAUDE.md). Verificar: con `npm run dev`, `curl -I http://localhost:3000` muestra los 5 headers.
3. **Config de Auth vía Management API.** Con el token del CLI: `GET /v1/projects/bffywagyecastmrxbnem/config/auth` para confirmar los nombres reales de los campos; después `PATCH` con `password_min_length: 8` y el rate limit de sign-in/sign-up a 10 por 5 min (campo esperado: `rate_limit_sign_in_sign_ups`; usar el nombre que devuelva el GET). Verificar: un nuevo GET refleja ambos valores.
4. **Mínimo 8 en el código.** `components/auth-form.tsx`: `minLength={6}` → `minLength={8}` en los inputs de contraseña de registro y de restablecimiento. `app/login/actions.ts`: `updatePassword` valida `password.length < 8` y el mensaje de `weak_password` pasa a «Contraseña demasiado débil (mínimo 8 caracteres)». Verificar: `npm run lint` pasa; registrarse con 7 caracteres muestra el error y con 8 funciona.

## Criterios de aceptación

- [ ] `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'` devuelve `true` para `games` y `scores`.
- [ ] `get_advisors` (security) no muestra ningún warning de `rls_auto_enable`; el único restante es _Leaked password protection_ (bloqueado por plan Free).
- [ ] `curl -I http://localhost:3000` (y cualquier otra ruta) devuelve los 5 headers con los valores exactos del alcance.
- [ ] `GET /v1/projects/bffywagyecastmrxbnem/config/auth` devuelve `password_min_length: 8` y el rate limit de sign-in/sign-up en 10.
- [ ] Registrarse con una contraseña de 7 caracteres falla con «mínimo 8 caracteres»; con 8 el registro continúa.
- [ ] El input de contraseña de registro y el de `/reset-password` tienen `minLength={8}`.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones

- **Sí:** Management API con curl para la config de Auth. Es ejecutable y verificable desde el agente; el dashboard no deja rastro reproducible.
- **Sí:** revoke de `rls_auto_enable()` en migración versionada, aunque la función no naciera de una migración. Trazabilidad del cambio de permisos.
- **Sí:** rate limit de signups a 10/5 min por IP. Anti-bot efectivo sin castigar a usuarios legítimos.
- **Sí:** `X-Frame-Options: DENY`. El sitio no se embebe en iframes de terceros.
- **Sí:** HSTS sin `preload`. Entrar en la preload list es irreversible en la práctica; `max-age` largo + `includeSubDomains` basta.
- **No:** CSP en esta spec. Sin nonces rompería los scripts inline de Next; merece spec propia.
- **No:** habilitar _Leaked password protection_. Requiere plan Pro (el proyecto está en Free); pendiente de upgrade.
- **No:** validación de longitud duplicada en `signIn`. El login no crea contraseñas; la regla de 8 aplica a alta y cambio.

## Riesgos

| Riesgo                                                         | Mitigación                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| El campo del rate limit en la Management API tiene otro nombre | Hacer `GET` de la config antes del `PATCH` y usar el nombre real que devuelva.                  |
| HSTS no tiene efecto en `http://localhost`                     | Es esperado: solo aplica bajo HTTPS en producción. El criterio solo exige que el header exista. |
| Token del CLI ausente o caducado                               | Ejecutar `npx supabase login` antes del paso 3.                                                 |
| Usuarios existentes con contraseñas de 6–7 caracteres          | Supabase no fuerza re-cambio; el mínimo aplica a alta y cambio. Aceptado.                       |

## Qué **no** entra en esta spec

- `Content-Security-Policy` (spec propia cuando se aborde).
- _Leaked password protection_ (bloqueado por plan Free; pendiente de upgrade).
- Captcha, rate limiting propio en Next.js y MFA.

Cada uno de estos, si llega, va en su propia spec.
