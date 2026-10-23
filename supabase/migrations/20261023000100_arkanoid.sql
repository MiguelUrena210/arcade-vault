update public.games
set slug = 'arkanoid',
    title = 'ARKANOID',
    short = 'Rebota la bola, rompe el muro y no la dejes caer.',
    long = 'Mueve la pala con ← → o A D y lanza la bola con Espacio. Cada bloque vale 10 puntos; los grises aguantan 2 o 3 golpes y valen 10 por golpe. Cinco muros distintos se repiten en ciclo y la bola acelera un 8 % por nivel hasta el 10. Tienes 3 vidas.',
    cover = 'cover-arkanoid',
    saves_scores = true
where slug = 'bloque-buster';
