// DANFO RUSH — keyboard and mouse input. The game reads a plain object of
// held keys each frame; presses (horn, pause, restart, mute) are edge
// triggered and consumed by the main loop. Clicks are reported as canvas
// coordinates so the canvas-drawn buttons work with the mouse.

const held = new Set();
const pressed = new Set();
let click = null;

const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'faster',
  KeyW: 'faster',
  ArrowDown: 'slower',
  KeyS: 'slower',
  Space: 'horn',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
  Enter: 'confirm',
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat) pressed.add(action);
    held.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    click = { x, y };
  });
}

export function isHeld(action) {
  return held.has(action);
}

// True once per keypress; the main loop clears presses every frame.
export function wasPressed(action) {
  return pressed.has(action);
}

export function endFrameInput() {
  pressed.clear();
  click = null;
}

export function takeClick() {
  const c = click;
  click = null;
  return c;
}
