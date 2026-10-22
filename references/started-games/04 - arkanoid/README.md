# Juego de Arkanoid

Arkanoid jugable en HTML, CSS y JS, con **cero dependencias**. Sin build ni servidor: abre `index.html` en el navegador.

## Características

- Canvas de 800x600, pala con teclado, 3 vidas y puntaje (10 por bloque).
- 5 niveles progresivos con más bloques, disposiciones distintas y bloques `gray` resistentes (2-3 golpes).
- Velocidad de la bola +8 % por nivel.
- Menú de inicio y menú de partida (Esc): continuar, reiniciar nivel o seleccionar cualquiera de los 5 niveles.
- Sonidos de rebote y rotura, y explosiones al romper bloques.

## Controles

| Tecla | Acción |
|---|---|
| ← → / A D | Mover la pala |
| Espacio | Empezar, lanzar la bola, continuar o reiniciar |
| P | Pausar / continuar |
| Esc | Abrir/cerrar el menú de partida |
| ↑ ↓ + Enter | Navegar y elegir en los menús |

## Estructura

```
index.html
style.css            # solo estiliza el canvas
assets/              # spritesheet, sprites (spritesheet.js) y sonidos
src/
  config.js          # CONFIG: valores numéricos
  levels.js          # LEVELS: 5 mapas de texto
  input.js           # teclado
  entities.js        # pala, bola, bloques, colisiones
  menu.js            # menús
  game.js            # estado, bucle, HUD
specs/               # specs: fuente de verdad del comportamiento
```

Scripts clásicos (sin módulos ES) con globals compartidos; el orden de carga en `index.html` importa.

## Specs

| Spec | Descripción | Estado |
|---|---|---|
| 01 — MVP | Arkanoid jugable de 1 nivel | Implementado |
| 02 — Niveles progresivos | 5 niveles y bloques resistentes | Implementado |
| 03 — Menú y velocidad por nivel | Menú Esc, selector de nivel, +8 % de velocidad | Implementado |
