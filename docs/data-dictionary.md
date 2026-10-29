# Diccionario de datos

Esquema `public` del proyecto Supabase `bffywagyecastmrxbnem`. Se actualiza en cada migración que cree o modifique una tabla, vista, enum o política.

Convenciones: ids `integer generated always as identity`; textos como `varchar(n)` (nunca `text`); catálogos cerrados como `enum`.

Última migración documentada: `20261029000000_scores_user.sql`

Las migraciones `20261023000000_tetris`, `20261023000100_arkanoid` y `20261023000200_snake` solo actualizan filas de `games` (slug, textos, portada, `saves_scores`); no cambian el esquema.

## Enums

### `game_category`

| Valor     |
| --------- |
| `ARCADE`  |
| `PUZZLE`  |
| `SHOOTER` |
| `VERSUS`  |

### `game_color`

| Valor     |
| --------- |
| `cyan`    |
| `magenta` |
| `green`   |
| `yellow`  |

## Tablas

### `games`

Catálogo de juegos. Única fuente del catálogo de la app. RLS activo.

| Columna        | Tipo            | Nulo | Default           | Restricciones                | Descripción                                    |
| -------------- | --------------- | ---- | ----------------- | ---------------------------- | ---------------------------------------------- |
| `id`           | `integer`       | no   | identity (always) | PK                           | Identificador interno.                         |
| `slug`         | `varchar(40)`   | no   | —                 | UNIQUE                       | Identificador de URL (`/games/<slug>`).        |
| `title`        | `varchar(40)`   | no   | —                 |                              | Nombre visible.                                |
| `short`        | `varchar(120)`  | no   | —                 |                              | Descripción corta (cards).                     |
| `long`         | `varchar(500)`  | no   | —                 |                              | Descripción larga (detalle).                   |
| `cat`          | `game_category` | no   | —                 |                              | Categoría.                                     |
| `cover`        | `varchar(40)`   | no   | —                 | CHECK `cover like 'cover-%'` | Clase CSS de la portada.                       |
| `color`        | `game_color`    | no   | —                 |                              | Color de acento.                               |
| `sort_order`   | `integer`       | no   | —                 |                              | Orden en listados.                             |
| `saves_scores` | `boolean`       | no   | `false`           |                              | `true` si el juego guarda puntuaciones reales. |
| `created_at`   | `timestamptz`   | no   | `now()`           |                              | Fecha de alta.                                 |

Políticas RLS: `games_select` (SELECT para `anon`, `authenticated`). Sin insert/update/delete.

### `scores`

Puntuaciones guardadas. RLS activo.

| Columna        | Tipo          | Nulo | Default           | Restricciones                           | Descripción                                    |
| -------------- | ------------- | ---- | ----------------- | --------------------------------------- | ---------------------------------------------- |
| `id`           | `integer`     | no   | identity (always) | PK                                      | Identificador.                                 |
| `game_id`      | `integer`     | no   | —                 | FK → `games.id` ON DELETE CASCADE       | Juego al que pertenece.                        |
| `initials`     | `varchar(10)` | no   | —                 | CHECK `initials ~ '^[A-Z0-9_]{3,10}$'`  | Iniciales del jugador.                         |
| `score`        | `integer`     | no   | —                 | CHECK `score between 0 and 1000000`     | Puntuación.                                    |
| `user_id`      | `uuid`        | sí   | —                 | FK → `auth.users.id` ON DELETE SET NULL | Usuario registrado (`null` = invitado).        |
| `display_name` | `varchar(40)` | sí   | —                 |                                         | Snapshot del display name al guardar el score. |
| `created_at`   | `timestamptz` | no   | `now()`           |                                         | Fecha de la partida.                           |

Restricción de tabla: `scores_user_has_name` — CHECK `user_id is null or display_name is not null` (si hay usuario, hay nombre; el nombre sobrevive al borrado de la cuenta porque el `on delete set null` solo anula `user_id`).

Índices: `scores_game_rank_idx` (`game_id`, `score desc`, `created_at asc`), `scores_user_id_idx` (`user_id`).

Políticas RLS:

- `scores_select`: SELECT para `anon`, `authenticated`.
- `scores_insert`: INSERT para `anon`, `authenticated` solo si el `games` referenciado tiene `saves_scores = true` y `user_id` es `null` o igual a `auth.uid()` (un `anon` nunca puede fijar `user_id`; un `authenticated`, solo el suyo).
- Sin update/delete.

## Funciones y event triggers

### `rls_auto_enable()`

Función en `public`, ligada al event trigger `ensure_rls` (`ddl_command_end`). Habilita RLS automáticamente en tablas nuevas. Viene de la plataforma Supabase, no de las migraciones del repo. No aparece en `database.types.ts`.

## Vistas

### `game_stats` (`security_invoker = true`)

Estadísticas por juego calculadas desde `scores`.

| Columna   | Tipo      | Nulo | Descripción                            |
| --------- | --------- | ---- | -------------------------------------- |
| `game_id` | `integer` | no   | `games.id`.                            |
| `best`    | `integer` | sí   | Máxima puntuación (`null` sin scores). |
| `plays`   | `integer` | no   | Nº de scores guardados (0 sin scores). |
