-- Scores de usuarios registrados: user_id + snapshot del display name.
-- Columnas nullable, sin backfill: filas existentes e invitados quedan a null.
alter table public.scores
  add column user_id uuid references auth.users (id) on delete set null,
  add column display_name varchar(40),
  -- Unidireccional: si hay usuario, hay nombre; el nombre sobrevive al borrado
  -- de la cuenta (on delete set null solo anula user_id).
  add constraint scores_user_has_name check (user_id is null or display_name is not null);

-- Soporta el on delete set null y futuros leaderboards por usuario.
create index scores_user_id_idx on public.scores (user_id);

-- anon nunca puede fijar user_id (su auth.uid() es null);
-- authenticated solo el suyo.
drop policy "scores_insert" on public.scores;
create policy "scores_insert" on public.scores
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id and g.saves_scores)
    and (user_id is null or user_id = (select auth.uid()))
  );
