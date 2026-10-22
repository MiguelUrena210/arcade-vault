# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas + vanilla JS (README and UI text are in Spanish). No dependencies, no bundler, no tests, no linter, no git repo.

## Running

Open `index.html` in a browser, or serve locally: `npx serve .` (then http://localhost:3000). There is no build step.

## Architecture

All game logic lives in `game.js` (loaded as a classic script by `index.html`, `'use strict'`). The canvas is a fixed 800×600 (`W`/`H` constants must match the `<canvas>` attributes in `index.html`).

- **Loop**: `loop(ts)` → `update(dt)` → `draw()` via `requestAnimationFrame`; `dt` is in seconds and clamped to 0.05.
- **State machine**: global `state` is `'playing' | 'dead' | 'gameover'`. `update()` branches on it first; `'dead'` is a 2s respawn timer (`deadTimer`) during which asteroids/particles keep moving, and `'gameover'` waits for Space to call `initGame()`. Game state is module-level `let` globals (`ship, bullets, asteroids, particles, score, lives, level`), reset in `initGame()`.
- **Entities** (`Ship`, `Bullet`, `Asteroid`, `Particle`): each has `update(dt)`, `draw()`, and a `dead` flag; dead entities are removed by `.filter()` in `update()` rather than spliced during iteration. Positions wrap toroidally with `wrap()`.
- **Collisions**: circle-based using `dist()` and `radius`. Ship vs asteroid uses `ship.radius + a.radius * 0.82` (forgiving hitbox) and is skipped while `ship.invincible > 0` (also drives the respawn blink in `Ship.draw`).
- **Asteroid sizes**: 1/2/3 index into the parallel arrays `RADII`, `SPEEDS`, `POINTS` (index 0 unused). `split()` produces two asteroids of `size - 1`. Note the points are inverted vs. size (small = 100, large = 20).
- **Input**: `keys` (held) and `justPressed` (edge-triggered, consumed by `pressed(code)`) keyed by `KeyboardEvent.code`. Shooting uses `pressed('Space')` (one shot per keypress, plus 0.2s cooldown); movement reads `keys` directly.
- **Levels**: clearing all asteroids calls `nextLevel()`, which resets the ship and spawns `3 + level` large asteroids at least `SAFE_DIST` from center.
