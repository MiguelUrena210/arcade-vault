// Un mapa por nivel; cada string es una fila (10 caracteres), de arriba hacia abajo.
// Leyenda: '.' vacío | r red | c cyan | g green | m magenta | y yellow | h hotpink
//          '2' gray con 2 golpes | '3' gray con 3 golpes
const LEVELS = [
  {
    name: 'Nivel 1',
    map: [
      'rrrrrrrrrr',
      'cccccccccc',
      'gggggggggg',
      'mmmmmmmmmm',
      'yyyyyyyyyy',
      'hhhhhhhhhh',
    ],
  },
  {
    name: 'Nivel 2', // franjas de color con filas gray de 2 golpes alternadas
    map: [
      'rrrrrrrrrr',
      '2.2.2.2.2.',
      'cccccccccc',
      '.2.2.2.2.2',
      'gggggggggg',
      '2.2.2.2.2.',
      'mmmmmmmmmm',
      'yyyyyyyyyy',
    ],
  },
  {
    name: 'Nivel 3', // techo gray de 3 golpes y bolsillos gray de 2 golpes
    map: [
      '3333333333',
      'rrrrrrrrrr',
      'c22cccc22c',
      'gggggggggg',
      'm22mmmm22m',
      'yyyyyyyyyy',
      'h.hhhhhh.h',
    ],
  },
  {
    name: 'Nivel 4', // fortaleza con hueco central y núcleo gray de 3 golpes
    map: [
      '3333333333',
      '3rrrrrrrr3',
      '2ccc..ccc2',
      '2ggg..ggg2',
      '2mmm33mmm2',
      '2yyy..yyy2',
      '2hhhhhhhh2',
      '2222222222',
    ],
  },
  {
    name: 'Nivel 5', // muro macizo de 10 filas con cola en tablero de ajedrez
    map: [
      '3333333333',
      '3rrrrrrrr3',
      '2cccccccc2',
      '2gggggggg2',
      '2mmmmmmmm2',
      '2yyyyyyyy2',
      '2hhhhhhhh2',
      '2222222222',
      '.3.3.3.3.3',
      '3.3.3.3.3.',
    ],
  },
];
