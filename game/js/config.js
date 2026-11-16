// DANFO RUSH — tuning constants. One place for every number that shapes
// how the game feels: the road, the bus, the fares, the hazards, the day.

export const VIEW = { width: 1280, height: 720 };

// The road: four lanes of Lagos tarmac, roadside strips on both sides.
export const ROAD = {
  left: 300, // x of the road's left edge
  right: 980, // x of the road's right edge
  lanes: 4,
  shoulderLeft: 232, // fuel stations live on this shoulder
  shoulderRight: 1048, // bus stops live on this shoulder
};
ROAD.laneWidth = (ROAD.right - ROAD.left) / ROAD.lanes;
ROAD.laneCenter = (lane) => ROAD.left + ROAD.laneWidth * (lane + 0.5);

// The bus: a yellow danfo, 14 seats, driven with arrow keys / WASD.
export const BUS = {
  width: 62,
  height: 108,
  seats: 14,
  cruiseY: 560, // the bus sits near the bottom and the world scrolls past
  minY: 300,
  maxY: 620,
  steerSpeed: 420, // px/s sideways
  accel: 90, // km/h per second
  brake: 160,
  minSpeed: 0,
  maxSpeed: 110,
  startSpeed: 45,
};

// A day of driving: earn the fare target before the sun sets.
export const DAY = {
  lengthSeconds: 150,
  firstTarget: 7500, // Day 1 target, in naira
  targetGrowth: 1.5, // each next day's target multiplies by this
  trafficGrowth: 1.18, // each next day's traffic density multiplies by this
  startFuel: 100,
  startCondition: 100,
};

// Fares: what a passenger pays, and the combo for quick pickups.
export const FARE = {
  min: 300,
  max: 800,
  comboWindowSeconds: 8, // pickups inside this window raise the multiplier
  comboMax: 3,
  rideSeconds: 22, // a passenger alights on their own after this long
};

// Damage, fuel and repairs.
export const DAMAGE = {
  carHit: 14,
  okadaHit: 8,
  truckHit: 24,
  pothole: 6,
  fuelPerSecond: 0.55, // at full speed; scaled by speed
  fuelIdle: 0.08,
  refuelRate: 45, // fuel per second while stopped at a station
};

// The horn: SPACE scatters nearby traffic for a moment.
export const HORN = {
  cooldownSeconds: 4,
  radius: 220,
  scatterSeconds: 1.6,
};

// Traffic spawn pacing (seconds between spawns, scaled by day density).
export const TRAFFIC = {
  carGap: 1.15,
  okadaGap: 2.6,
  truckGap: 6.5,
  potholeGap: 3.4,
  stopGap: 9.0, // seconds between bus stops appearing
  stationGap: 26.0, // seconds between fuel stations appearing
  carSpeedMin: 22, // km/h, slower than the bus so the player overtakes
  carSpeedMax: 48,
  okadaSpeedMin: 30,
  okadaSpeedMax: 62,
  truckSpeedMin: 18,
  truckSpeedMax: 30,
};

// Floating "+₦500" popups and screen shake.
export const FEEL = {
  popupRise: 46, // px/s upward
  popupLife: 1.4, // seconds
  shakeOnCrash: 14,
  shakeDecay: 30,
};
