update public.games
set slug = 'frogger',
    title = 'FROGGER',
    short = 'Cruza 12 carriles de autopista en frogger sin acabar bajo una rueda.',
    long = 'Salta con ← ↑ → ↓ o W A S D entre 12 carriles de tráfico y una mediana segura hasta una de las 5 madrigueras. Cada fila nueva vale 10; cada madriguera, 50 más 10 por segundo sobrante; llenar las 5 da 1000 y sube el nivel: el tráfico acelera hasta el nivel 10. Tienes 3 vidas, 30 s por cruce y una vida extra cada 10 000 puntos.',
    cover = 'cover-frogger',
    saves_scores = true
where slug = 'ranaria';
