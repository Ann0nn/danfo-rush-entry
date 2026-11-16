// DANFO RUSH — a small seeded random generator (mulberry32). The game uses
// it for traffic, fares and scenery; the screenshot mode seeds it with a
// fixed value so every staged shot renders the same frame every time.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A pick helper: one of `items`, by the given random function.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A number in [min, max) from the given random function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A whole number in [min, max] from the given random function.
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
