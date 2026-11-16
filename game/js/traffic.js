// DANFO RUSH — traffic: the cars, okadas and trucks the danfo weaves
// through, and the potholes that punish a careless line. Everything moves
// relative to the bus: the world scrolls down at the bus's speed minus each
// vehicle's own speed, so slower traffic drifts toward the player.

import { BUS, DAMAGE, FEEL, ROAD, TRAFFIC } from './config.js';
import { pick, range, rangeInt } from './rng.js';
import { playCrash } from './audio.js';
import { addPopup } from './state.js';

const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8e8e8', '#5aa64b', '#c9c9c9', '#7a5aa6', '#d9a13d'];
const TRUCK_COLORS = ['#b8622d', '#4a7a8c', '#8c8c4a'];

function laneX(rng) {
  return ROAD.laneCenter(rangeInt(rng, 0, ROAD.lanes - 1));
}

function spawnCar(state) {
  const rng = state.rng;
  state.traffic.push({
    kind: 'car',
    x: laneX(rng),
    y: -90,
    w: 56,
    h: 96,
    speed: range(rng, TRAFFIC.carSpeedMin, TRAFFIC.carSpeedMax),
    color: pick(rng, CAR_COLORS),
    scatter: 0,
    scatterDir: 0,
    wobble: rng() * Math.PI * 2,
  });
}

function spawnOkada(state) {
  const rng = state.rng;
  state.traffic.push({
    kind: 'okada',
    x: laneX(rng),
    y: -60,
    w: 26,
    h: 52,
    speed: range(rng, TRAFFIC.okadaSpeedMin, TRAFFIC.okadaSpeedMax),
    color: pick(rng, ['#e8c33d', '#d94f3d', '#3d7bd9']),
    scatter: 0,
    scatterDir: 0,
    wobble: rng() * Math.PI * 2,
  });
}

function spawnTruck(state) {
  const rng = state.rng;
  state.traffic.push({
    kind: 'truck',
    x: laneX(rng),
    y: -150,
    w: 64,
    h: 150,
    speed: range(rng, TRAFFIC.truckSpeedMin, TRAFFIC.truckSpeedMax),
    color: pick(rng, TRUCK_COLORS),
    scatter: 0,
    scatterDir: 0,
    wobble: 0,
  });
}

function spawnPothole(state) {
  const rng = state.rng;
  state.potholes.push({
    x: ROAD.left + 30 + rng() * (ROAD.right - ROAD.left - 60),
    y: -40,
    r: range(rng, 16, 26),
  });
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 - 6 && Math.abs(ay - by) < (ah + bh) / 2 - 6;
}

// The horn scatters nearby traffic sideways for a moment.
export function honk(state) {
  const bus = state.bus;
  for (const v of state.traffic) {
    const dx = v.x - bus.x;
    const dy = v.y - bus.y;
    if (Math.abs(dx) < 220 && dy < 60 && dy > -320) {
      v.scatter = 1.6;
      v.scatterDir = dx >= 0 ? 1 : -1;
    }
  }
}

function crashInto(state, vehicle) {
  const bus = state.bus;
  const dmg = vehicle.kind === 'truck' ? DAMAGE.truckHit : vehicle.kind === 'okada' ? DAMAGE.okadaHit : DAMAGE.carHit;
  bus.condition = Math.max(0, bus.condition - dmg);
  bus.speed = Math.max(10, bus.speed * 0.45);
  bus.crashFlash = 0.5;
  state.shake = FEEL.shakeOnCrash;
  state.crashesToday += 1;
  state.combo = 1;
  state.comboTimer = 0;
  addPopup(state, bus.x, bus.y - 70, `CRASH -${dmg}%`, '#ff6b5e');
  playCrash();
  // The hit vehicle is shunted aside and drops behind, so one crash is not two.
  vehicle.y += 120;
  vehicle.scatter = 1.2;
  vehicle.scatterDir = vehicle.x < bus.x ? -1 : 1;
}

export function updateTraffic(state, dt) {
  const density = Math.pow(1.18, state.day - 1);
  const t = state.spawnTimers;
  const bus = state.bus;

  t.car -= dt;
  if (t.car <= 0) {
    spawnCar(state);
    t.car = TRAFFIC.carGap / density + state.rng() * 0.7;
  }
  t.okada -= dt;
  if (t.okada <= 0) {
    spawnOkada(state);
    t.okada = TRAFFIC.okadaGap / density + state.rng() * 1.2;
  }
  t.truck -= dt;
  if (t.truck <= 0) {
    spawnTruck(state);
    t.truck = TRAFFIC.truckGap / density + state.rng() * 3;
  }
  t.pothole -= dt;
  if (t.pothole <= 0) {
    spawnPothole(state);
    t.pothole = TRAFFIC.potholeGap + state.rng() * 2.5;
  }

  // Pixels per second of world scroll at the bus's speed. 1 km/h ≈ 1.5 px/s
  // here: the road rushes at speed, and traffic drifts by at the difference.
  const scrollSpeed = bus.speed * 1.5;
  for (const v of state.traffic) {
    const rel = scrollSpeed - v.speed * 1.5;
    v.y += rel * dt;
    if (v.kind === 'okada') {
      // Okadas weave between lanes — the one vehicle that changes its mind.
      v.wobble += dt * 2.2;
      v.x += Math.sin(v.wobble) * 34 * dt;
    }
    if (v.scatter > 0) {
      v.scatter -= dt;
      v.x += v.scatterDir * 130 * dt;
    }
    v.x = Math.max(ROAD.left + v.w / 2, Math.min(ROAD.right - v.w / 2, v.x));
    if (overlaps(bus.x, bus.y, BUS.width, BUS.height, v.x, v.y, v.w, v.h)) {
      crashInto(state, v);
    }
  }
  state.traffic = state.traffic.filter((v) => v.y < 820 && v.y > -260);

  for (const p of state.potholes) {
    p.y += scrollSpeed * dt;
    if (Math.abs(p.x - bus.x) < BUS.width / 2 + p.r - 8 && Math.abs(p.y - bus.y) < BUS.height / 2 + p.r - 8) {
      bus.condition = Math.max(0, bus.condition - DAMAGE.pothole);
      bus.speed = Math.max(10, bus.speed * 0.8);
      bus.crashFlash = 0.3;
      state.shake = Math.max(state.shake, 8);
      addPopup(state, bus.x, bus.y - 70, 'POTHOLE!', '#ff9d5c');
      playCrash();
      p.y = 9999; // hit once, then gone
    }
  }
  state.potholes = state.potholes.filter((p) => p.y < 820);
}
