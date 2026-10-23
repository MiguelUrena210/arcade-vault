#!/bin/bash
# PostToolUse (MCP supabase apply_migration/execute_sql con DDL):
# avisa a Claude de que debe actualizar la documentación de la base de datos.
input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
detail=""

case "$tool" in
  mcp__supabase__apply_migration)
    detail="migración remota $(jq -r '.tool_input.name // "sin nombre"' <<<"$input")"
    ;;
  mcp__supabase__execute_sql)
    q=$(jq -r '.tool_input.query // empty' <<<"$input")
    grep -qiE '(^|[;[:space:]])(create|alter|drop|comment[[:space:]]+on|grant|revoke)[[:space:]]' <<<"$q" || exit 0
    detail="DDL ejecutado con execute_sql"
    ;;
  *) exit 0 ;;
esac

msg="Cambio en la base de datos detectado ($detail). Antes de continuar actualiza la documentación de la DB: docs/data-dictionary.md (enums, tablas, columnas, restricciones, índices, vistas, políticas RLS y la línea 'Última migración documentada') y cualquier otro archivo de docs/ que describa el esquema. Refleja el estado real tras el cambio (usa MCP list_tables verbose si hay dudas). Si ya lo actualizaste para este cambio, ignora este aviso."

jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
exit 0
