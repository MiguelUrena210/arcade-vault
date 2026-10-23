# Checklist de integración y leaderboard

Basado en SPEC 04 y SPEC 05. El leaderboard ya existe: no se escribe código nuevo de guardado ni ranking; basta con marcar el juego `saves_scores = true`.

## 1. Catálogo (migración)

Archivo `supabase/migrations/AAAAMMDDHHMMSS_<slug>.sql` (timestamp posterior a la última). Antes, inspeccionar con `list_tables` y `list_migrations`. Seguir convenciones: `varchar(n)`, ids identity, enums cerrados.

**Reemplazo de un juego simulado:**

```sql
update public.games
set slug = '<nuevo>', title = '<TÍTULO>', short = '<…>', long = '<…>',
    cover = 'cover-<nuevo>', saves_scores = true
where slug = '<viejo>';
```

`cat`, `color`, `sort_order` se conservan salvo que la spec diga otra cosa. Limits: `short` ≤ 120, `long` ≤ 500, `title` ≤ 40, `slug` ≤ 40.

**Fila nueva:**

```sql
insert into public.games (slug, title, short, long, cat, cover, color, sort_order, saves_scores)
values ('<slug>', '<TÍTULO>', '<…>', '<…>', '<CAT>', 'cover-<slug>', '<color>',
        (select coalesce(max(sort_order), 0) + 1 from public.games), true);
```

Pasos: aplicar con MCP `apply_migration` → `npm run db:types` → `get_advisors` (security) sin avisos → si cambió esquema/enums/políticas, actualizar `docs/data-dictionary.md` y su línea "Última migración documentada".

Solo datos (update/insert): el diccionario no cambia, pero el drift hook puede avisar; revisarlo.

## 2. Portada y referencias

- `app/globals.css`: clase `.cover-<slug>` (+ `::before`/`::after`) junto a las otras portadas. En reemplazo, renombrar la clase vieja (`.cover-caida` → nueva) o reutilizarla si la spec lo decide.
- `grep -rn -i "<slug viejo>" app components lib games` vacío (incluye `lib/home.ts`: ticker).
- Skill `/frontend-design` para diseñar la portada.

## 3. Motor y registro

- Motor en `games/<slug>/` según `contract.md`; entrada en `games/registry.ts`.
- Con Supabase: `slug` del registro = `games.slug` exacto.

## 4. Leaderboard (ya implementado, solo verificar)

- `saveScore` (`app/games/[id]/play/actions.ts`): valida iniciales `^[A-Z0-9_]{3,10}$` y score 0–1.000.000; si el juego pudiera superar 1.000.000, ampliar el CHECK en una migración (y la action) y documentarlo.
- `getTopScores` / `getGames` con tags `games`, `scores`, `scores:<id>`.
- RLS de `scores_insert` permite insertar solo si `saves_scores`.
- Salón de la Fama y detalle leen del juego sin cambios.

## 5. Criterios de aceptación base (copiar a la spec)

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Migración aplicada (`list_migrations`); `games` muestra el slug nuevo con `saves_scores = true`; `database.types.ts` regenerado.
- [ ] Reemplazo: `/games/<viejo>` devuelve la 404 temática y no quedan referencias.
- [ ] `/games` y `/games/<slug>` muestran card/detalle con la portada y textos nuevos; JUGAR AHORA navega a `/games/<slug>/play`.
- [ ] El canvas llena la pantalla del CRT y el juego arranca como la referencia.
- [ ] Controles de la referencia funcionan; la página no hace scroll con las teclas del juego.
- [ ] Score, vidas y nivel del HUD React reflejan el motor; el canvas no dibuja HUD ni GAME OVER.
- [ ] PAUSA, `P` y `Escape` congelan y reanudan; overlay EN PAUSA.
- [ ] Game over y FIN abren el modal FIN DEL JUEGO con la puntuación real.
- [ ] Escribir en el input del modal (incluido espacio) no afecta al juego.
- [ ] JUGAR DE NUEVO reinicia score, vidas, nivel y estado.
- [ ] SALIR y volver no duplica loops ni listeners.
- [ ] GUARDAR PUNTUACIÓN con `ABC`: GUARDANDO… → PUNTUACIÓN GUARDADA + VER RANKING → `/hall-of-fame?game=<slug>` con la fila; Mejor global y Partidas actualizados en detalle.
- [ ] Iniciales inválidas (`AB`) muestran error, no insertan y el botón vuelve a estar activo.
- [ ] Asteroids y los juegos simulados restantes siguen como antes (arena simulada, sin leaderboard en los simulados).
- [ ] No se escribe nada en localStorage.

## 6. Cierre

- Tras `/spec-impl`: recorrer los criterios de la spec, marcar los comprobados y pasar la spec a `Implementado`. Informar de lo que no se pudo verificar (p. ej. prueba manual en navegador). `/add-game` no hace este paso.
- Si cambió algo documentado en `CLAUDE.md` (p. ej. registro de motores), actualizarlo.
- Los commits solo si el usuario los pide.
