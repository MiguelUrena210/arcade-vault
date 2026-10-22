#!/bin/bash
# PostToolUse (Write|Edit): Prettier + ESLint sobre archivos React/Markdown del proyecto.
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

[ -n "$f" ] && [ -f "$f" ] || exit 0
case "$f" in
  "$root"/node_modules/*|"$root"/.next/*|"$root"/references/*|"$root"/.claude/*) exit 0 ;;
  "$root"/*) ;;
  *) exit 0 ;;
esac

cd "$root" || exit 0
case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    npx prettier --write "$f" >/dev/null 2>&1
    out=$(npx eslint --fix "$f" 2>&1) || { echo "$out" >&2; exit 2; }
    ;;
  *.md)
    npx prettier --write "$f" >/dev/null 2>&1
    ;;
esac
exit 0
