const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  mode: 'menu', // 'menu' | 'ready' | 'playing' | 'paused' | 'options' | 'levelclear' | 'gameover' | 'won'
  score: 0,
  lives: CONFIG.LIVES,
  paddle: createPaddle(),
  ball: createBall(),
  level: 0, // índice 0-based en LEVELS
  bricks: createBricks(0),
  explosions: [], // { x, y, w, h, color, t } con t en ms
  menu: createMenu(), // { screen, index, from }
};

attachBall(state.ball, state.paddle);

const bounceSound = new Audio('assets/sounds/ball-bounce.mp3');
const breakSound = new Audio('assets/sounds/break-sound.mp3');

// Clona el audio para permitir solapamiento; ignora el rechazo de autoplay.
function playSound(sound) {
  sound.cloneNode().play().catch(() => {});
}

function updateExplosions(dt) {
  for (const e of state.explosions) e.t += dt * 1000;
  state.explosions = state.explosions.filter((e) => e.t < EXPLOSION_DURATION);
}

function drawExplosions() {
  for (const e of state.explosions) {
    const frames = EXPLOSION_FRAMES[e.color];
    const i = Math.min(frames.length - 1, Math.floor((e.t / EXPLOSION_DURATION) * frames.length));
    drawFrame(ctx, frames[i], e.x, e.y, e.w, e.h);
  }
}

const MAX_DT = 1 / 30;
let lastTime = 0;

// Único punto de arranque: partida limpia en el nivel indicado (0-based).
function startGame(levelIndex) {
  state.score = 0;
  state.lives = CONFIG.LIVES;
  state.level = levelIndex;
  state.bricks = createBricks(state.level);
  state.paddle = createPaddle();
  state.explosions = [];
  attachBall(state.ball, state.paddle);
  state.mode = 'ready';
}

function resetGame() {
  startGame(0);
}

function openMenu() {
  state.menu = createMenu();
  state.menu.from = state.mode;
  state.mode = 'options';
}

function closeMenu() {
  state.mode = state.menu.from;
}

// Menú de inicio (mode 'menu') y menú en partida (mode 'options'): mismas pantallas
// 'main' y 'levels'. Opciones de 'main': Empezar / Continuar / Reiniciar nivel / Seleccionar nivel.
function updateMenu() {
  const items = menuItems(state.menu, state.mode);
  const action = updateMenuNav(state.menu, items.length);
  if (state.menu.screen === 'levels') {
    if (action === 'back') {
      state.menu.screen = 'main';
      state.menu.index = menuItems(state.menu, state.mode).indexOf('Seleccionar nivel');
    } else if (action === 'confirm') {
      startGame(state.menu.index);
    }
    return;
  }
  if (action === 'back') {
    if (state.mode === 'options') closeMenu();
  } else if (action === 'confirm') {
    const item = items[state.menu.index];
    if (item === 'Empezar') startGame(0);
    else if (item === 'Continuar') closeMenu();
    else if (item === 'Reiniciar nivel') startGame(state.level);
    else if (item === 'Seleccionar nivel') {
      state.menu.screen = 'levels';
      state.menu.index = state.level;
    }
  }
}

// Carga el siguiente nivel; puntaje y vidas se conservan.
function startNextLevel() {
  state.level++;
  state.bricks = createBricks(state.level);
  state.paddle = createPaddle();
  state.explosions = [];
  attachBall(state.ball, state.paddle);
}

function update(dt) {
  if (state.mode === 'menu') {
    if (pressed.has('Space') && state.menu.screen === 'main') startGame(0);
    else updateMenu();
    clearPressed();
    return;
  }
  if (state.mode === 'options') {
    updateMenu();
    clearPressed();
    return;
  }
  if (state.mode !== 'paused') updateExplosions(dt);
  if (state.mode === 'gameover' || state.mode === 'won') {
    if (pressed.has('Space')) {
      resetGame();
      state.mode = 'ready';
    }
    clearPressed();
    return;
  }
  if (state.mode === 'levelclear') {
    if (pressed.has('Space')) {
      startNextLevel();
      state.mode = 'ready';
    }
    clearPressed();
    return;
  }
  if (pressed.has('Escape')) {
    openMenu();
    clearPressed();
    return;
  }
  if (pressed.has('KeyP')) {
    if (state.mode === 'playing') state.mode = 'paused';
    else if (state.mode === 'paused') state.mode = 'playing';
  }
  if (state.mode === 'paused') {
    clearPressed();
    return;
  }
  if (state.mode === 'ready' || state.mode === 'playing') {
    updatePaddle(state.paddle, dt);
  }
  if (state.mode === 'ready') {
    attachBall(state.ball, state.paddle);
    if (pressed.has('Space')) {
      launchBall(state.ball, ballSpeed(state.level));
      state.mode = 'playing';
    }
  } else if (state.mode === 'playing') {
    const hitWall = updateBall(state.ball, dt);
    const hitPaddle = collideBallPaddle(state.ball, state.paddle, ballSpeed(state.level));
    const brick = collideBallBricks(state.ball, state.bricks);
    if (hitWall || hitPaddle || brick) playSound(bounceSound);
    if (brick && !brick.alive) {
      state.score += brick.color === 'gray'
        ? CONFIG.POINTS_PER_HIT_GRAY * brick.maxHp
        : CONFIG.POINTS_PER_BRICK;
      state.explosions.push({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, color: brick.color, t: 0 });
      playSound(breakSound);
    }
    if (!state.bricks.some((b) => b.alive)) {
      state.mode = state.level < LEVELS.length - 1 ? 'levelclear' : 'won';
    } else if (state.ball.y > CONFIG.HEIGHT) {
      state.lives--;
      state.mode = state.lives === 0 ? 'gameover' : 'ready';
    }
  }
  clearPressed();
}

function drawCenteredText(text, y, size) {
  ctx.font = `bold ${size}px monospace`;
  ctx.fillText(text, CONFIG.WIDTH / 2, y);
}

// Menú de inicio y menú en partida comparten pantallas y dibujo.
function drawMenu() {
  const start = state.mode === 'menu';
  const levels = state.menu.screen === 'levels';
  let hint = '↑↓ mover · Enter elegir · Esc cerrar';
  if (levels) hint = '↑↓ mover · Enter empezar · Esc volver';
  else if (start) hint = '↑↓ mover · Enter elegir · Espacio para empezar';
  drawMenuList(ctx, levels ? 'NIVELES' : start ? 'ARKANOID' : 'MENÚ', menuItems(state.menu, state.mode), state.menu.index, hint);
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntaje: ${state.score}`, 32, 40);
  ctx.textAlign = 'right';
  ctx.fillText(`Vidas: ${state.lives}`, CONFIG.WIDTH - 32, 40);
  ctx.textAlign = 'center';
  ctx.fillText(`Nivel ${state.level + 1}`, CONFIG.WIDTH / 2, 40);
}

const STATE_TEXTS = {
  ready: ['Espacio para lanzar'],
  paused: ['PAUSA', 'P para continuar'],
  gameover: ['GAME OVER', 'Espacio para reiniciar'],
  won: ['¡GANASTE!', 'Espacio para reiniciar'],
};

function drawStateText() {
  const lines = state.mode === 'levelclear'
    ? [`Nivel ${state.level + 1} completado`, 'Espacio para continuar']
    : STATE_TEXTS[state.mode];
  if (!lines) return;
  if (state.mode !== 'ready') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  if (state.mode === 'ready') {
    drawCenteredText(lines[0], CONFIG.HEIGHT / 2 + 80, 22);
  } else {
    drawCenteredText(lines[0], CONFIG.HEIGHT / 2 - 10, 56);
    drawCenteredText(lines[1], CONFIG.HEIGHT / 2 + 35, 22);
  }
}

function draw() {
  ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  if (state.mode === 'menu') {
    drawMenu();
    return;
  }
  drawBricks(ctx, state.bricks);
  drawExplosions();
  drawPaddle(ctx, state.paddle);
  drawBall(ctx, state.ball);
  drawHud();
  drawStateText();
  if (state.mode === 'options') drawMenu();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(loop);
  });
});
