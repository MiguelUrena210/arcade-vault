#!/bin/bash
# SessionStart: detecta deriva entre la DB y su documentación (cambios hechos fuera de Claude Code).
#  1. Última migración local vs "Última migración documentada" en docs/data-dictionary.md.
#  2. Tipos regenerados desde el proyecto remoto vs lib/supabase/database.types.ts.
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" || exit 0
issues=()

latest=$(ls supabase/migrations/*.sql 2>/dev/null | sort | tail -1 | xargs -n1 basename 2>/dev/null)
documented=$(sed -n 's/^Última migración documentada: `\(.*\)`.*/\1/p' docs/data-dictionary.md 2>/dev/null | head -1)
if [ -n "$latest" ] && [ "$latest" != "$documented" ]; then
  issues+=("la última migración local es $latest pero docs/data-dictionary.md documenta ${documented:-ninguna}")
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
if npx supabase gen types typescript --project-id bffywagyecastmrxbnem >"$tmp" 2>/dev/null && [ -s "$tmp" ]; then
  if ! diff -q "$tmp" lib/supabase/database.types.ts >/dev/null 2>&1; then
    issues+=("el esquema remoto difiere de lib/supabase/database.types.ts (cambio hecho fuera de Claude Code)")
  fi
fi

[ ${#issues[@]} -eq 0 ] && exit 0

list=$(printf '%s; ' "${issues[@]}")
msg="Deriva detectada entre la base de datos y su documentación: ${list%; }. Revisa el esquema real (MCP list_tables verbose / list_migrations), actualiza docs/data-dictionary.md y, si los tipos difieren, ejecuta npm run db:types. Avisa al usuario antes de empezar otro trabajo."
jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $m}}'
exit 0
