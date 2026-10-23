create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null check (cover like 'cover-%'),
  color text not null check (color in ('cyan','magenta','green','yellow')),
  sort_order int not null,
  saves_scores boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id) on delete cascade,
  initials text not null check (initials ~ '^[A-Z0-9_]{3,10}$'),
  score int not null check (score between 0 and 1000000),
  created_at timestamptz not null default now()
);

create index scores_game_rank_idx on public.scores (game_id, score desc, created_at asc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id, max(s.score) as best, count(s.id)::int as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select" on public.games
  for select to anon, authenticated using (true);

create policy "scores_select" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert" on public.scores
  for insert to anon, authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.saves_scores));

insert into public.games (id, title, short, long, cat, cover, color, sort_order, saves_scores) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cover-bricks', 'cyan', 1, false),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'cover-tetro', 'magenta', 2, false),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'cover-snake', 'green', 3, false),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'cover-glot', 'yellow', 4, false),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'cover-invaders', 'green', 5, false),
  ('asteroids', 'ASTEROIDS', 'Pulveriza asteroides en gravedad cero.', 'Tu nave triangular flota en vacío absoluto. Rota, propulsa y dispara para partir asteroides grandes en medianos y pequeños. Tienes 3 vidas y cada nivel trae más asteroides.', 'SHOOTER', 'cover-asteroids', 'yellow', 6, true),
  ('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.', 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.', 'ARCADE', 'cover-rana', 'green', 7, false),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cover-duelo', 'cyan', 8, false);
