// DANFO RUSH — the world around the road: Lagos roadside scenery (market
// stalls, palms, billboards, okada parks) scrolling past, and the sun's
// slow slide toward the horizon as the day runs out.

import { ROAD, VIEW } from './config.js';
import { pick, range } from './rng.js';

const STALL_COLORS = ['#e87aa6', '#7ad9ff', '#ffe45e', '#7ad97a', '#ff9d5c'];
const BILLBOARDS = ['DANFO RUSH', 'LAGOS 4 LIFE', 'OWAMBE!', 'Jollof Rice ₦2,500', 'SUNSET BUSES', 'EKO HOTEL'];

// Seed the roadside with scenery at even spacing so the first frame is full.
export function seedScenery(state) {
  state.scenery = [];
  for (let y = -60; y < VIEW.height + 60; y += 130) {
    maybeAddScenery(state, y, true);
  }
}

function maybeAddScenery(state, y, force) {
  const rng = state.rng;
  if (!force && rng() < 0.45) return;
  const side = rng() < 0.5 ? 'left' : 'right';
  const kind = pick(rng, ['stall', 'stall', 'palm', 'palm', 'billboard', 'kiosk']);
  const x =
    side === 'left'
      ? range(rng, 30, ROAD.left - 90)
      : range(rng, ROAD.right + 30, VIEW.width - 120);
  state.scenery.push({
    kind,
    side,
    x,
    y,
    color: pick(rng, STALL_COLORS),
    text: kind === 'billboard' ? pick(rng, BILLBOARDS) : '',
    wobble: rng() * Math.PI * 2,
  });
}

export function updateWorld(state, dt) {
  const scrollSpeed = state.bus.speed * 1.5;
  state.scroll += scrollSpeed * dt;
  for (const s of state.scenery) {
    s.y += scrollSpeed * dt;
    s.wobble += dt;
  }
  state.scenery = state.scenery.filter((s) => s.y < VIEW.height + 120);
  // Keep the top fed: new scenery drifts in as old leaves the bottom.
  const topY = state.scenery.reduce((min, s) => Math.min(min, s.y), VIEW.height);
  if (topY > -40) maybeAddScenery(state, topY - 130, false);
}

// 0 at the start of the day, 1 at sunset. The sun drops with it.
export function dayProgress(state) {
  return 1 - Math.max(0, state.timeLeft) / 150;
}

// The sky darkens as the sun sets: returns the dusk blend, 0 (day) to 1 (dusk).
export function duskBlend(state) {
  const p = dayProgress(state);
  return Math.min(1, Math.max(0, (p - 0.45) / 0.55));
}
