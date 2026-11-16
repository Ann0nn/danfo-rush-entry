// DANFO RUSH — the whole game state in one object, and the functions that
// build it fresh: a new run, and the next day after a win. The screens are
// 'title' | 'playing' | 'paused' | 'daycomplete' | 'gameover'.

import { BUS, DAY, ROAD } from './config.js';
import { mulberry32 } from './rng.js';

export function targetForDay(day) {
  return Math.round(DAY.firstTarget * Math.pow(DAY.targetGrowth, day - 1) / 100) * 100;
}

export function densityForDay(day) {
  return Math.pow(DAY.trafficGrowth, day - 1);
}

export function bestScore() {
  try {
    return Number(window.localStorage.getItem('danfo-rush-best') || 0);
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem('danfo-rush-best', String(score));
  } catch {
    // Storage unavailable (private mode, file://): the game plays on.
  }
}

function freshBus() {
  return {
    x: ROAD.laneCenter(1),
    y: BUS.cruiseY,
    lane: 1,
    speed: BUS.startSpeed,
    condition: DAY.startCondition,
    fuel: DAY.startFuel,
    passengers: [], // each: { fare, rideLeft }
    hornCooldown: 0,
    hornFlash: 0,
    crashFlash: 0,
  };
}

export function createState() {
  return {
    screen: 'title',
    day: 1,
    score: 0,
    fare: 0, // naira earned today
    target: targetForDay(1),
    timeLeft: DAY.lengthSeconds,
    combo: 1,
    comboTimer: 0,
    pickupsToday: 0,
    crashesToday: 0,
    distanceKm: 0,
    rng: mulberry32((Math.random() * 0xffffffff) >>> 0),
    seed: 0,
    bus: freshBus(),
    traffic: [], // cars, okadas, trucks
    potholes: [],
    stops: [], // bus stops on the right shoulder
    stations: [], // fuel stations on the left shoulder
    scenery: [], // roadside stalls, palms, billboards
    popups: [], // floating "+₦500" labels
    spawnTimers: { car: 0.5, okada: 2.0, truck: 5.0, pothole: 2.0, stop: 3.0, station: 14.0 },
    scroll: 0, // total px scrolled, drives the road markings
    shake: 0,
    time: 0, // total seconds since the run started
    message: null, // a big centre-screen note, { text, sub, until }
    endReason: null, // 'target' | 'wrecked' | 'dry' | 'sunset'
    buttons: [], // canvas buttons of the current screen, { x, y, w, h, id }
    muted: false,
    shotMode: null,
  };
}

// Start (or restart) a day, keeping the run's day and score.
export function startDay(state) {
  state.screen = 'playing';
  state.fare = 0;
  state.target = targetForDay(state.day);
  state.timeLeft = DAY.lengthSeconds;
  state.combo = 1;
  state.comboTimer = 0;
  state.pickupsToday = 0;
  state.crashesToday = 0;
  state.bus = freshBus();
  state.traffic = [];
  state.potholes = [];
  state.stops = [];
  state.stations = [];
  state.popups = [];
  state.spawnTimers = { car: 0.5, okada: 2.0, truck: 5.0, pothole: 2.0, stop: 3.0, station: 14.0 };
  state.shake = 0;
  state.message = { text: `DAY ${state.day}`, sub: `Earn ₦${state.target.toLocaleString()} before sunset`, until: state.time + 2.2 };
  state.endReason = null;
}

// A fresh run from the title screen.
export function newRun(state) {
  state.day = 1;
  state.score = 0;
  state.distanceKm = 0;
  startDay(state);
}

// After a day-complete win: the next day, target and traffic up.
export function nextDay(state) {
  state.day += 1;
  startDay(state);
}

export function addPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color: color || '#ffe45e', life: 1.4 });
}

export function showMessage(state, text, sub, seconds) {
  state.message = { text, sub: sub || '', until: state.time + (seconds || 1.8) };
}
