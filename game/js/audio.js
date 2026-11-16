// DANFO RUSH — every sound is synthesized live with WebAudio. No audio
// files, no network: an engine hum, a two-tone horn, a fare cha-ching, a
// pickup blip, a crash thud and a little win/lose jingle.

let ctx = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

// Start the audio engine. Browsers only allow sound after a user gesture,
// so the game calls this from the START button / first keypress.
export function startAudio() {
  const ac = ensureContext();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  if (!engineOsc) {
    engineOsc = ac.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    engineGain = ac.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(ac.destination);
    engineOsc.start();
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.05;
  return muted;
}

// The engine hum follows the bus speed: pitch and volume rise with speed.
export function setEngine(speedKmh, running) {
  if (!ctx || !engineOsc || !engineGain) return;
  if (muted || !running || speedKmh <= 0) {
    engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    return;
  }
  engineOsc.frequency.setTargetAtTime(45 + speedKmh * 0.9, ctx.currentTime, 0.1);
  engineGain.gain.setTargetAtTime(0.02 + (speedKmh / 110) * 0.05, ctx.currentTime, 0.1);
}

function blip(freq, at, dur, type, vol) {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  const t = ctx.currentTime + (at || 0);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol || 0.18, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// The fare cha-ching: two bright notes, higher when the combo is high.
export function playFare(combo) {
  const lift = (combo - 1) * 90;
  blip(880 + lift, 0, 0.14, 'sine', 0.2);
  blip(1318 + lift, 0.09, 0.22, 'sine', 0.2);
}

export function playPickup() {
  blip(660, 0, 0.1, 'triangle', 0.16);
}

export function playAlight() {
  blip(520, 0, 0.08, 'triangle', 0.1);
}

// A danfo horn: two tones at once, short and loud.
export function playHorn() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  [370, 466].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.setValueAtTime(0.12, t + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

// A crash: a burst of filtered noise plus a low thud.
export function playCrash() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  blip(70, 0, 0.3, 'sine', 0.4);
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.13, 0.28, 'triangle', 0.2));
}

export function playLose() {
  [392, 330, 262, 196].forEach((f, i) => blip(f, i * 0.16, 0.3, 'triangle', 0.18));
}

export function playClick() {
  blip(700, 0, 0.06, 'sine', 0.12);
}
