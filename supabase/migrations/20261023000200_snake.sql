update public.games
set slug = 'snake',
    title = 'SNAKE',
    short = 'Come fruta, crece y no choques contigo ni con el muro.',
    long = 'Guía la serpiente con ← ↑ → ↓ o W A S D. Cada fruta vale 10 puntos y la alarga; cada 5 frutas subes de nivel y la serpiente se acelera hasta el nivel 9. Chocar con un muro o con tu propio cuerpo termina la partida. Solo tienes una vida.',
    cover = 'cover-snake',
    saves_scores = true
where slug = 'serpentina';
