'use strict';

// Menú de pausa: overlay propio #pause-menu. game.js consulta Pause.isOpen()/cooling().
const Pause = (() => {
  const COOLDOWN = 150; // ms tras cerrar: ignora teclas mantenidas
  const MAX_LEVEL = 10;
  const menu = document.getElementById('pause-menu');
  const resumeBtn = document.getElementById('pause-resume');
  const restartBtn = document.getElementById('pause-restart');
  const levelSel = document.getElementById('start-level');
  let open = false;
  let closedAt = -Infinity;
  let startLevel = 1;

  try {
    const n = parseInt(localStorage.getItem('startLevel'), 10);
    if (n >= 1 && n <= MAX_LEVEL) startLevel = n;
  } catch (e) {}

  for (let i = 1; i <= MAX_LEVEL; i++) levelSel.add(new Option(String(i), String(i)));
  levelSel.value = String(startLevel);

  function show() {
    open = true;
    menu.classList.remove('hidden');
    resumeBtn.focus();
  }

  function hide() {
    if (open) closedAt = performance.now();
    open = false;
    menu.classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  levelSel.addEventListener('change', () => {
    startLevel = parseInt(levelSel.value, 10) || 1;
    try { localStorage.setItem('startLevel', String(startLevel)); } catch (e) {}
  });

  resumeBtn.addEventListener('click', () => togglePause());
  restartBtn.addEventListener('click', () => init());

  return {
    isOpen: () => open,
    cooling: () => performance.now() - closedAt < COOLDOWN,
    startLevel: () => startLevel,
    show,
    hide,
  };
})();
