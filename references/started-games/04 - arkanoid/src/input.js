const keys = {};          // code -> true mientras la tecla está pulsada
const pressed = new Set(); // codes pulsados desde el último clearPressed()

const PREVENT_DEFAULT = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

window.addEventListener('keydown', (e) => {
  if (PREVENT_DEFAULT.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  pressed.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function clearPressed() {
  pressed.clear();
}
