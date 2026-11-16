// DANFO RUSH — the money: bus stops with waiting passengers, and the fuel
// stations that keep the danfo running. Pull into the right shoulder and
// slow down at a stop and passengers board one by one, each paying a fare.
// A full bus can't board anyone until riders alight on their own.

import { BUS, DAMAGE, FARE, ROAD, TRAFFIC } from './config.js';
import { rangeInt } from './rng.js';
import { playAlight, playFare, playPickup } from './audio.js';
import { addPopup, showMessage } from './state.js';

const NAMES = ['Mama Nkechi', 'Tunde', 'Aisha', 'Chidi', 'Funke', 'Emeka', 'Zainab', 'Olu', 'Ada', 'Bayo', 'Kemi', 'Ibrahim'];

function spawnStop(state) {
  const rng = state.rng;
  const waiting = [];
  const count = rangeInt(rng, 2, 5);
  for (let i = 0; i < count; i++) {
    waiting.push({
      name: NAMES[Math.floor(rng() * NAMES.length)],
      fare: rangeInt(rng, FARE.min, FARE.max),
      color: ['#d94f3d', '#3d7bd9', '#5aa64b', '#d9a13d', '#7a5aa6', '#e87aa6'][Math.floor(rng() * 6)],
    });
  }
  state.stops.push({
    x: ROAD.shoulderRight,
    y: -80,
    waiting,
    boardTimer: 0,
    served: false,
  });
}

function spawnStation(state) {
  state.stations.push({ x: ROAD.shoulderLeft, y: -100, lit: true });
}

// The bus is "at" a roadside feature when it is slow and hugging that side.
function atStop(state, stop) {
  const bus = state.bus;
  return bus.speed < 25 && bus.x > ROAD.right - 130 && Math.abs(stop.y - bus.y) < 120;
}

function atStation(state, station) {
  const bus = state.bus;
  return bus.speed < 25 && bus.x < ROAD.left + 130 && Math.abs(station.y - bus.y) < 120;
}

function boardOne(state, stop) {
  const bus = state.bus;
  const rider = stop.waiting.shift();
  if (!rider) return;
  // Chaining: the multiplier only rises when this pickup follows the last
  // one inside the combo window. Capture it BEFORE resetting the timer.
  const chaining = state.comboTimer > 0;
  bus.passengers.push({ fare: rider.fare, rideLeft: FARE.rideSeconds, color: rider.color });
  // The combo pays a bonus, not a multiple: x1, x1.5, x2. A full x2/x3
  // multiple let one busy stop clear the whole day's target.
  const paid = Math.round(rider.fare * (1 + 0.5 * (state.combo - 1)));
  state.fare += paid;
  state.score += paid;
  state.pickupsToday += 1;
  state.comboTimer = FARE.comboWindowSeconds;
  addPopup(state, bus.x + 40, bus.y - 60, `+₦${paid.toLocaleString()}`, '#ffe45e');
  playFare(state.combo);
  playPickup();
  if (chaining) {
    state.combo = Math.min(FARE.comboMax, state.combo + 1);
  }
}

export function updatePassengers(state, dt) {
  const t = state.spawnTimers;
  t.stop -= dt;
  if (t.stop <= 0) {
    spawnStop(state);
    t.stop = TRAFFIC.stopGap + state.rng() * 4;
  }
  t.station -= dt;
  if (t.station <= 0) {
    spawnStation(state);
    t.station = TRAFFIC.stationGap + state.rng() * 10;
  }

  const scrollSpeed = state.bus.speed * 1.5;
  for (const stop of state.stops) {
    stop.y += scrollSpeed * dt;
    if (atStop(state, stop) && stop.waiting.length > 0) {
      if (state.bus.passengers.length >= BUS.seats) {
        if (!stop.served) {
          showMessage(state, 'BUS FULL!', 'Riders alight soon — keep driving', 1.2);
          stop.served = true;
        }
      } else {
        stop.boardTimer -= dt;
        if (stop.boardTimer <= 0) {
          boardOne(state, stop);
          stop.boardTimer = 0.45; // one rider every half second
        }
      }
    }
  }
  state.stops = state.stops.filter((s) => s.y < 860);

  for (const station of state.stations) {
    station.y += scrollSpeed * dt;
    if (atStation(state, station) && state.bus.fuel < 100) {
      state.bus.fuel = Math.min(100, state.bus.fuel + DAMAGE.refuelRate * dt);
      if (Math.random() < dt * 2) {
        addPopup(state, state.bus.x - 40, state.bus.y - 60, 'FUEL +', '#7ad9ff');
      }
    }
  }
  state.stations = state.stations.filter((s) => s.y < 860);

  // Riders alight on their own after their ride, freeing seats.
  const bus = state.bus;
  for (const p of bus.passengers) p.rideLeft -= dt;
  const before = bus.passengers.length;
  bus.passengers = bus.passengers.filter((p) => p.rideLeft > 0);
  if (bus.passengers.length < before) playAlight();

  // The combo decays when no pickup comes in the window.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 1;
  }
}
