// DANFO RUSH — the main loop and the screen flow. Wires input, traffic,
// passengers, world and rendering together; owns the win/lose rules, the
// bus's movement, and the buttons on every screen.

import { BUS, DAMAGE, DAY, HORN, ROAD, VIEW } from './config.js';
import { createState, newRun, nextDay, saveBest, showMessage, startDay } from './state.js';
import { endFrameInput, initInput, isHeld, takeClick, wasPressed } from './input.js';
import { updateTraffic, honk } from './traffic.js';
import { updatePassengers } from './passengers.js';
import { seedScenery, updateWorld } from './world.js';
import { render } from './render.js';
import { playClick, playHorn, playLose, playWin, setEngine, startAudio, toggleMute } from './audio.js';
import { shotFromUrl, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createState();

initInput(canvas);
seedScenery(state);

// -- the bus -------------------------------------------------------------

function updateBus(dt) {
  const bus = state.bus;
  if (isHeld('left')) bus.x -= BUS.steerSpeed * dt;
  if (isHeld('right')) bus.x += BUS.steerSpeed * dt;
  bus.x = Math.max(ROAD.left - 58, Math.min(ROAD.right + 58, bus.x));
  if (isHeld('faster')) bus.speed = Math.min(BUS.maxSpeed, bus.speed + BUS.accel * dt);
  if (isHeld('slower')) bus.speed = Math.max(BUS.minSpeed, bus.speed - BUS.brake * dt);
  if (bus.hornCooldown > 0) bus.hornCooldown -= dt;
  if (bus.hornFlash > 0) bus.hornFlash -= dt;
  if (bus.crashFlash > 0) bus.crashFlash -= dt;
  if (wasPressed('horn') && bus.hornCooldown <= 0) {
    bus.hornCooldown = HORN.cooldownSeconds;
    bus.hornFlash = 0.5;
    honk(state);
    playHorn();
  }
  // Fuel burns with speed; idling sips.
  bus.fuel = Math.max(
    0,
    bus.fuel - (DAMAGE.fuelIdle + DAMAGE.fuelPerSecond * (bus.speed / BUS.maxSpeed)) * dt,
  );
  state.distanceKm += (bus.speed / 3600) * dt;
}

// -- win / lose ----------------------------------------------------------

function finishDay(won, reason) {
  state.endReason = reason;
  if (state.score > 0) saveBest(state.score);
  if (won) {
    state.screen = 'daycomplete';
    playWin();
  } else {
    state.screen = 'gameover';
    playLose();
  }
  setEngine(0, false);
}

function updatePlaying(dt) {
  state.timeLeft -= dt;
  updateBus(dt);
  updateWorld(state, dt);
  updateTraffic(state, dt);
  updatePassengers(state, dt);
  state.scroll += state.bus.speed * 1.5 * dt;

  for (const p of state.popups) {
    p.y -= 46 * dt;
    p.life -= dt;
  }
  state.popups = state.popups.filter((p) => p.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 30 * dt);
  setEngine(state.bus.speed, true);

  if (state.fare >= state.target) {
    finishDay(true, 'target');
    return;
  }
  if (state.bus.condition <= 0) {
    finishDay(false, 'wrecked');
    return;
  }
  if (state.bus.fuel <= 0) {
    finishDay(false, 'dry');
    return;
  }
  if (state.timeLeft <= 0) {
    finishDay(state.fare >= state.target, 'sunset');
  }
}

// -- buttons and keys ----------------------------------------------------

function pressButton(id) {
  playClick();
  if (id === 'start') {
    startAudio();
    newRun(state);
  } else if (id === 'resume') {
    state.screen = 'playing';
  } else if (id === 'nextday') {
    nextDay(state);
  } else if (id === 'restart') {
    newRun(state);
  }
}

function handleInput() {
  const click = takeClick();
  if (click) {
    for (const b of state.buttons) {
      if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
        pressButton(b.id);
        break;
      }
    }
  }
  if (wasPressed('mute')) {
    state.muted = toggleMute();
  }
  if (wasPressed('confirm')) {
    if (state.screen === 'title') {
      startAudio();
      newRun(state);
    } else if (state.screen === 'daycomplete') {
      nextDay(state);
    } else if (state.screen === 'gameover') {
      newRun(state);
    }
  }
  if (wasPressed('restart') && state.screen !== 'title') {
    newRun(state);
  }
  if (wasPressed('pause')) {
    if (state.screen === 'playing') {
      state.screen = 'paused';
      setEngine(0, false);
    } else if (state.screen === 'paused') {
      state.screen = 'playing';
    }
  }
}

// -- the frame loop ------------------------------------------------------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;
  handleInput();
  if (state.screen === 'playing') updatePlaying(dt);
  render(ctx, state);
  endFrameInput();
  requestAnimationFrame(frame);
}

// -- boot ----------------------------------------------------------------

// A handle for headless play-testing: the test drives the live state
// (start, steer, force a win/lose) and reads the screen back. It changes
// nothing about how the game plays.
window.__danfoState = state;

const shot = shotFromUrl();
if (shot && stageShot(state, shot)) {
  // Screenshot mode: one frozen frame, no loop, no audio.
  render(ctx, state);
  window.__danfoReady = true;
} else {
  if (shot) showMessage(state, '', '', 0);
  requestAnimationFrame(frame);
  window.__danfoReady = true;
}
