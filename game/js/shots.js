// DANFO RUSH — deterministic screenshot staging. With ?shot=title|drive|
// pickup|results the game renders one frozen, representative frame from a
// fixed seed, so the screenshots are real renders of the game's own code
// and byte-stable from run to run. No audio, no animation loop.

import { BUS, ROAD } from './config.js';
import { mulberry32 } from './rng.js';
import { startDay } from './state.js';
import { seedScenery } from './world.js';

export const SHOT_SEED = 7;

function stagedBus(state, opts) {
  const bus = state.bus;
  bus.x = opts.x;
  bus.y = opts.y || BUS.cruiseY;
  bus.speed = opts.speed;
  bus.condition = opts.condition;
  bus.fuel = opts.fuel;
  bus.passengers = [];
  for (let i = 0; i < (opts.passengers || 0); i++) {
    bus.passengers.push({
      fare: 500,
      rideLeft: 12,
      color: ['#d94f3d', '#3d7bd9', '#5aa64b', '#d9a13d', '#7a5aa6', '#e87aa6'][i % 6],
    });
  }
}

function stagedTraffic(state, rng, spots) {
  state.traffic = spots.map((s) => ({
    kind: s.kind,
    x: s.x,
    y: s.y,
    w: s.kind === 'okada' ? 26 : s.kind === 'truck' ? 64 : 56,
    h: s.kind === 'okada' ? 52 : s.kind === 'truck' ? 150 : 96,
    speed: 30,
    color: s.color,
    scatter: 0,
    scatterDir: 0,
    wobble: rng() * Math.PI * 2,
  }));
}

function stagedStop(state, y, fares) {
  state.stops = [
    {
      x: ROAD.shoulderRight,
      y,
      waiting: fares.map((fare, i) => ({
        name: ['Mama Nkechi', 'Tunde', 'Aisha', 'Chidi'][i % 4],
        fare,
        color: ['#d94f3d', '#3d7bd9', '#5aa64b', '#d9a13d'][i % 4],
      })),
      boardTimer: 0,
      served: false,
    },
  ];
}

// Stage `state` for one of the four screenshots. Returns false for an
// unknown shot name (the game then starts normally).
export function stageShot(state, shot) {
  const rng = mulberry32(SHOT_SEED);
  state.rng = rng;
  state.seed = SHOT_SEED;
  state.time = 3.7; // a fixed clock: every staged frame is identical
  state.shotMode = shot;
  seedScenery(state);

  if (shot === 'title') {
    state.screen = 'title';
    return true;
  }

  startDay(state);
  state.time = 3.7;
  state.message = null;
  state.screen = 'playing';

  if (shot === 'drive') {
    state.fare = 3200;
    state.score = 3200;
    state.timeLeft = 58;
    state.combo = 2;
    state.comboTimer = 4;
    state.pickupsToday = 7;
    stagedBus(state, { x: ROAD.laneCenter(1), speed: 62, condition: 78, fuel: 64, passengers: 6 });
    stagedTraffic(state, rng, [
      { kind: 'car', x: ROAD.laneCenter(0), y: 180, color: '#d94f3d' },
      { kind: 'car', x: ROAD.laneCenter(2), y: 320, color: '#3d7bd9' },
      { kind: 'okada', x: ROAD.laneCenter(3), y: 240, color: '#e8c33d' },
      { kind: 'truck', x: ROAD.laneCenter(0), y: 420, color: '#b8622d' },
      { kind: 'car', x: ROAD.laneCenter(3), y: 470, color: '#e8e8e8' },
    ]);
    state.potholes = [{ x: ROAD.laneCenter(2), y: 480, r: 22 }];
    stagedStop(state, 260, [500, 700, 400]);
    state.stations = [{ x: ROAD.shoulderLeft, y: 300, lit: true }];
    return true;
  }

  if (shot === 'pickup') {
    state.fare = 4100;
    state.score = 4100;
    state.timeLeft = 84;
    state.combo = 2;
    state.comboTimer = 5;
    state.pickupsToday = 9;
    stagedBus(state, { x: ROAD.right - 40, speed: 8, condition: 84, fuel: 71, passengers: 9 });
    stagedTraffic(state, rng, [
      { kind: 'car', x: ROAD.laneCenter(0), y: 200, color: '#5aa64b' },
      { kind: 'okada', x: ROAD.laneCenter(1), y: 300, color: '#d94f3d' },
      { kind: 'car', x: ROAD.laneCenter(2), y: 420, color: '#c9c9c9' },
    ]);
    stagedStop(state, BUS.cruiseY, [500, 600]);
    state.popups = [
      { x: ROAD.right - 60, y: BUS.cruiseY - 90, text: '+₦500', color: '#ffe45e', life: 1.2 },
      { x: ROAD.right - 140, y: BUS.cruiseY - 130, text: '+₦700', color: '#ffe45e', life: 0.9 },
    ];
    return true;
  }

  if (shot === 'results') {
    state.fare = 7800;
    state.score = 7800;
    state.timeLeft = 21;
    state.pickupsToday = 12;
    state.crashesToday = 1;
    state.distanceKm = 14.6;
    state.endReason = 'target';
    state.screen = 'daycomplete';
    stagedBus(state, { x: ROAD.laneCenter(1), speed: 0, condition: 71, fuel: 38, passengers: 4 });
    stagedTraffic(state, rng, [
      { kind: 'car', x: ROAD.laneCenter(0), y: 200, color: '#d94f3d' },
      { kind: 'car', x: ROAD.laneCenter(3), y: 380, color: '#3d7bd9' },
    ]);
    return true;
  }

  return false;
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}
