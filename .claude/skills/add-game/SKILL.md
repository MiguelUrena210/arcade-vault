---
name: add-game
description: Diseña la spec (estado Borrador) para portar o añadir un juego jugable (canvas) con leaderboard Supabase en Arcade Vault, a partir de una carpeta de references/started-games/ o de una descripción. No implementa: la implementación se hace después con /spec-impl.
disable-model-invocation: true
argument-hint: '<carpeta de references/started-games o descripción del juego>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Agent(mobile-porter), Bash(ls:*), Bash(date:*), Bash(cat:*), mcp__supabase__list_tables, mcp__supabase__list_migrations, mcp__supabase__execute_sql
---

# /add-game — Spec para añadir un juego real con leaderboard

## Contexto de sesión

Fecha (usar para la cabecera de la spec, nunca adivinar):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null`

Juegos de referencia:
!`ls references/started-games/ 2>/dev/null`

Motores ya portados:
!`ls games/ 2>/dev/null`

Registro de motores:
!`ls games/registry.ts 2>/dev/null || echo "NO EXISTE: el plan debe empezar con el bootstrap (contract.md)"`

Migraciones:
!`ls supabase/migrations/ 2>/dev/null`

Config de specs:
!`cat specs/.spec-config.yml 2>/dev/null || echo "NO EXISTE"`

---

Argumento: `$ARGUMENTS`

`/add-game` es `/spec` especializada en juegos. Flujo Spec Driven: **`/add-game` escribe la spec en `Borrador` y termina; el usuario la revisa y la marca `Aprobado`; `/spec-impl NN-<slug>` la implementa.** Responde en el idioma del prompt. **No escribas código, migraciones ni ramas en este comando.** Solo el `.md` de la spec.

## Fase 1 — Contexto

1. Lee `CLAUDE.md`, `specs/04-asteroids.md`, `specs/05-leaderboard-y-tabla-juegos.md`, `contract.md` y `checklist.md` (en este directorio), `.claude/skills/spec/SKILL.md`, `.claude/skills/spec/template.md` y `specs/11-controles-tactiles.md` (mando táctil).
2. Si `$ARGUMENTS` es una carpeta de `references/started-games/`: lee su `CLAUDE.md`/`README.md`, todo el JS/HTML/CSS y sus specs. Inventaría: mecánicas, constantes, stats (score/vidas/nivel), input, persistencia local (localStorage), menús propios, sonido, assets, resolución del canvas.
3. Si es una descripción: no hay referencia; el motor se diseña desde cero con el mismo contrato.
4. Si `$ARGUMENTS` está vacío, pide la carpeta o una frase describiendo el juego.
5. Si el juego no cabe en una frase de objetivo o mezcla varios juegos, propón dividirlo en varias specs antes de seguir.

## Fase 2 — Preguntas (AskUserQuestion, bloques de 3–5)

No saltes esta fase. Si el usuario quiere ir rápido, recuérdale que las preguntas ahorran trabajo en el código; si insiste, registra en Decisiones "Definición rápida sin aclaración detallada".

- **Catálogo:** ¿reemplaza un juego simulado o es fila nueva? Lista los candidatos con `execute_sql`: `select slug, title, sort_order from public.games where not saves_scores order by sort_order`. Recomienda el de temática afín (ej. tetris → `caida`).
- **Ficha:** slug, title, short, long (sin mencionar lo que no se porta), `cat`, `color` (enums existentes; uno nuevo implica migración de enum), portada `cover-*`.
- **Stats:** cómo mapear a `score` / `lives` / `level` del HUD (si el juego no tiene vidas, ¿se oculta o fija en 1?).
- **Descartes:** récords/localStorage, menús propios, HUD y GAME OVER en canvas, sonido. Por defecto se descartan y van a "Fuera". El táctil **no** se descarta: el mando lo diseña `mobile-porter` en la Fase 4.
- **Input:** inventaría todas las teclas (código, acción, modo en que actúa) para que la spec las documente; `mobile-porter` deriva el mando de ahí.
- **Temas:** ¿variantes visuales (como NEÓN/CLÁSICO)? Default y sin persistir.
- **Canvas:** resolución interna fija que encaje en `.crt-screen` (4:3) o con letterbox.

Para de preguntar cuando puedas responder sin suponer: qué archivos aparecen/cambian, cuál es el primer y el último paso, cómo se verifica.

## Fase 3 — Redactar la spec

Formato e idioma de SPEC 04/05 y de `template.md`: cabecera (`Estado: Borrador`, `Depende de`, `Fecha`, `Objetivo` en una frase), Alcance (Dentro/Fuera), Modelo de datos (API del motor, SQL de la migración), Plan de implementación numerado, Criterios de aceptación, Decisiones (Sí/No), Riesgos, "Lo que no está en esta spec".

- Si Fase 2 quedó completa, escribe la spec entera sin pedir confirmación sección a sección. Si falta información, desarrolla las secciones una a una y espera confirmación en cada una.
- `/spec-impl` no lee esta skill: el plan debe bastarse a sí mismo.
  - Si `games/registry.ts` no existe, el plan **empieza** con el bootstrap de `contract.md`.
  - El paso que registra el juego en `ENGINES` incluye `controls` (mando táctil). No escribas tú la sección `## Mando táctil`: la añade `mobile-porter` en la Fase 4.
  - El motor acepta `KeyboardEvent` sintéticos (no filtra `isTrusted`), según `contract.md`.
  - Cada paso cita la referencia que aplica: `.claude/skills/add-game/contract.md` (motor, registro) o `.claude/skills/add-game/checklist.md` (migración, portada, leaderboard).
  - El paso de migración incluye el SQL concreto, `apply_migration`, `npm run db:types`, `get_advisors` (security) y, si cambia esquema/enums/políticas, `docs/data-dictionary.md`.
  - Indica leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar Client Components, Server Actions o caché.
  - Cada paso deja el sistema funcional y commiteable.
- Criterios de aceptación: base de `checklist.md` §5 + los propios del juego + `get_advisors` sin avisos nuevos. Cada uno verificable con sí/no.
- Sin TODOs ni funciones completas de código; solo fragmentos que ilustren estructuras.

## Fase 4 — Guardar y parar

1. Número: el mayor de `specs/` + 1, con dos dígitos. Slug en kebab-case.
2. Fecha: la del contexto de sesión, nunca otra.
3. Verifica que cada spec de `Depende de` exista en `specs/`; si no, avísalo en vez de dejar una referencia rota.
4. Escribe `specs/NN-<slug>.md` directamente, sin pedir permiso. Pregunta solo si el archivo ya existe.
4b. Lanza el subagente `mobile-porter` con la ruta de la spec (caso A: spec en `Borrador` sin entrada en `ENGINES`). Añade `## Mando táctil` (tabla, objeto `controls` y criterios) a la spec. Revisa su salida:
    - Si avisa de bloqueos (input no soportado por el mando, juego no jugable de principio a fin con ≤3 botones, `isTrusted`), comunícalos al usuario junto a la confirmación.
    - Si `mobile-porter` falla o no está disponible, avísalo y deja en la spec la nota "Mando táctil pendiente: ejecutar `mobile-porter`"; no lo diseñes tú.
5. Estado `Borrador`. **Nunca** lo marques `Aprobado`: lo cambia el usuario tras releerla.
6. Si `specs/.spec-config.yml` no existe, créalo como lo hace `/spec` (`AutoCreateBranch: true`). Si existe, no lo toques.
7. Confirma al usuario: ruta creada, estado `Borrador`, mando táctil propuesto (tabla de `mobile-porter`), que debe cambiarlo a `Aprobado` tras releerla, y que el siguiente paso es `/spec-impl NN-<slug>`.
8. **Para aquí.**

## Reglas duras

- Nunca escribas código, migraciones ni ramas, ni apliques SQL de escritura.
- Nunca propongas implementar la spec tras guardarla.
- Nunca supongas decisiones que el usuario no confirmó.
- Nunca marques la spec como `Aprobado` o `Implementado`.
