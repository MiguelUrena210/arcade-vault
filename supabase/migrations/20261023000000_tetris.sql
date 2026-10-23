update public.games
set slug = 'tetris',
    title = 'TETRIS',
    short = 'Encaja las piezas y limpia líneas antes de que el pozo se llene.',
    long = 'Siete piezas caen sobre un pozo de 10×20. Muévelas, rótalas y suéltalas de golpe para completar líneas: 1, 2, 3 o 4 a la vez valen 100, 300, 500 u 800 puntos por nivel. Cada 10 líneas sube el nivel y la caída se acelera. La pieza fantasma marca dónde aterrizará y la siguiente se ve antes de llegar.',
    cover = 'cover-tetris',
    saves_scores = true
where slug = 'caida';
